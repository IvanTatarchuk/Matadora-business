-- =============================================================================
-- BuildMate — Phase 7: Finance
-- Time entries per worker per project (labor cost), project expenses (other
-- costs), and helpers for P&L computation.
-- =============================================================================

create table if not exists public.time_entries (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  worker_id   uuid not null references public.workers (id) on delete restrict,
  crew_id     uuid references public.crews (id) on delete set null,
  entry_date  date not null default current_date,
  hours       numeric(6,2) not null check (hours > 0),
  note        text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists time_entries_project_id_idx on public.time_entries (project_id);
create index if not exists time_entries_worker_id_idx  on public.time_entries (worker_id);

create table if not exists public.project_expenses (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  category    text not null default 'other',   -- labor | material | equipment | other
  amount      numeric(12,2) not null check (amount >= 0),
  note        text,
  expense_date date not null default current_date,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists project_expenses_project_id_idx on public.project_expenses (project_id);

-- =============================================================================
-- RLS — scoped to project participants
-- =============================================================================
alter table public.time_entries     enable row level security;
alter table public.project_expenses enable row level security;

drop policy if exists "time_entries_rw" on public.time_entries;
create policy "time_entries_rw" on public.time_entries for all
  to authenticated
  using  (is_project_participant(project_id))
  with check (is_project_participant(project_id));

drop policy if exists "project_expenses_rw" on public.project_expenses;
create policy "project_expenses_rw" on public.project_expenses for all
  to authenticated
  using  (is_project_participant(project_id))
  with check (is_project_participant(project_id));
