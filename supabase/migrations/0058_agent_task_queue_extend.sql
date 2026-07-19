-- =============================================================================
-- Matadora — Phase 58: extend the dormant Phase-52 agent task queue
-- (public.agents / public.agent_tasks / public.agent_messages) so it can
-- back Matadora Agent Studio's Phase 2 control-tower dashboard
-- (/dashboard/agent-studio) and the desktop harness in agent-studio/sidecar/.
--
-- IMPORTANT — enum-value transaction rule:
-- `ALTER TYPE ... ADD VALUE` cannot be used in the same transaction that
-- also *reads/writes a row using* the newly-added value (Postgres error:
-- "unsafe use of new value of enum type" / "ALTER TYPE ... ADD VALUE cannot
-- run inside a transaction block" on older versions). scripts/apply-migration.mjs
-- sends each migration file as one `pg` `query()` call, and node-postgres's
-- simple-query protocol executes a multi-statement string as a single
-- implicit transaction — so the ADD VALUE statements below must not be
-- followed, in this same file, by anything that inserts/updates a row with
-- status = 'awaiting_review' or 'blocked'. This file only adds the enum
-- values and columns, and seeds `agents` (a different table, no status
-- column) — it never uses the new values itself, so it is safe as a single
-- file/transaction. Any code that sets a task to 'awaiting_review'/'blocked'
-- must run in a later, separate transaction (true for both the sidecar's
-- REST calls and any Next.js server action — neither runs inside this
-- migration's transaction).
-- =============================================================================

alter type public.agent_task_status add value if not exists 'awaiting_review';
alter type public.agent_task_status add value if not exists 'blocked';

-- ─── Harness report-back columns ─────────────────────────────────────────────
-- Nullable/additive only — existing rows are unaffected. Populated by the
-- Tauri sidecar (agent-studio/sidecar/feature-dev-agent.mjs) as a run
-- progresses: worktree_path as soon as the isolated worktree is created,
-- branch once it exists, compare_url once the branch is pushed.
alter table public.agent_tasks add column if not exists branch         text;
alter table public.agent_tasks add column if not exists compare_url    text;
alter table public.agent_tasks add column if not exists worktree_path  text;

-- ─── Seed the agent registry (3 roles) ───────────────────────────────────────
-- Matches the existing public.agents column set exactly (see
-- 0052_agent_persistence.sql: id, name, description, category, capabilities
-- text[], dependencies text[], priority int). Idempotent — safe to re-run.
insert into public.agents (id, name, description, category, capabilities, dependencies, priority)
values
  (
    'feature-dev',
    'Feature Dev',
    'Picks up a prioritized backlog task, works in an isolated git worktree on a fresh branch, drafts code (and migrations when needed, never applying them), runs typecheck/lint/build, pushes the branch, and marks the task awaiting_review.',
    'development',
    array['code', 'git', 'typecheck', 'lint', 'build'],
    array[]::text[],
    10
  ),
  (
    'qa-test',
    'QA / Test',
    'Runs after feature-dev, before awaiting_review: re-runs typecheck/lint/build plus any relevant scripts/smoke-*.mjs, and reports pass/fail into agent_tasks.result.',
    'quality',
    array['typecheck', 'lint', 'build', 'smoke-test'],
    array['feature-dev'],
    20
  ),
  (
    'research-analytics',
    'Research / Analytics',
    'Read-only reporting agent. Never touches Bash or a service-role client directly — calls a fixed set of parameterized read-only server actions (src/lib/actions/agent-reports.ts) and writes findings into agent_tasks.result.',
    'research',
    array['read-only-reports'],
    array[]::text[],
    30
  )
on conflict (id) do nothing;
