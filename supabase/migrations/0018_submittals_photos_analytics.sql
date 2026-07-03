-- ============================================================
-- MIGRATION 0018 — Submittals, Photo Gallery, Project Correspondence
-- matadora.business — Phase 14
-- ============================================================

-- -------------------------------------------------------
-- 1. SUBMITTALS (Procore/Trimble style)
-- -------------------------------------------------------
create table if not exists public.submittals (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  number          integer not null,
  number_display  text generated always as ('SUB-' || lpad(number::text, 3, '0')) stored,
  title           text not null,
  spec_section    text,               -- np. "03 30 00 Beton"
  submittal_type  text not null default 'shop_drawings'
                    check (submittal_type in (
                      'shop_drawings','product_data','samples','calculations',
                      'certificates','warranties','test_reports','operation_manuals','other'
                    )),

  status          text not null default 'draft'
                    check (status in (
                      'draft','submitted','under_review','approved',
                      'approved_as_noted','revise_resubmit','rejected','void'
                    )),

  -- Submittal routing
  submitted_to    text,               -- name of reviewer
  submitted_date  date,
  required_date   date,
  returned_date   date,

  revision        integer not null default 1,
  description     text,
  review_notes    text,
  internal_notes  text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_submittals_project on public.submittals(project_id, number desc);
alter table public.submittals enable row level security;
create policy "submittal_org_full" on public.submittals for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- -------------------------------------------------------
-- 2. PHOTO GALLERY (per-project)
-- -------------------------------------------------------
create table if not exists public.project_photos (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  uploaded_by     uuid references public.profiles(id) on delete set null,

  storage_path    text not null,      -- Supabase Storage path
  file_name       text not null,
  file_size       bigint,
  mime_type       text,
  width           integer,
  height          integer,

  title           text,
  description     text,
  category        text not null default 'progress'
                    check (category in (
                      'progress','defect','inspection','safety','handover',
                      'before','after','drone','other'
                    )),

  taken_at        timestamptz,
  location_note   text,
  tags            text[] default '{}',
  is_cover        boolean default false,

  created_at      timestamptz not null default now()
);

create index if not exists idx_photos_project on public.project_photos(project_id, created_at desc);
alter table public.project_photos enable row level security;
create policy "photo_org_full" on public.project_photos for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));
create policy "photo_investor_read" on public.project_photos for select
  using (project_id in (select id from public.projects where investor_id = auth.uid()));

-- -------------------------------------------------------
-- 3. PROJECT CORRESPONDENCE / MAIL LOG (Oracle Aconex style)
-- -------------------------------------------------------
create table if not exists public.project_correspondence (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  number          integer not null,
  number_display  text generated always as ('KOR-' || lpad(number::text, 3, '0')) stored,

  subject         text not null,
  direction       text not null check (direction in ('outgoing','incoming')),
  correspondent   text not null,     -- firma / osoba
  correspondent_email text,
  sent_date       date not null,
  received_date   date,

  category        text not null default 'general'
                    check (category in (
                      'general','rfi_response','claim','notice','instruction',
                      'approval','rejection','payment','contract','legal','other'
                    )),

  body            text,
  reference_number text,
  requires_response boolean default false,
  response_due_date date,
  responded_at    date,
  status          text not null default 'open'
                    check (status in ('open','responded','closed','escalated')),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_correspondence_project on public.project_correspondence(project_id, sent_date desc);
alter table public.project_correspondence enable row level security;
create policy "corr_org_full" on public.project_correspondence for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));
