-- =============================================================================
-- BuildMate — Phase 5: Workforce (workers, crews, crew assignments)
-- All scoped to an organization. A worker may optionally be linked to a login
-- (profiles.id). Crews group workers; crews are assigned to projects.
-- =============================================================================

create table if not exists public.workers (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete set null,
  full_name   text not null,
  specialty   text,
  hourly_rate numeric(10,2),
  phone       text,
  email       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists workers_org_id_idx on public.workers (org_id);

create table if not exists public.crews (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations (id) on delete cascade,
  name             text not null,
  foreman_worker_id uuid references public.workers (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists crews_org_id_idx on public.crews (org_id);

create table if not exists public.crew_members (
  id        uuid primary key default gen_random_uuid(),
  crew_id   uuid not null references public.crews (id) on delete cascade,
  worker_id uuid not null references public.workers (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (crew_id, worker_id)
);

create index if not exists crew_members_crew_id_idx on public.crew_members (crew_id);

create table if not exists public.crew_assignments (
  id         uuid primary key default gen_random_uuid(),
  crew_id    uuid not null references public.crews (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  start_date date,
  end_date   date,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists crew_assignments_crew_id_idx on public.crew_assignments (crew_id);
create index if not exists crew_assignments_project_id_idx on public.crew_assignments (project_id);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['workers','crews']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- =============================================================================
-- RLS — everything is gated by organization membership
-- =============================================================================
alter table public.workers enable row level security;
alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.crew_assignments enable row level security;

-- workers
drop policy if exists "workers_rw" on public.workers;
create policy "workers_rw" on public.workers for all
  to authenticated
  using (is_org_member(org_id))
  with check (is_org_member(org_id));

-- crews
drop policy if exists "crews_rw" on public.crews;
create policy "crews_rw" on public.crews for all
  to authenticated
  using (is_org_member(org_id))
  with check (is_org_member(org_id));

-- crew_members (org resolved through the parent crew)
drop policy if exists "crew_members_rw" on public.crew_members;
create policy "crew_members_rw" on public.crew_members for all
  to authenticated
  using (
    exists (select 1 from public.crews c
            where c.id = crew_id and is_org_member(c.org_id))
  )
  with check (
    exists (select 1 from public.crews c
            where c.id = crew_id and is_org_member(c.org_id))
  );

-- crew_assignments (org resolved through the parent crew)
drop policy if exists "crew_assignments_rw" on public.crew_assignments;
create policy "crew_assignments_rw" on public.crew_assignments for all
  to authenticated
  using (
    exists (select 1 from public.crews c
            where c.id = crew_id and is_org_member(c.org_id))
  )
  with check (
    exists (select 1 from public.crews c
            where c.id = crew_id and is_org_member(c.org_id))
  );
