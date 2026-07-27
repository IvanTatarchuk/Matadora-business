-- History of the autonomous builder agent's runs (distinct from
-- agent_insight_reports, which is contractor-facing analysis). This is
-- internal/ops visibility, not shown to contractors.
create table if not exists public.agent_builder_runs (
  id           uuid primary key default gen_random_uuid(),
  backlog_item text not null,
  file_path    text,
  pr_number    integer,
  pr_url       text,
  status       text not null default 'ok' check (status in ('ok', 'skipped', 'error')),
  detail       text,
  created_at   timestamptz not null default now()
);

alter table public.agent_builder_runs enable row level security;

-- Ops-only table: no policies for anon/authenticated, service role only
-- (matches the "Service full access" pattern used elsewhere for internal
-- operational tables).
