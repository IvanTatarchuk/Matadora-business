import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

import { createAdminClient } from "@/lib/supabase/admin";
import { touchesProtectedPath } from "@/lib/agent-builder/protected-paths";
import { getFile, getMainSha, createBranch, putFile, openPullRequest } from "@/lib/agent-builder/github";

/**
 * Runs 4x/day (see vercel.json). Picks one unstarted (⬜) item from todo.md,
 * asks Claude to draft a single, small, self-contained file for it, and
 * opens a PR. Deliberately scoped to one file per run rather than whole
 * features in one shot:
 *  - a single-file diff is realistically reviewable by CI (typecheck/lint/
 *    build) and by the protected-paths gate
 *  - large multi-file features naturally decompose into several runs, each
 *    producing a real, working, individually-mergeable increment instead of
 *    one big unreviewable blob
 *  - if Claude's suggestion is bad, the blast radius is one file, not a
 *    half-finished multi-file feature
 *
 * Every run is logged to agent_builder_runs regardless of outcome, so a
 * silent-failure pattern (like the KOLOS-1/Ollama incident) can't recur here
 * unnoticed.
 */

const BACKLOG_FILE = "todo.md";
const MAX_ITEMS_TO_SCAN = 40;

function pickNextBacklogItem(todoContent: string): string | null {
  const lines = todoContent.split("\n");
  for (const line of lines.slice(0, MAX_ITEMS_TO_SCAN * 4)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("⬜")) {
      return trimmed.replace(/^⬜\s*/, "");
    }
  }
  return null;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    await db.from("agent_builder_runs").insert({
      backlog_item: "(none — blocked)",
      status: "error",
      detail: "ANTHROPIC_API_KEY not configured",
    });
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  let todo: { content: string; sha: string } | null;
  try {
    todo = await getFile(BACKLOG_FILE);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.from("agent_builder_runs").insert({ backlog_item: "(none)", status: "error", detail: message });
    return NextResponse.json({ error: "failed to read todo.md", detail: message }, { status: 500 });
  }

  if (!todo) {
    return NextResponse.json({ ok: false, reason: "todo.md not found" });
  }

  const item = pickNextBacklogItem(todo.content);
  if (!item) {
    await db.from("agent_builder_runs").insert({ backlog_item: "(none pending)", status: "skipped" });
    return NextResponse.json({ ok: true, reason: "no pending backlog items" });
  }

  const anthropic = new Anthropic({ apiKey });

  const planningMessage = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: `You are working on Matadora (matadora.business), a Next.js 14 App Router construction SaaS. Stack: Supabase (RLS), TypeScript, Tailwind, shadcn/ui-style components.

Backlog item to implement (from todo.md): "${item}"

This is one autonomous run out of four per day -- scope your response to ONE small, self-contained new file that makes real, working progress on this item. Do not propose changes to existing files, migrations, or anything auth/finance-related.

Respond in exactly this format, nothing else:
FILE_PATH: <path relative to repo root, e.g. src/components/SomeThing.tsx>
---
<full file content>`,
      },
    ],
  });

  const text = planningMessage.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const match = text.match(/FILE_PATH:\s*(\S+)\s*\n---\n([\s\S]*)/);
  if (!match) {
    await db.from("agent_builder_runs").insert({
      backlog_item: item,
      status: "error",
      detail: "model response did not match expected FILE_PATH/--- format",
    });
    return NextResponse.json({ ok: false, reason: "unparseable model response" }, { status: 500 });
  }

  const [, filePath, fileContent] = match;

  if (touchesProtectedPath(filePath)) {
    await db.from("agent_builder_runs").insert({
      backlog_item: item,
      file_path: filePath,
      status: "skipped",
      detail: "model proposed a protected path; refused",
    });
    return NextResponse.json({ ok: false, reason: "proposed protected path", filePath });
  }

  const branchName = `agent/${Date.now()}-${filePath.split("/").pop()?.replace(/\.\w+$/, "")}`;

  try {
    const mainSha = await getMainSha();
    await createBranch(branchName, mainSha);
    await putFile(branchName, filePath, fileContent.trim() + "\n", `agent: add ${filePath} (${item})`);

    const pr = await openPullRequest({
      branch: branchName,
      title: `[agent] ${item}`.slice(0, 100),
      body: `Autonomous builder run.\n\n**Backlog item:** ${item}\n**File:** \`${filePath}\`\n\nThis PR auto-merges if CI (typecheck/lint/build) passes and no protected paths are touched. Otherwise it's labeled \`needs-human-review\`.`,
    });

    await db.from("agent_builder_runs").insert({
      backlog_item: item,
      file_path: filePath,
      pr_number: pr.number,
      pr_url: pr.html_url,
      status: "ok",
    });

    return NextResponse.json({ ok: true, item, filePath, pr: pr.html_url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.from("agent_builder_runs").insert({
      backlog_item: item,
      file_path: filePath,
      status: "error",
      detail: message.slice(0, 1000),
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
