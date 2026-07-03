-- ============================================================
-- MIGRATION 0019 — Safety Observations, Photo Gallery Meta
-- matadora.business — Phase 15
-- ============================================================

-- -------------------------------------------------------
-- 1. SAFETY OBSERVATIONS (Procore Safety standard)
-- -------------------------------------------------------
create table if not exists public.safety_observations (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid references public.projects(id) on delete cascade not null,
  org_id            uuid references public.organizations(id) on delete cascade not null,
  created_by        uuid references public.profiles(id) on delete set null,

  observation_type  text not null default 'unsafe_condition'
                      check (observation_type in (
                        'unsafe_act','unsafe_condition','near_miss','incident',
                        'positive_observation','toolbox_talk','ppe_violation'
                      )),
  severity          text not null default 'medium'
                      check (severity in ('low','medium','high','critical')),
  status            text not null default 'open'
                      check (status in ('open','in_progress','resolved','closed')),

  title             text not null,
  description       text,
  location_note     text,
  observed_date     date not null,

  reported_by_name  text,
  workers_involved  text,

  immediate_action  text,
  corrective_action text,
  due_date          date,

  resolved_at       date,
  resolved_by       text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_safety_project on public.safety_observations(project_id, observed_date desc);
alter table public.safety_observations enable row level security;
create policy "safety_org_full" on public.safety_observations for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- -------------------------------------------------------
-- 2. SUPABASE STORAGE BUCKET for project-photos
-- (Run separately in Supabase Dashboard if needed)
-- insert into storage.buckets (id, name, public) values ('project-photos', 'project-photos', true)
-- on conflict (id) do nothing;
-- -------------------------------------------------------
