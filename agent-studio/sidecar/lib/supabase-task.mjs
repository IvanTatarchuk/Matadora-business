// agent-studio/sidecar/lib/supabase-task.mjs
//
// Optional Phase 2 wiring: when the sidecar is given a `--task-id <uuid>`
// (see feature-dev-agent.mjs), it reports lifecycle status back into the
// main Matadora-business repo's `public.agent_tasks` row for that id, so
// the web control-tower dashboard (/dashboard/agent-studio) and the
// desktop app both reflect the same state.
//
// This process is a bare Node child spawned by Rust — it has no logged-in
// Supabase Auth session and can't call a Next.js Server Action (those
// require the caller's session cookies). So it talks straight to
// Supabase's REST API (PostgREST, auto-exposed by every Supabase project)
// using the service-role key, via a plain `fetch` PATCH. No supabase-js
// dependency needed for a single PATCH-by-id — same "service-role,
// RLS-bypassing, narrowly scoped" precedent already used by
// src/lib/supabase/admin.ts in the main app and by the
// service-role-only RLS on `agent_messages` (0052_agent_persistence.sql).
//
// Kept dependency-free and side-effect-free at import time (reads env lazily
// inside the function, not at module load) so this file is safe to import
// even when Supabase env vars aren't set — e.g. when the sidecar is run
// standalone with no --task-id, this module is simply never called.

function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

function serviceRoleKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function supabaseTaskReportingConfigured() {
  return Boolean(supabaseUrl().trim() && serviceRoleKey().trim());
}

/**
 * PATCH the `public.agent_tasks` row identified by `taskId` with `patch`
 * (already in DB column names, e.g. `{ status, branch, compare_url,
 * worktree_path, error, completed_at }`). Never throws — returns
 * `{ ok: false, error }` on any failure so callers can log-and-continue
 * rather than let a Supabase hiccup abort a real agent run.
 *
 * @param {string} taskId
 * @param {Record<string, unknown>} patch
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function updateAgentTask(taskId, patch) {
  if (!taskId) return { ok: false, error: "no taskId given" };

  const url = supabaseUrl();
  const key = serviceRoleKey();
  if (!url.trim() || !key.trim()) {
    return {
      ok: false,
      error:
        "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) " +
        "not set in this process's environment — skipping Supabase status update.",
    };
  }

  const endpoint = `${url.replace(/\/+$/, "")}/rest/v1/agent_tasks?id=eq.${encodeURIComponent(taskId)}`;

  try {
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
        // No representation needed back — we already know what we sent.
        Prefer: "return=minimal",
      },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Supabase PATCH ${res.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Supabase PATCH threw: ${err?.message || String(err)}` };
  }
}
