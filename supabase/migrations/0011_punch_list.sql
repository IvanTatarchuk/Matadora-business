-- =============================================================================
-- BuildMate — Phase 8: Punch List (defect / snag tracking)
-- Investors and contractors collaboratively track defects on a project.
-- Each item can have a photo, optional floor-plan coordinates, an assignee,
-- and moves through open → in_progress → resolved.
-- =============================================================================

do $$ begin
  create type public.punch_status as enum ('open', 'in_progress', 'resolved');
exception when duplicate_object then null;
end $$;

create table if not exists public.punch_items (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  title           text not null,
  description     text,
  photo_url       text,
  -- Optional pin on a floor plan image (0..1 relative coords)
  plan_x          numeric(5,4),
  plan_y          numeric(5,4),
  floor_plan_url  text,
  status          public.punch_status not null default 'open',
  assigned_to     uuid references public.profiles (id) on delete set null,
  due_date        date,
  resolved_at     timestamptz,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists punch_items_project_id_idx on public.punch_items (project_id);
create index if not exists punch_items_status_idx     on public.punch_items (status);

-- updated_at trigger
drop trigger if exists set_updated_at on public.punch_items;
create trigger set_updated_at
  before update on public.punch_items
  for each row execute function public.set_updated_at();

-- =============================================================================
-- RLS — same gate as execution tables: investor or assigned contractor
-- =============================================================================
alter table public.punch_items enable row level security;

drop policy if exists "punch_items_rw" on public.punch_items;
create policy "punch_items_rw" on public.punch_items for all
  to authenticated
  using  (is_project_participant(project_id))
  with check (is_project_participant(project_id));
