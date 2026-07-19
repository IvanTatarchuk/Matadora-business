#!/usr/bin/env node
// agent-studio/sidecar/feature-dev-agent.mjs
//
// Phase 1 harness: runs a single "feature-dev" Claude Agent SDK agent
// against an ISOLATED git worktree of a target repo, on a fresh branch.
// Never touches the caller's working checkout, never merges, never
// pushes to a protected branch.
//
// Usage:
//   node feature-dev-agent.mjs <targetRepoPath> <task description...>
//
// Emits newline-delimited JSON on stdout, one of:
//   {"type":"log","line":"..."}
//   {"type":"status","status":"...", ...extra fields}
// matching the event shape Phase 0's Rust side already forwards as
// `sidecar-log` / `sidecar-status` Tauri events.
//
// Lifecycle statuses emitted (in order, on the happy path):
//   running -> worktree_created -> agent_working -> checks_passed
//   -> pushed -> awaiting_review
// (or: worktree_created -> agent_working -> no_changes; or ... ->
//  checks_failed; or "error" at any point.)

import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import readline from "node:readline";
import crypto from "node:crypto";

import { emitLog, emitStatus } from "./lib/events.mjs";
import { evaluateBashCommand } from "./lib/bash-guard.mjs";

const COMPARE_URL_REPO = "IvanTatarchuk/Matadora-business";

// Tools this agent is never allowed to reach for, on top of the
// PreToolUse Bash guard below. Per the approved plan, `disallowedTools`
// is configured explicitly rather than relying only on an allow-list,
// since an allow-list alone doesn't reliably block built-in tools.
const DISALLOWED_TOOLS = ["WebSearch", "WebFetch", "Task", "NotebookEdit", "SlashCommand"];

async function main() {
  const [, , repoPathArg, ...taskParts] = process.argv;
  const taskDescription = taskParts.join(" ").trim();

  if (!repoPathArg || !taskDescription) {
    emitStatus("error", {
      message:
        "Usage: node feature-dev-agent.mjs <targetRepoPath> <task description...>",
    });
    process.exitCode = 1;
    return;
  }

  // The sidecar is a separate Node process — it does NOT inherit Claude
  // Code / CLI credentials. Fail loudly and clearly rather than letting
  // the SDK throw an opaque auth error deep in the run.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    emitStatus("error", {
      message:
        "ANTHROPIC_API_KEY is not set in this process's environment. " +
        "This sidecar runs as a separate Node process and does not inherit " +
        "any Claude Code CLI login — set ANTHROPIC_API_KEY (e.g. in the OS " +
        "environment before launching Matadora Agent Studio) and try again.",
    });
    process.exitCode = 1;
    return;
  }

  const repoPath = path.resolve(repoPathArg);
  if (!fs.existsSync(repoPath)) {
    emitStatus("error", { message: `Target repo path does not exist: ${repoPath}` });
    process.exitCode = 1;
    return;
  }

  const taskId = makeTaskId(taskDescription);
  const branch = `agent/${taskId}`;
  const worktreeRoot = path.resolve(repoPath, "..", "matadora-agent-runs");
  const worktreePath = path.join(worktreeRoot, taskId);

  emitStatus("running", { taskId, branch });
  emitLog(`Task: ${taskDescription}`);
  emitLog(`Target repo: ${repoPath}`);

  try {
    fs.mkdirSync(worktreeRoot, { recursive: true });

    emitLog(`Creating isolated worktree at ${worktreePath} on branch ${branch} ...`);
    const worktreeResult = await runGit(repoPath, [
      "worktree",
      "add",
      worktreePath,
      "-b",
      branch,
    ]);
    if (worktreeResult.code !== 0) {
      emitStatus("error", {
        message: `git worktree add failed with exit code ${worktreeResult.code}`,
      });
      process.exitCode = 1;
      return;
    }
    emitStatus("worktree_created", { worktreePath, branch, taskId });

    emitStatus("agent_working", { taskId });
    const agentOutcome = await runFeatureDevAgent({ worktreePath, taskDescription });
    if (agentOutcome.error) {
      emitStatus("error", { message: agentOutcome.error });
      process.exitCode = 1;
      return;
    }

    const statusResult = await run("git", ["status", "--porcelain"], {
      cwd: worktreePath,
      label: "git status",
      quiet: true,
    });
    const hasChanges = statusResult.stdout.trim().length > 0;
    if (!hasChanges) {
      emitLog("Agent run finished but produced no file changes in the worktree.");
      emitStatus("no_changes", { worktreePath, branch, taskId });
      return;
    }

    emitLog("Committing agent changes ...");
    await runGit(worktreePath, ["add", "-A"]);
    const commitMessage = `agent(feature-dev): ${taskDescription}`.slice(0, 200);
    const commitResult = await runGit(worktreePath, ["commit", "-m", commitMessage]);
    if (commitResult.code !== 0) {
      emitStatus("error", {
        message: `git commit failed after agent run (exit ${commitResult.code})`,
      });
      process.exitCode = 1;
      return;
    }

    emitLog("Running verification: npm run typecheck && npm run lint && npm run build ...");
    const checksOk = await runChecks(worktreePath);
    if (!checksOk) {
      emitStatus("checks_failed", { worktreePath, branch, taskId });
      return;
    }
    emitStatus("checks_passed", { worktreePath, branch, taskId });

    const compareUrl = `https://github.com/${COMPARE_URL_REPO}/compare/main...${branch}?expand=1`;

    const hasRemote = await hasOriginRemote(worktreePath);
    let pushed = false;
    if (hasRemote) {
      emitLog(`Pushing ${branch} to origin ...`);
      const pushResult = await runGit(worktreePath, ["push", "origin", branch]);
      pushed = pushResult.code === 0;
      if (!pushed) {
        emitLog(
          `git push failed (exit ${pushResult.code}) — branch and commit remain local for manual push.`
        );
      }
    } else {
      emitLog(
        "No 'origin' remote configured on this repo — skipping push (expected for " +
          "scratch/local test repos with no real remote). Branch and commit exist locally."
      );
    }

    emitStatus("pushed", { pushed, branch, worktreePath, taskId });
    emitStatus("awaiting_review", { compareUrl, branch, worktreePath, pushed, taskId });
  } catch (err) {
    emitStatus("error", { message: err?.stack || String(err) });
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// Claude Agent SDK invocation
// ---------------------------------------------------------------------------

async function runFeatureDevAgent({ worktreePath, taskDescription }) {
  const { query } = await import("@anthropic-ai/claude-agent-sdk");

  const prompt = [
    "You are the feature-dev agent for Matadora Agent Studio, working ONLY inside " +
      "an isolated git worktree that is already checked out on its own fresh branch.",
    `Worktree (your entire world for this task): ${worktreePath}`,
    `Task: ${taskDescription}`,
    "",
    "Rules:",
    "- Make the smallest correct change that accomplishes the task.",
    '- Never run "git push", "git merge", "vercel", "gh pr merge", "gh release", or any ' +
      "database migration/apply command (db:apply / db:migrate) — these are structurally " +
      "blocked and reserved for the human owner.",
    "- Do not touch files outside this worktree.",
    "- Do not read or reference any real secret keys (Stripe, Supabase service-role, etc).",
    "- Leave your change in the working tree (staged or not) — the harness commits it, " +
      "runs typecheck/lint/build, and pushes the branch for human review.",
  ].join("\n");

  // PreToolUse hook on Bash-like tool calls — the actual structural
  // backstop. disallowedTools above removes whole tool categories; this
  // hook inspects every proposed Bash command string and can deny
  // execution outright, regardless of permissionMode.
  const hooks = {
    PreToolUse: [
      {
        matcher: "Bash",
        hooks: [
          async (input) => {
            const command =
              input && typeof input === "object" && input.tool_input
                ? input.tool_input.command
                : undefined;
            const verdict = evaluateBashCommand(typeof command === "string" ? command : "");
            if (verdict.blocked) {
              emitLog(`[guard] BLOCKED Bash command (${verdict.category}): ${command}`);
              emitLog(`[guard] reason: ${verdict.reason}`);
              return {
                continue: true,
                decision: "block",
                hookSpecificOutput: {
                  hookEventName: "PreToolUse",
                  permissionDecision: "deny",
                  permissionDecisionReason: verdict.reason,
                },
              };
            }
            return {
              continue: true,
              hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "allow",
              },
            };
          },
        ],
      },
    ],
  };

  let finalResult = null;
  try {
    for await (const message of query({
      prompt,
      options: {
        cwd: worktreePath,
        // Headless sidecar: nothing can answer an interactive permission
        // prompt, so we bypass the interactive permission system and rely
        // on disallowedTools + the PreToolUse hook above as the real gate.
        permissionMode: "bypassPermissions",
        disallowedTools: DISALLOWED_TOOLS,
        hooks,
      },
    })) {
      logSdkMessage(message);
      if (message.type === "result") {
        finalResult = message;
      }
    }
  } catch (err) {
    return { error: `Claude Agent SDK run threw: ${err?.stack || err}` };
  }

  if (!finalResult) {
    return { error: "Agent SDK run ended without a result message." };
  }
  if (finalResult.is_error) {
    return {
      error: `Agent run reported an error: ${finalResult.result ?? finalResult.stop_reason ?? "unknown"}`,
    };
  }
  emitLog(`Agent finished: ${finalResult.result ?? "(no summary text)"}`);
  return { error: null };
}

function logSdkMessage(message) {
  switch (message.type) {
    case "system":
      if (message.subtype === "init") {
        emitLog(`[agent] session started (model: ${message.model ?? "unknown"})`);
      }
      break;
    case "assistant": {
      const content = message.message?.content ?? [];
      for (const block of content) {
        if (block.type === "text" && block.text?.trim()) {
          emitLog(`[agent] ${block.text.trim()}`);
        } else if (block.type === "tool_use") {
          const preview =
            block.name === "Bash"
              ? block.input?.command
              : JSON.stringify(block.input ?? {}).slice(0, 160);
          emitLog(`[agent] tool_use ${block.name}: ${preview}`);
        }
      }
      break;
    }
    case "result":
      emitLog(
        `[agent] result subtype=${message.subtype} turns=${message.num_turns} ` +
          `cost=$${typeof message.total_cost_usd === "number" ? message.total_cost_usd.toFixed(4) : "?"}`
      );
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Process helpers
// ---------------------------------------------------------------------------

function run(command, args, { cwd, label, quiet = false } = {}) {
  return new Promise((resolve) => {
    const tag = label ?? command;
    let stdout = "";
    let stderr = "";

    let child;
    try {
      child = spawn(command, args, { cwd, shell: false });
    } catch (err) {
      emitLog(`[${tag}] failed to spawn: ${err.message}`);
      resolve({ code: -1, stdout, stderr });
      return;
    }

    const rlOut = readline.createInterface({ input: child.stdout });
    rlOut.on("line", (line) => {
      stdout += line + "\n";
      if (!quiet) emitLog(`[${tag}] ${line}`);
    });
    const rlErr = readline.createInterface({ input: child.stderr });
    rlErr.on("line", (line) => {
      stderr += line + "\n";
      if (!quiet) emitLog(`[${tag}] ${line}`);
    });

    child.on("error", (err) => {
      emitLog(`[${tag}] failed to spawn: ${err.message}`);
      resolve({ code: -1, stdout, stderr });
    });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function runGit(cwd, args) {
  return run("git", args, { cwd, label: `git ${args[0]}` });
}

/**
 * `npm` on Windows is `npm.cmd`, a batch file — `CreateProcess` (what
 * Node's `spawn` uses without `shell: true`) cannot execute batch files
 * directly and fails with `EINVAL`. Route through `cmd.exe /c` explicitly
 * on Windows (rather than `shell: true`, which triggers Node's arg-escaping
 * deprecation warning) since the script names we pass are fixed literals
 * from `runChecks` below, never external/user input.
 */
function runNpm(cwd, npmArgs, label) {
  if (process.platform === "win32") {
    return run("cmd.exe", ["/d", "/s", "/c", "npm", ...npmArgs], { cwd, label });
  }
  return run("npm", npmArgs, { cwd, label });
}

async function runChecks(cwd) {
  const scripts = ["typecheck", "lint", "build"];
  for (const scriptName of scripts) {
    emitLog(`Running: npm run ${scriptName}`);
    const result = await runNpm(cwd, ["run", scriptName], `npm run ${scriptName}`);
    if (result.code !== 0) {
      emitLog(`npm run ${scriptName} FAILED with exit code ${result.code}`);
      return false;
    }
  }
  return true;
}

async function hasOriginRemote(cwd) {
  const result = await run("git", ["remote", "get-url", "origin"], {
    cwd,
    label: "git remote",
    quiet: true,
  });
  return result.code === 0 && result.stdout.trim().length > 0;
}

function makeTaskId(taskDescription) {
  const slug =
    taskDescription
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "task";
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${slug}-${suffix}`;
}

main();
