-- =============================================================================
-- Matadora — Phase 52: Persistent task queue and message bus for the
-- multi-agent system (src/agents/). Replaces in-memory Map/array state in
-- OrchestratorAgent, which does not survive across serverless invocations
-- on Vercel — each request may hit a cold instance with empty state.
-- =============================================================================

do $$ begin
  create type public.agent_task_status as enum ('idle', 'processing', 'completed', 'error');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.agent_message_type as enum ('request', 'response', 'notification');
exception when duplicate_object then null; end $$;

-- ─── Agent registry ──────────────────────────────────────────────────────────
-- Mirrors AgentConfig from src/lib/constants/subcontractors.ts so agent
-- metadata (capabilities, dependencies, priority) is queryable, not just
-- hardcoded in each class constructor.
create table if not exists public.agents (
  id            text primary key,
  name          text not null,
  description   text,
  category      text not null,
  capabilities  text[] not null default '{}',
  dependencies  text[] not null default '{}',
  priority      integer not null default 0,
  created_at    timestamptz not null default now()
);

-- ─── Task queue ──────────────────────────────────────────────────────────────
create table if not exists public.agent_tasks (
  id            uuid primary key default gen_random_uuid(),
  agent_id      text not null references public.agents (id) on delete cascade,
  org_id        uuid references public.organizations (id) on delete cascade,
  project_id    uuid references public.projects (id) on delete set null,
  type          text not null,
  payload       jsonb not null default '{}',
  status        public.agent_task_status not null default 'idle',
  result        jsonb,
  error         text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists agent_tasks_agent_idx  on public.agent_tasks (agent_id);
create index if not exists agent_tasks_status_idx on public.agent_tasks (status);
create index if not exists agent_tasks_org_idx    on public.agent_tasks (org_id);

-- ─── Message bus ─────────────────────────────────────────────────────────────
create table if not exists public.agent_messages (
  id          uuid primary key default gen_random_uuid(),
  from_agent  text not null references public.agents (id) on delete cascade,
  to_agent    text not null references public.agents (id) on delete cascade,
  type        public.agent_message_type not null default 'request',
  payload     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists agent_messages_to_idx on public.agent_messages (to_agent, created_at);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
-- Agent registry is shared reference data — readable by any authenticated
-- user, written only by service role (agent code runs server-side).
alter table public.agents enable row level security;

drop policy if exists "agents_read_all" on public.agents;
create policy "agents_read_all" on public.agents for select
  to authenticated using (true);

-- Tasks/messages carry org/project-scoped payloads — restrict to org members,
-- matching the pattern used by other org-scoped tables (see sub_bids policy
-- in 0026_investor_portal_milestones_subbids.sql).
alter table public.agent_tasks enable row level security;

drop policy if exists "agent_tasks_org" on public.agent_tasks;
create policy "agent_tasks_org" on public.agent_tasks for all
  to authenticated
  using (
    org_id is null or org_id in (
      select org_id from public.organization_members where user_id = auth.uid()
    )
  )
  with check (
    org_id is null or org_id in (
      select org_id from public.organization_members where user_id = auth.uid()
    )
  );

alter table public.agent_messages enable row level security;

drop policy if exists "agent_messages_service_only" on public.agent_messages;
create policy "agent_messages_service_only" on public.agent_messages for all
  to authenticated using (false) with check (false);
