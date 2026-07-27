-- Stores nightly autonomous agent runs (cash-flow, offer win-rate, etc.)
-- so contractors see a history instead of only the on-demand latest result.
create table if not exists public.agent_insight_reports (
  id             uuid primary key default gen_random_uuid(),
  agent_id       text not null,               -- e.g. 'cash-flow-analyzer', 'offer-win-rate-analyzer'
  contractor_id  uuid not null references public.profiles (id) on delete cascade,
  project_id     uuid references public.projects (id) on delete cascade,  -- null for account-wide agents
  summary        text not null default '',
  recommendations jsonb not null default '[]',
  raw_data       jsonb not null default '{}',
  status         text not null default 'ok' check (status in ('ok', 'error', 'skipped')),
  error_message  text,
  created_at     timestamptz not null default now()
);

create index if not exists agent_insight_reports_contractor_idx
  on public.agent_insight_reports (contractor_id, agent_id, created_at desc);

alter table public.agent_insight_reports enable row level security;

create policy "Contractors read own agent reports"
  on public.agent_insight_reports for select
  using (auth.uid() = contractor_id);

-- Only service role (cron) writes these; no insert/update policy for
-- authenticated users, matching the rest of the schema's admin-write pattern.
