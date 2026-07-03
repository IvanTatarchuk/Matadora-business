-- =============================================================================
-- BuildMate — Phase 6: Project execution
-- Project tasks (with crew assignment + progress), progress/photo updates, and
-- a public Storage bucket for site photos. Access is gated to the project's
-- investor and contractor.
-- =============================================================================

do $$ begin
  create type project_task_status as enum ('todo','in_progress','blocked','done');
exception when duplicate_object then null; end $$;

create table if not exists public.project_tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  crew_id     uuid references public.crews (id) on delete set null,
  title       text not null,
  description text,
  status      project_task_status not null default 'todo',
  progress    integer not null default 0 check (progress between 0 and 100),
  order_index integer not null default 0,
  start_date  date,
  due_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists project_tasks_project_id_idx on public.project_tasks (project_id);

create table if not exists public.project_updates (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id  uuid references public.profiles (id) on delete set null,
  note       text,
  progress   integer check (progress between 0 and 100),
  photo_url  text,
  created_at timestamptz not null default now()
);

create index if not exists project_updates_project_id_idx on public.project_updates (project_id);

-- updated_at trigger for tasks
drop trigger if exists set_updated_at on public.project_tasks;
create trigger set_updated_at before update on public.project_tasks
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Helper: is the current user a participant (investor/contractor) of a project?
-- =============================================================================
create or replace function public.is_project_participant(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project
      and (p.investor_id = auth.uid() or p.contractor_id = auth.uid())
  );
$$;

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.project_tasks enable row level security;
alter table public.project_updates enable row level security;

drop policy if exists "project_tasks_rw" on public.project_tasks;
create policy "project_tasks_rw" on public.project_tasks for all
  to authenticated
  using (is_project_participant(project_id))
  with check (is_project_participant(project_id));

drop policy if exists "project_updates_rw" on public.project_updates;
create policy "project_updates_rw" on public.project_updates for all
  to authenticated
  using (is_project_participant(project_id))
  with check (is_project_participant(project_id));

-- =============================================================================
-- Storage bucket for project site photos (public read; per-user folder writes)
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('project-photos', 'project-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "project_photos_public_read" on storage.objects;
create policy "project_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'project-photos');

drop policy if exists "project_photos_insert_own" on storage.objects;
create policy "project_photos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "project_photos_update_own" on storage.objects;
create policy "project_photos_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'project-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'project-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "project_photos_delete_own" on storage.objects;
create policy "project_photos_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
