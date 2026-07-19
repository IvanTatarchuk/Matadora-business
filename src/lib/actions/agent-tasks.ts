"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupportAdmin } from "@/lib/admin";
import type { AgentTaskStatus } from "@/types/database";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export type { AgentTaskStatus };

export type AgentTask = {
  id: string;
  agent_id: string;
  org_id: string | null;
  project_id: string | null;
  type: string;
  payload: Record<string, unknown> | null;
  status: AgentTaskStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  branch: string | null;
  compare_url: string | null;
  worktree_path: string | null;
  created_at: string;
  completed_at: string | null;
  // Joined from public.agents — present on listAgentTasks() results.
  agents: { name: string; category: string } | null;
};

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isSupportAdmin(user.email)) return null;
  return user;
}

/**
 * Queue a new agent task (status starts at 'idle'). This is the web
 * dashboard's manual queueing form — it does NOT trigger a run. The actual
 * trigger-and-execute step still happens from the Matadora Agent Studio
 * desktop app (agent-studio/), which reads the queue and, on completion,
 * writes status/branch/compare_url back via its own service-role path (see
 * agent-studio/sidecar/lib/supabase-task.mjs) — not through this action.
 */
export async function createAgentTask(input: {
  agentId: string;
  type: string;
  payload?: Record<string, unknown>;
  orgId?: string;
  projectId?: string;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Brak uprawnień" };

  const agentId = input.agentId.trim();
  const type = input.type.trim();
  if (!agentId) return { ok: false, error: "Wybierz agenta." };
  if (!type) return { ok: false, error: "Opisz zadanie." };
  if (type.length > 2000) return { ok: false, error: "Opis jest za długi (max 2000 znaków)." };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const { data, error } = await db(supabase)
    .from("agent_tasks")
    .insert({
      agent_id: agentId,
      org_id: input.orgId ?? null,
      project_id: input.projectId ?? null,
      type,
      payload: input.payload ?? {},
      status: "idle",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/agent-studio");
  return { ok: true, id: data.id };
}

/**
 * List all agent tasks, newest first, joined with the owning agent's
 * name/category for display. Admin-only — this dashboard is a control
 * tower over agent activity, not something regular org users see.
 */
export async function listAgentTasks(): Promise<AgentTask[]> {
  const admin = await requireAdmin();
  if (!admin) return [];

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data } = await db(supabase)
    .from("agent_tasks")
    .select("*, agents(name, category)")
    .order("created_at", { ascending: false });

  return data ?? [];
}

/** Read-only helper for the "new task" form's agent picker. */
export async function listAgents(): Promise<
  { id: string; name: string; category: string }[]
> {
  const admin = await requireAdmin();
  if (!admin) return [];

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data } = await db(supabase)
    .from("agents")
    .select("id, name, category")
    .order("priority", { ascending: true });

  return data ?? [];
}

/**
 * Update a task's status (and optionally result/error/branch/compare_url/
 * worktree_path/completed_at) from the WEB dashboard — e.g. an admin
 * manually marking a completed run reviewed.
 *
 * This is deliberately NOT the path the desktop sidecar uses. The Tauri
 * app runs as a separate OS process with no logged-in browser session, so
 * it cannot call a Next.js Server Action (which requires the caller's
 * Supabase auth cookies to pass requireAdmin() here). Instead the sidecar
 * writes directly to Supabase's REST API using the service-role key (see
 * agent-studio/sidecar/lib/supabase-task.mjs) — the same "service-role,
 * RLS-bypassing, narrowly-scoped" precedent already used by
 * `agent_messages` (RLS `using(false)`, service-role only by design) and by
 * every `createAdminClient()` call in this file.
 */
export async function updateAgentTaskStatus(
  taskId: string,
  status: AgentTaskStatus,
  extra?: {
    result?: Record<string, unknown>;
    error?: string;
    branch?: string;
    compareUrl?: string;
    worktreePath?: string;
  }
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Brak uprawnień" };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const patch: Record<string, unknown> = { status };
  if (extra?.result !== undefined) patch.result = extra.result;
  if (extra?.error !== undefined) patch.error = extra.error;
  if (extra?.branch !== undefined) patch.branch = extra.branch;
  if (extra?.compareUrl !== undefined) patch.compare_url = extra.compareUrl;
  if (extra?.worktreePath !== undefined) patch.worktree_path = extra.worktreePath;
  if (status === "completed" || status === "error") {
    patch.completed_at = new Date().toISOString();
  }

  const { error } = await db(supabase).from("agent_tasks").update(patch).eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/agent-studio");
  return { ok: true };
}
