-- MATADORA: pending migrations 0004 + 0010-0025
-- Paste in Supabase SQL Editor and Run All

create table if not exists public.schema_migrations (
  version     text primary key,
  applied_at  timestamptz not null default now()
);

-- ==================================================
-- 0004_company_branding.sql
-- ==================================================
-- =============================================================================
-- BuildMate — Phase 1: Company branding & logo
-- Adds company profile fields and a public Storage bucket for logos/assets.
-- =============================================================================

-- Profile branding / company details -----------------------------------------
alter table public.profiles
  add column if not exists logo_url        text,
  add column if not exists nip             text,   -- PL tax id (NIP)
  add column if not exists company_address text,
  add column if not exists website         text,
  add column if not exists bio             text;

-- =============================================================================
-- Storage bucket for company assets (logos). Public read so logos render on
-- the public offer page; writes are restricted per-user via policies below.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('company-assets', 'company-assets', true)
on conflict (id) do update set public = excluded.public;

-- Object path convention: "<auth.uid()>/<filename>" — the first folder segment
-- is the owner's user id, which the policies enforce on write.

-- Public read of company assets.
drop policy if exists "company_assets_public_read" on storage.objects;
create policy "company_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'company-assets');

-- Authenticated users may upload into their own folder.
drop policy if exists "company_assets_insert_own" on storage.objects;
create policy "company_assets_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'company-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users may update their own objects.
drop policy if exists "company_assets_update_own" on storage.objects;
create policy "company_assets_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'company-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'company-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users may delete their own objects.
drop policy if exists "company_assets_delete_own" on storage.objects;
create policy "company_assets_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'company-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ==================================================
-- 0010_finance.sql
-- ==================================================
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


-- ==================================================
-- 0011_punch_list.sql
-- ==================================================
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


-- ==================================================
-- 0012_polish_modules.sql
-- ==================================================
-- ============================================================
-- Migration 0012: Polish Market Modules
-- protokoly_odbioru, przetargi_subscriptions, bhp_documents,
-- kosztorysy (standalone estimates), milestone_payments
-- ============================================================

-- -------------------------------------------------------
-- 1. PROTOKOŁY ODBIORU (Digital Acceptance Protocols)
-- -------------------------------------------------------
create table if not exists public.protokoly_odbioru (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.projects(id) on delete cascade,
  contractor_id uuid references public.profiles(id),
  client_id     uuid references public.profiles(id),

  title         text not null,
  description   text,
  work_scope    text,

  -- Financial
  amount_net    numeric(14,2) not null default 0,
  vat_rate      numeric(4,2) not null default 8,
  amount_gross  numeric(14,2) generated always as (amount_net * (1 + vat_rate / 100)) stored,

  -- Status lifecycle: draft → sent → signed → invoiced
  status        text not null default 'draft'
                  check (status in ('draft','sent','signed','invoiced','rejected')),

  -- Signing
  signed_by_client_at   timestamptz,
  client_signature_ip   text,
  signing_token         text unique default encode(gen_random_bytes(24), 'hex'),

  -- Invoice linkage
  ksef_invoice_number   text,
  invoice_issued_at     timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.protokoly_odbioru enable row level security;

create policy "contractor_owns_protokol"
  on public.protokoly_odbioru for all
  using (contractor_id = auth.uid());

create policy "client_reads_protokol"
  on public.protokoly_odbioru for select
  using (client_id = auth.uid());

create policy "client_signs_protokol"
  on public.protokoly_odbioru for update
  using (client_id = auth.uid())
  with check (status in ('signed','rejected'));

-- -------------------------------------------------------
-- 2. PRZETARGI SUBSCRIPTIONS (Tender Alert Subscriptions)
-- -------------------------------------------------------
create table if not exists public.przetargi_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete cascade,
  email           text not null,
  categories      text[] not null default '{}',
  voivodeship     text,
  min_value       numeric(14,2),
  max_value       numeric(14,2),
  keywords        text[],
  is_active       boolean not null default true,
  last_sent_at    timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.przetargi_subscriptions enable row level security;

create policy "user_owns_subscription"
  on public.przetargi_subscriptions for all
  using (user_id = auth.uid());

-- -------------------------------------------------------
-- 3. PRZETARGI (Tender Cache / AI Matches)
-- -------------------------------------------------------
create table if not exists public.przetargi (
  id              uuid primary key default gen_random_uuid(),
  external_id     text unique,
  source          text not null, -- 'e-zamowienia','bzp','ted','other'
  title           text not null,
  description     text,
  location        text,
  voivodeship     text,
  category        text,
  value_min       numeric(14,2),
  value_max       numeric(14,2),
  deadline        date,
  url             text,
  is_active       boolean default true,
  fetched_at      timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- Public read for all authenticated users
alter table public.przetargi enable row level security;
create policy "all_authenticated_read_przetargi"
  on public.przetargi for select
  using (auth.role() = 'authenticated');

-- -------------------------------------------------------
-- 4. BHP DOCUMENTS (Safety Documentation)
-- -------------------------------------------------------
create table if not exists public.bhp_documents (
  id              uuid primary key default gen_random_uuid(),
  contractor_id   uuid references public.profiles(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete set null,

  doc_type        text not null
                    check (doc_type in (
                      'szkolenie_bhp',
                      'instrukcja_stanowiskowa',
                      'ocena_ryzyka',
                      'lista_pracownikow',
                      'wypadek',
                      'protokol_bhp',
                      'other'
                    )),
  title           text not null,
  content         text,
  file_url        text,

  -- Validity tracking
  valid_from      date,
  valid_until     date,
  is_expired      boolean not null default false,

  -- Worker signatures
  signed_by       uuid[],

  status          text not null default 'active'
                    check (status in ('draft','active','expired','archived')),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.bhp_documents enable row level security;

create policy "contractor_owns_bhp"
  on public.bhp_documents for all
  using (contractor_id = auth.uid());

-- -------------------------------------------------------
-- 5. MILESTONE PAYMENTS (Payment tracking per stage)
-- -------------------------------------------------------
create table if not exists public.milestone_payments (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade,
  task_id         uuid references public.project_tasks(id) on delete set null,
  protokol_id     uuid references public.protokoly_odbioru(id) on delete set null,

  title           text not null,
  description     text,
  amount          numeric(14,2) not null,
  due_date        date,

  -- Status: pending → invoiced → paid
  status          text not null default 'pending'
                    check (status in ('pending','invoiced','paid','overdue')),

  paid_at         timestamptz,
  payment_method  text,
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.milestone_payments enable row level security;

create policy "project_contractor_milestone"
  on public.milestone_payments for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.contractor_id = auth.uid()
    )
  );

create policy "project_investor_milestone_read"
  on public.milestone_payments for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.investor_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 6. SCHEMA MIGRATIONS TRACKING
-- -------------------------------------------------------
insert into public.schema_migrations (version, applied_at)
values ('0012_polish_modules', now())
on conflict (version) do nothing;


-- ==================================================
-- 0013_documents_changeorders_attendance.sql
-- ==================================================
-- ============================================================
-- Migration 0013: Project Documents, Change Orders, Attendance
-- Competitor analysis: Procore, PlanRadar, Buildertrend, Archdesk
-- ============================================================

-- -------------------------------------------------------
-- 1. PROJECT DOCUMENTS (CDE — Common Data Environment)
--    Inspired by: Procore Docs, PlanRadar, Archdesk DMS
-- -------------------------------------------------------
create table if not exists public.project_documents (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  uploaded_by     uuid references public.profiles(id) on delete set null,

  -- File metadata
  name            text not null,
  file_url        text,                    -- Supabase Storage URL
  file_size       bigint default 0,        -- bytes
  mime_type       text,

  -- Organization
  category        text not null default 'inne'
                    check (category in (
                      'projekt',
                      'umowa',
                      'kosztorys',
                      'bhp',
                      'pozwolenie',
                      'protokol',
                      'faktura',
                      'aneks',
                      'korespondencja',
                      'zdjecie',
                      'inne'
                    )),
  folder_path     text default '/',        -- virtual folder structure

  -- Versioning (Procore-style)
  version         integer not null default 1,
  previous_version_id uuid references public.project_documents(id) on delete set null,
  is_latest       boolean not null default true,

  -- Access control
  is_confidential boolean not null default false,
  visible_to      text not null default 'all'
                    check (visible_to in ('all', 'contractor_only', 'investor_only')),

  -- Metadata
  notes           text,
  tags            text[] default '{}',
  expiry_date     date,                    -- for permits, BHP certs

  -- Approval workflow (PlanRadar-style)
  requires_approval boolean default false,
  approved_by     uuid references public.profiles(id) on delete set null,
  approved_at     timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_project_documents_project on public.project_documents(project_id);
create index if not exists idx_project_documents_category on public.project_documents(project_id, category);
create index if not exists idx_project_documents_latest on public.project_documents(project_id, is_latest);

alter table public.project_documents enable row level security;

create policy "doc_contractor_full"
  on public.project_documents for all
  using (
    org_id in (
      select org_id from public.organization_members
      where user_id = auth.uid()
    )
  );

create policy "doc_investor_read"
  on public.project_documents for select
  using (
    visible_to in ('all', 'investor_only') and
    project_id in (
      select id from public.projects where investor_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 2. CHANGE ORDERS / ANEKSY DO UMOWY
--    Inspired by: Procore 3-tier CO, Buildertrend CO workflow,
--                 Archdesk Change Management
-- -------------------------------------------------------
create table if not exists public.change_orders (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  contractor_id   uuid references public.profiles(id) on delete cascade not null,

  -- Numbering (auto-incremented per project)
  number          integer not null,
  number_display  text generated always as ('ANU-' || lpad(number::text, 3, '0')) stored,

  title           text not null,
  description     text,

  -- Classification (Procore-style)
  reason          text not null default 'client_request'
                    check (reason in (
                      'client_request',
                      'scope_change',
                      'design_change',
                      'unforeseen_conditions',
                      'material_price_change',
                      'force_majeure',
                      'site_conditions',
                      'regulatory_change',
                      'other'
                    )),
  change_type     text not null default 'additive'
                    check (change_type in ('additive', 'deductive', 'neutral')),

  -- Financial impact
  amount_net      numeric(14,2) not null default 0,
  vat_rate        numeric(4,2) not null default 23,
  amount_gross    numeric(14,2) generated always as (amount_net * (1 + vat_rate / 100)) stored,

  -- Schedule impact
  schedule_days   integer not null default 0,  -- +/- days impact

  -- Workflow status (Buildertrend-style)
  status          text not null default 'draft'
                    check (status in (
                      'draft',
                      'pending_approval',
                      'approved',
                      'rejected',
                      'withdrawn'
                    )),

  -- Approval
  submitted_at    timestamptz,
  approved_at     timestamptz,
  approved_by     uuid references public.profiles(id) on delete set null,
  rejection_reason text,

  -- Document attachment
  document_id     uuid references public.project_documents(id) on delete set null,

  -- Legal base
  legal_basis     text default 'art_630_kc',  -- art_630_kc, art_632_kc, other

  -- Budget tracking — auto-updates project budget when approved
  previous_contract_value numeric(14,2),
  new_contract_value      numeric(14,2),

  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (project_id, number)
);

create index if not exists idx_change_orders_project on public.change_orders(project_id);
create index if not exists idx_change_orders_status on public.change_orders(project_id, status);

alter table public.change_orders enable row level security;

create policy "co_contractor_full"
  on public.change_orders for all
  using (contractor_id = auth.uid());

create policy "co_investor_read"
  on public.change_orders for select
  using (
    project_id in (
      select id from public.projects where investor_id = auth.uid()
    )
  );

create policy "co_investor_approve"
  on public.change_orders for update
  using (
    project_id in (
      select id from public.projects where investor_id = auth.uid()
    )
  )
  with check (status in ('approved', 'rejected'));

-- -------------------------------------------------------
-- 3. SITE ATTENDANCE / LISTA OBECNOŚCI
--    Inspired by: Procore Daily Logs, PlanRadar attendance,
--                 Buildertrend Daily Logs, Raken (US leader)
-- -------------------------------------------------------
create table if not exists public.attendance_records (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  worker_id       uuid references public.workers(id) on delete cascade not null,
  recorded_by     uuid references public.profiles(id) on delete set null,

  -- Date
  work_date       date not null,

  -- Status (comprehensive — Procore Daily Log standard)
  status          text not null default 'present'
                    check (status in (
                      'present',
                      'absent',
                      'late',
                      'half_day',
                      'sick_leave',       -- L4
                      'annual_leave',     -- urlop wypoczynkowy
                      'other_leave',      -- inne nieobecności
                      'overtime',         -- nadgodziny
                      'business_trip'     -- delegacja
                    )),

  -- Time tracking
  time_start      time,
  time_end        time,
  hours_worked    numeric(4,1) not null default 0 check (hours_worked >= 0 and hours_worked <= 24),
  overtime_hours  numeric(4,1) not null default 0,
  break_minutes   integer not null default 0,

  -- Location (Procore GPS-style)
  location_note   text,              -- which part of site
  gps_lat         numeric(10,7),
  gps_lon         numeric(10,7),

  -- Financial (auto-calculated from worker hourly_rate)
  hourly_rate_snapshot numeric(10,2),  -- snapshot at time of entry
  labor_cost      numeric(12,2) generated always as (
    hours_worked * coalesce(hourly_rate_snapshot, 0)
  ) stored,
  overtime_cost   numeric(12,2) generated always as (
    overtime_hours * coalesce(hourly_rate_snapshot, 0) * 1.5
  ) stored,

  -- Notes & approval
  notes           text,
  approved        boolean default false,
  approved_by     uuid references public.profiles(id) on delete set null,
  approved_at     timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- One record per worker per day per project
  unique (project_id, worker_id, work_date)
);

create index if not exists idx_attendance_project_date on public.attendance_records(project_id, work_date desc);
create index if not exists idx_attendance_worker on public.attendance_records(worker_id, work_date desc);
create index if not exists idx_attendance_org_date on public.attendance_records(org_id, work_date desc);

alter table public.attendance_records enable row level security;

create policy "attendance_org_member_full"
  on public.attendance_records for all
  using (
    org_id in (
      select org_id from public.organization_members
      where user_id = auth.uid()
    )
  );

create policy "attendance_investor_read"
  on public.attendance_records for select
  using (
    project_id in (
      select id from public.projects where investor_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 4. DAILY SITE REPORTS (Procore Daily Log — full version)
--    Links attendance + weather + notes + photos per day
-- -------------------------------------------------------
create table if not exists public.daily_site_reports (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  report_date     date not null,

  -- Weather (Buildertrend-style)
  weather_condition text check (weather_condition in (
    'sunny','cloudy','overcast','rain','heavy_rain','snow','fog','windy','storm'
  )),
  temperature_c   integer,
  weather_notes   text,

  -- Work summary
  work_performed  text,
  work_delayed    boolean default false,
  delay_reason    text,
  delay_hours     numeric(4,1) default 0,

  -- Visitors / inspections
  visitors        jsonb default '[]',   -- [{name, company, purpose, time}]
  inspections     jsonb default '[]',   -- [{type, inspector, result}]

  -- Materials delivered
  materials_delivered text,

  -- Equipment on site
  equipment_notes text,

  -- Safety
  safety_incidents integer default 0,
  safety_notes    text,

  -- Photos (references to project_documents)
  photo_ids       uuid[] default '{}',

  -- Status
  status          text not null default 'draft'
                    check (status in ('draft','submitted','approved')),
  submitted_at    timestamptz,
  approved_at     timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (project_id, report_date)
);

create index if not exists idx_daily_reports_project on public.daily_site_reports(project_id, report_date desc);

alter table public.daily_site_reports enable row level security;

create policy "report_org_member_full"
  on public.daily_site_reports for all
  using (
    org_id in (
      select org_id from public.organization_members
      where user_id = auth.uid()
    )
  );

create policy "report_investor_read"
  on public.daily_site_reports for select
  using (
    project_id in (
      select id from public.projects where investor_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- 5. SCHEMA MIGRATIONS TRACKING
-- -------------------------------------------------------
insert into public.schema_migrations (version, applied_at)
values ('0013_documents_changeorders_attendance', now())
on conflict (version) do nothing;


-- ==================================================
-- 0014_rfis.sql
-- ==================================================
-- ============================================================
-- Migration 0014: RFI (Request for Information / Zapytania techniczne)
-- Wzorowane na: Procore RFI, Aconex, Trimble ProjectSight, Fieldwire
-- ============================================================

create table if not exists public.rfis (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,

  -- Numbering (auto per project)
  number          integer not null,
  number_display  text generated always as ('RFI-' || lpad(number::text, 3, '0')) stored,

  -- Core fields (Procore-style)
  title           text not null,
  question        text not null,
  discipline      text not null default 'general'
                    check (discipline in (
                      'general',
                      'architektura',
                      'konstrukcja',
                      'instalacje_elektryczne',
                      'instalacje_sanitarne',
                      'instalacje_hvac',
                      'geotechnika',
                      'drogi',
                      'kosztorys',
                      'bhp',
                      'inne'
                    )),

  -- Workflow
  priority        text not null default 'normal'
                    check (priority in ('low', 'normal', 'high', 'urgent')),
  status          text not null default 'draft'
                    check (status in (
                      'draft',
                      'open',
                      'answered',
                      'closed',
                      'void'
                    )),

  -- Parties (Procore: originator, assignee, manager)
  created_by      uuid references public.profiles(id) on delete set null,
  assigned_to     uuid references public.profiles(id) on delete set null,
  assigned_to_name text,                          -- external person (no account)

  -- Dates
  date_initiated  date not null default current_date,
  due_date        date,
  answered_at     timestamptz,
  closed_at       timestamptz,

  -- Impact flags (Procore-style)
  cost_impact     boolean not null default false,
  schedule_impact boolean not null default false,
  schedule_days   integer default 0,

  -- Response
  answer          text,
  answered_by     uuid references public.profiles(id) on delete set null,
  answered_by_name text,

  -- Attachments (references to project_documents)
  document_ids    uuid[] default '{}',

  -- Distribution list (emails or user ids)
  distribution    text[] default '{}',

  -- Reference to drawing/location
  drawing_ref     text,
  spec_section    text,
  location_note   text,

  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (project_id, number)
);

create index if not exists idx_rfis_project on public.rfis(project_id, status);
create index if not exists idx_rfis_due on public.rfis(due_date) where status in ('open','draft');
create index if not exists idx_rfis_assigned on public.rfis(assigned_to) where status = 'open';

alter table public.rfis enable row level security;

create policy "rfi_org_member_full"
  on public.rfis for all
  using (
    org_id in (
      select org_id from public.organization_members
      where user_id = auth.uid()
    )
  );

create policy "rfi_investor_read"
  on public.rfis for select
  using (
    project_id in (
      select id from public.projects where investor_id = auth.uid()
    )
  );

-- ============================================================
-- Migration 0015: Meeting Minutes (Notatki ze spotkań)
-- Wzorowane na: Procore Meetings, Archdesk, Trimble, Aconex
-- ============================================================

create table if not exists public.meetings (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  -- Numbering
  number          integer not null,
  number_display  text generated always as ('SPK-' || lpad(number::text, 3, '0')) stored,

  title           text not null,
  meeting_type    text not null default 'site'
                    check (meeting_type in (
                      'site',           -- Narada budowlana
                      'progress',       -- Narada postępu
                      'design',         -- Narada projektowa
                      'safety',         -- Odprawa BHP
                      'kickoff',        -- Spotkanie inauguracyjne
                      'closeout',       -- Spotkanie końcowe
                      'client',         -- Spotkanie z inwestorem
                      'subcontractor',  -- Narada podwykonawców
                      'other'
                    )),

  meeting_date    date not null,
  meeting_time    time,
  location        text,
  duration_min    integer default 60,

  -- Participants (names + external)
  attendees       jsonb not null default '[]', -- [{name, company, role, present}]
  absent          jsonb default '[]',

  -- Content
  agenda          text,
  summary         text,

  -- Status
  status          text not null default 'draft'
                    check (status in ('draft', 'published', 'approved')),
  published_at    timestamptz,

  -- Next meeting
  next_meeting_date date,
  next_meeting_location text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (project_id, number)
);

create table if not exists public.meeting_items (
  id              uuid primary key default gen_random_uuid(),
  meeting_id      uuid references public.meetings(id) on delete cascade not null,
  sort_order      integer not null default 0,

  item_type       text not null default 'topic'
                    check (item_type in (
                      'topic',         -- Temat do omówienia
                      'decision',      -- Podjęta decyzja
                      'action',        -- Działanie do wykonania
                      'issue',         -- Problem / issue
                      'information'    -- Informacja
                    )),

  title           text not null,
  description     text,

  -- For action items
  assigned_to_name text,
  due_date        date,
  status          text default 'open'
                    check (status in ('open', 'in_progress', 'done', 'cancelled')),

  -- Carry-over from previous meeting
  carried_over_from uuid references public.meeting_items(id) on delete set null,

  created_at      timestamptz not null default now()
);

create index if not exists idx_meetings_project on public.meetings(project_id, meeting_date desc);
create index if not exists idx_meeting_items_meeting on public.meeting_items(meeting_id, sort_order);

alter table public.meetings enable row level security;
alter table public.meeting_items enable row level security;

create policy "meeting_org_full"
  on public.meetings for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

create policy "meeting_investor_read"
  on public.meetings for select
  using (project_id in (select id from public.projects where investor_id = auth.uid()));

create policy "meeting_items_via_meeting"
  on public.meeting_items for all
  using (
    meeting_id in (
      select m.id from public.meetings m
      join public.organization_members om on om.org_id = m.org_id
      where om.user_id = auth.uid()
    )
  );

-- ============================================================
-- Migration 0016: Risk Register (Rejestr ryzyk)
-- Wzorowane na: Archdesk, Procore, InEight, Oracle Primavera Risk
-- ============================================================

create table if not exists public.project_risks (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  -- Identification
  number          integer not null,
  title           text not null,
  description     text,

  category        text not null default 'other'
                    check (category in (
                      'technical',      -- Techniczne
                      'financial',      -- Finansowe
                      'schedule',       -- Harmonogram
                      'safety',         -- BHP / bezpieczeństwo
                      'legal',          -- Prawne
                      'environmental',  -- Środowiskowe
                      'subcontractor',  -- Podwykonawcy
                      'design',         -- Projektowe
                      'weather',        -- Pogodowe
                      'client',         -- Po stronie klienta
                      'other'
                    )),

  -- Risk scoring (5x5 matrix — standard Procore/PMI)
  probability     integer not null default 3
                    check (probability between 1 and 5),
  -- 1=bardzo niskie, 2=niskie, 3=umiarkowane, 4=wysokie, 5=bardzo wysokie

  impact          integer not null default 3
                    check (impact between 1 and 5),
  -- 1=minimalne, 2=niskie, 3=umiarkowane, 4=poważne, 5=katastrofalne

  risk_score      integer generated always as (probability * impact) stored,
  -- 1-4: Niskie | 5-9: Umiarkowane | 10-16: Wysokie | 17-25: Krytyczne

  -- Risk type
  risk_type       text not null default 'threat'
                    check (risk_type in ('threat', 'opportunity')),

  -- Owner & mitigation
  owner_name      text,
  owner_id        uuid references public.profiles(id) on delete set null,

  -- Response strategy (PMI standard)
  response_strategy text not null default 'monitor'
                    check (response_strategy in (
                      'avoid',      -- Unikanie (zagrożenie)
                      'transfer',   -- Transfer/ubezpieczenie
                      'mitigate',   -- Mitygacja / redukcja
                      'accept',     -- Akceptacja
                      'monitor',    -- Monitorowanie
                      'exploit',    -- Wykorzystanie (szansa)
                      'share',      -- Podział (szansa)
                      'enhance'     -- Wzmocnienie (szansa)
                    )),

  mitigation_plan text,
  contingency_plan text,

  -- Financial impact estimate
  cost_impact_min numeric(14,2),
  cost_impact_max numeric(14,2),

  -- Schedule impact
  schedule_days_min integer default 0,
  schedule_days_max integer default 0,

  -- Status
  status          text not null default 'identified'
                    check (status in (
                      'identified',
                      'assessed',
                      'mitigated',
                      'realized',
                      'closed'
                    )),

  -- Residual risk after mitigation
  residual_probability integer check (residual_probability between 1 and 5),
  residual_impact      integer check (residual_impact between 1 and 5),

  review_date     date,
  closed_at       timestamptz,
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (project_id, number)
);

create index if not exists idx_risks_project on public.project_risks(project_id, status);
create index if not exists idx_risks_score on public.project_risks(project_id, risk_score desc);

alter table public.project_risks enable row level security;

create policy "risk_org_full"
  on public.project_risks for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- ============================================================
-- Schema migrations tracking
-- ============================================================
insert into public.schema_migrations (version, applied_at)
values
  ('0014_rfis', now()),
  ('0015_meetings', now()),
  ('0016_risk_register', now())
on conflict (version) do nothing;


-- ==================================================
-- 0017_subcontractors_inspections_equipment_po.sql
-- ==================================================
-- ============================================================
-- Migration 0017: Subcontractors, Inspections, Equipment, Purchase Orders, CRM
-- Wzorowane na: Procore, Archdesk, PlanRadar, Fieldwire, Buildertrend
-- ============================================================

-- ============================================================
-- SUBCONTRACTORS (Podwykonawcy)
-- ============================================================
create table if not exists public.subcontractors (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references public.organizations(id) on delete cascade not null,
  name            text not null,
  nip             text,
  regon           text,
  address         text,
  city            text,
  postal_code     text,
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  website         text,
  specialty       text not null default 'general'
                    check (specialty in (
                      'general', 'electrical', 'plumbing', 'hvac', 'roofing',
                      'flooring', 'painting', 'insulation', 'concrete', 'steel',
                      'windows', 'landscaping', 'demolition', 'excavation', 'other'
                    )),
  rating          numeric(3,2) check (rating >= 0 and rating <= 5),
  status          text not null default 'active'
                    check (status in ('active', 'inactive', 'blacklisted')),
  notes           text,
  insurance_expiry date,
  license_number  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.subcontractor_contracts (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid references public.projects(id) on delete cascade not null,
  subcontractor_id    uuid references public.subcontractors(id) on delete cascade not null,
  org_id              uuid references public.organizations(id) on delete cascade not null,
  contract_number     text,
  scope_description   text not null,
  start_date          date,
  end_date            date,
  contract_value      numeric(14,2) not null default 0,
  paid_to_date        numeric(14,2) not null default 0,
  retention_percent   numeric(5,2) not null default 10,
  status              text not null default 'draft'
                        check (status in ('draft','active','completed','terminated')),
  notes               text,
  created_at          timestamptz not null default now()
);

create index if not exists idx_subs_org on public.subcontractors(org_id, status);
create index if not exists idx_sub_contracts_project on public.subcontractor_contracts(project_id);

alter table public.subcontractors enable row level security;
alter table public.subcontractor_contracts enable row level security;

create policy "subs_org_full" on public.subcontractors for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

create policy "sub_contracts_org_full" on public.subcontractor_contracts for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- ============================================================
-- INSPECTIONS / QC (Inspekcje / Kontrola jakości)
-- Wzorowane na: PlanRadar, Fieldwire, Finalcad
-- ============================================================
create table if not exists public.inspection_templates (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references public.organizations(id) on delete cascade not null,
  name            text not null,
  category        text not null default 'quality'
                    check (category in (
                      'quality',     -- Kontrola jakości
                      'safety',      -- BHP
                      'handover',    -- Odbiór
                      'maintenance', -- Przegląd
                      'environment', -- Środowisko
                      'regulatory',  -- Wymogi prawne
                      'custom'       -- Własny
                    )),
  items           jsonb not null default '[]',
  -- [{id, question, required, type: "pass_fail"|"yes_no"|"text"|"number"|"photo"}]
  is_global       boolean not null default false,
  created_at      timestamptz not null default now()
);

create table if not exists public.inspections (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid references public.projects(id) on delete cascade not null,
  org_id              uuid references public.organizations(id) on delete cascade not null,
  template_id         uuid references public.inspection_templates(id) on delete set null,
  created_by          uuid references public.profiles(id) on delete set null,

  number              integer not null,
  number_display      text generated always as ('INS-' || lpad(number::text, 3, '0')) stored,

  title               text not null,
  category            text not null default 'quality',
  inspection_date     date not null default current_date,
  inspector_name      text,
  location_note       text,

  status              text not null default 'draft'
                        check (status in ('draft','in_progress','passed','failed','conditional')),

  -- Items: [{id, question, result: pass|fail|observation|na, value, notes, photo_url}]
  items               jsonb not null default '[]',

  overall_result      text check (overall_result in ('pass','fail','conditional','na')),
  defects_count       integer not null default 0,
  observations_count  integer not null default 0,

  notes               text,
  corrective_actions  text,
  follow_up_date      date,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (project_id, number)
);

create index if not exists idx_inspections_project on public.inspections(project_id, status);

alter table public.inspection_templates enable row level security;
alter table public.inspections enable row level security;

create policy "insp_templates_org" on public.inspection_templates for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid())
         or is_global = true);

create policy "inspections_org_full" on public.inspections for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- ============================================================
-- EQUIPMENT (Sprzęt i maszyny)
-- Wzorowane na: Procore, Archdesk, HCSS, Viewpoint
-- ============================================================
create table if not exists public.equipment (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references public.organizations(id) on delete cascade not null,
  name            text not null,
  category        text not null default 'other'
                    check (category in (
                      'excavator',     -- Koparka
                      'crane',         -- Dźwig
                      'concrete_mixer',-- Betoniarka / mieszalnik
                      'forklift',      -- Wózek widłowy
                      'scaffold',      -- Rusztowanie
                      'compressor',    -- Sprężarka
                      'generator',     -- Generator
                      'pump',          -- Pompa
                      'vehicle',       -- Pojazd
                      'hand_tool',     -- Narzędzie ręczne
                      'measurement',   -- Sprzęt pomiarowy
                      'safety',        -- Sprzęt BHP
                      'other'
                    )),
  brand           text,
  model           text,
  serial_number   text,
  year            integer,
  purchase_price  numeric(14,2),
  daily_rate      numeric(10,2),    -- stawka dzienna wynajmu / amortyzacja
  status          text not null default 'available'
                    check (status in (
                      'available',   -- Dostępny
                      'in_use',      -- W użyciu
                      'maintenance', -- Serwis / naprawa
                      'retired'      -- Wycofany
                    )),
  location        text,
  next_service_date date,
  insurance_expiry date,
  notes           text,
  created_at      timestamptz not null default now()
);

create table if not exists public.equipment_assignments (
  id              uuid primary key default gen_random_uuid(),
  equipment_id    uuid references public.equipment(id) on delete cascade not null,
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  assigned_date   date not null default current_date,
  returned_date   date,
  days_used       integer,
  cost            numeric(12,2),
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_equipment_org on public.equipment(org_id, status);
create index if not exists idx_eq_assign_project on public.equipment_assignments(project_id);

alter table public.equipment enable row level security;
alter table public.equipment_assignments enable row level security;

create policy "equipment_org_full" on public.equipment for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

create policy "eq_assign_org_full" on public.equipment_assignments for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- ============================================================
-- PURCHASE ORDERS (Zamówienia zakupu)
-- Wzorowane na: Archdesk, Procore, Buildertrend
-- ============================================================
create table if not exists public.purchase_orders (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  number          integer not null,
  number_display  text generated always as ('ZAM-' || lpad(number::text, 4, '0')) stored,

  supplier_name   text not null,
  supplier_nip    text,
  supplier_contact text,

  order_date      date not null default current_date,
  expected_delivery date,
  actual_delivery date,

  status          text not null default 'draft'
                    check (status in (
                      'draft',      -- Szkic
                      'sent',       -- Wysłane do dostawcy
                      'confirmed',  -- Potwierdzone
                      'partial',    -- Częściowa dostawa
                      'delivered',  -- Dostarczone
                      'invoiced',   -- Zafakturowane
                      'cancelled'   -- Anulowane
                    )),

  -- Financial
  net_total       numeric(14,2) not null default 0,
  vat_total       numeric(14,2) not null default 0,
  gross_total     numeric(14,2) not null default 0,
  paid_amount     numeric(14,2) not null default 0,

  payment_terms   text,  -- np. "30 dni", "przelew 14 dni"
  delivery_address text,
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (project_id, number)
);

create table if not exists public.purchase_order_items (
  id              uuid primary key default gen_random_uuid(),
  po_id           uuid references public.purchase_orders(id) on delete cascade not null,
  sort_order      integer not null default 0,
  description     text not null,
  unit            text not null default 'szt',
  quantity        numeric(12,3) not null default 1,
  unit_price      numeric(12,2) not null default 0,
  vat_rate        numeric(5,2) not null default 23,
  net_amount      numeric(14,2) generated always as (quantity * unit_price) stored,
  gross_amount    numeric(14,2) generated always as (quantity * unit_price * (1 + vat_rate/100)) stored,
  delivered_qty   numeric(12,3) not null default 0,
  notes           text
);

create index if not exists idx_po_project on public.purchase_orders(project_id, status);
create index if not exists idx_po_items on public.purchase_order_items(po_id, sort_order);

alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

create policy "po_org_full" on public.purchase_orders for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

create policy "po_items_via_po" on public.purchase_order_items for all
  using (po_id in (
    select p.id from public.purchase_orders p
    join public.organization_members om on om.org_id = p.org_id
    where om.user_id = auth.uid()
  ));

-- ============================================================
-- CRM — LEADS (Leady sprzedażowe)
-- Wzorowane na: Archdesk, CoConstruct, JobNimbus, Cosential
-- ============================================================
create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  -- Client info
  client_name     text not null,
  client_company  text,
  client_email    text,
  client_phone    text,
  client_nip      text,

  -- Project info
  title           text not null,
  description     text,
  address         text,
  city            text,

  -- Pipeline stage (Kanban)
  stage           text not null default 'prospect'
                    check (stage in (
                      'prospect',     -- Potencjalny klient
                      'contact',      -- Kontakt nawiązany
                      'site_visit',   -- Wizja lokalna
                      'offer_sent',   -- Oferta wysłana
                      'negotiation',  -- Negocjacje
                      'won',          -- Wygrany
                      'lost',         -- Przegrany / zrezygnował
                      'on_hold'       -- Wstrzymany
                    )),

  -- Value estimation
  estimated_value numeric(14,2),
  win_probability integer default 50 check (win_probability between 0 and 100),

  -- Source
  source          text default 'referral'
                    check (source in (
                      'referral',      -- Polecenie
                      'przetarg',      -- Przetarg BZP
                      'website',       -- Strona www
                      'social',        -- Media społecznościowe
                      'cold_call',     -- Zimny kontakt
                      'repeat_client', -- Stały klient
                      'other'
                    )),

  -- Dates
  first_contact_date date default current_date,
  expected_start_date date,
  expected_close_date date,
  won_at          timestamptz,
  lost_at         timestamptz,
  lost_reason     text,

  -- Converted to project
  project_id      uuid references public.projects(id) on delete set null,

  priority        text default 'medium' check (priority in ('low','medium','high')),
  assigned_to     uuid references public.profiles(id) on delete set null,
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.lead_activities (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid references public.leads(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,
  activity_type   text not null check (activity_type in (
    'note', 'call', 'email', 'meeting', 'site_visit', 'offer', 'follow_up', 'stage_change'
  )),
  title           text not null,
  description     text,
  activity_date   timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists idx_leads_org on public.leads(org_id, stage);
create index if not exists idx_lead_activities on public.lead_activities(lead_id, activity_date desc);

alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;

create policy "leads_org_full" on public.leads for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

create policy "lead_activities_org" on public.lead_activities for all
  using (lead_id in (
    select l.id from public.leads l
    join public.organization_members om on om.org_id = l.org_id
    where om.user_id = auth.uid()
  ));

-- ============================================================
-- WORKER CERTIFICATIONS (Kwalifikacje / Uprawnienia)
-- Wzorowane na: Assignar, Procore Workforce
-- ============================================================
create table if not exists public.worker_certifications (
  id              uuid primary key default gen_random_uuid(),
  worker_id       uuid references public.workers(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  cert_type       text not null check (cert_type in (
    'bhp_general',       -- Szkolenie BHP ogólne
    'bhp_work',          -- Szkolenie BHP stanowiskowe
    'udt_operator',      -- Uprawnienia UDT
    'electrical_e',      -- Uprawnienia elektryczne E (eksploatacja)
    'electrical_d',      -- Uprawnienia elektryczne D (dozór)
    'high_work',         -- Praca na wysokości
    'forklift',          -- Wózek widłowy
    'crane',             -- Dźwig
    'welding',           -- Spawanie (np. PREN)
    'driving_cat_b',     -- Prawo jazdy kat. B
    'driving_cat_c',     -- Prawo jazdy kat. C
    'driving_cat_ce',    -- Prawo jazdy kat. CE
    'first_aid',         -- Pierwsza pomoc
    'asbestos',          -- Usuwanie azbestu
    'scaffolding',       -- Rusztowania
    'blasting',          -- Roboty strzałowe
    'gas_installation',  -- Instalacje gazowe
    'other'
  )),
  cert_name       text not null,          -- pełna nazwa uprawnienia
  cert_number     text,                   -- numer dokumentu
  issuing_body    text,                   -- organ wydający (UDT, SEP, itp.)
  issued_date     date,
  expiry_date     date,
  is_permanent    boolean not null default false,
  file_url        text,                   -- skan dokumentu
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_worker_certs_worker on public.worker_certifications(worker_id);
create index if not exists idx_worker_certs_expiry on public.worker_certifications(expiry_date, org_id)
  where expiry_date is not null and is_permanent = false;

alter table public.worker_certifications enable row level security;

create policy "worker_certs_org_full" on public.worker_certifications for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- ============================================================
-- Tracking
-- ============================================================
insert into public.schema_migrations (version, applied_at)
values
  ('0017_subcontractors', now()),
  ('0017_inspections', now()),
  ('0017_equipment', now()),
  ('0017_purchase_orders', now()),
  ('0017_crm_leads', now()),
  ('0017_worker_certs', now())
on conflict (version) do nothing;


-- ==================================================
-- 0018_submittals_photos_analytics.sql
-- ==================================================
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


-- ==================================================
-- 0019_safety_observations.sql
-- ==================================================
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


-- ==================================================
-- 0020_warranty_notifications_tasks.sql
-- ==================================================
-- ============================================================
-- MIGRATION 0020 — Warranty, Notifications, Project Tasks Board
-- matadora.business — Phase 16
-- ============================================================

-- -------------------------------------------------------
-- 1. WARRANTY RECORDS (Buildertrend Warranty style)
-- -------------------------------------------------------
create table if not exists public.warranty_records (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  title           text not null,
  description     text,
  category        text not null default 'workmanship'
                    check (category in (
                      'workmanship','materials','equipment','structural',
                      'waterproofing','electrical','plumbing','hvac','other'
                    )),

  -- Who is responsible
  responsible_party text,           -- subcontractor or internal
  subcontractor_id  uuid,

  -- Warranty period
  start_date      date not null,
  end_date        date not null,
  warranty_months integer generated always as (
    (end_date - start_date) / 30
  ) stored,

  status          text not null default 'active'
                    check (status in ('active','claimed','resolved','expired','void')),

  claim_date      date,
  claim_description text,
  resolution_date date,
  resolution_notes text,

  document_ref    text,             -- certificate / document number
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_warranty_project on public.warranty_records(project_id, end_date asc);
alter table public.warranty_records enable row level security;
create policy "warranty_org_full" on public.warranty_records for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));
create policy "warranty_investor_read" on public.warranty_records for select
  using (project_id in (select id from public.projects where investor_id = auth.uid()));

-- -------------------------------------------------------
-- 2. IN-APP NOTIFICATIONS
-- -------------------------------------------------------
create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade,

  type            text not null default 'info'
                    check (type in (
                      'info','warning','error','success',
                      'rfi_new','rfi_answered','punch_opened','punch_closed',
                      'inspection_completed','risk_high','budget_alert',
                      'cert_expiring','warranty_expiring','document_uploaded',
                      'payment_due','daily_report_submitted'
                    )),
  title           text not null,
  body            text,
  href            text,             -- navigation target
  entity_type     text,             -- 'project','rfi','punch' etc.
  entity_id       uuid,

  is_read         boolean not null default false,
  read_at         timestamptz,

  created_at      timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications(user_id, is_read) where not is_read;
alter table public.notifications enable row level security;
create policy "notif_own" on public.notifications for all
  using (user_id = auth.uid());

-- -------------------------------------------------------
-- 3. PROJECT TASK BOARD (Kanban — Archdesk / Asana style)
-- -------------------------------------------------------
create table if not exists public.project_task_cards (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,
  assigned_to     uuid references public.profiles(id) on delete set null,

  title           text not null,
  description     text,
  status          text not null default 'todo'
                    check (status in ('backlog','todo','in_progress','review','done')),
  priority        text not null default 'medium'
                    check (priority in ('low','medium','high','urgent')),
  category        text not null default 'general'
                    check (category in (
                      'general','technical','admin','procurement','safety','quality','other'
                    )),

  due_date        date,
  estimated_hours numeric(6,1),
  actual_hours    numeric(6,1),

  position        integer not null default 0,
  tags            text[] default '{}',

  completed_at    timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_task_cards_project on public.project_task_cards(project_id, status, position);
alter table public.project_task_cards enable row level security;
create policy "task_card_org_full" on public.project_task_cards for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));


-- ==================================================
-- 0021_rfq_retention_toolbox_dispatch.sql
-- ==================================================
-- ============================================================
-- MIGRATION 0021 — RFQ, Kaucja gwarancyjna, Toolbox Talks, Dispatch
-- matadora.business — Phase 17
-- ============================================================

-- -------------------------------------------------------
-- 1. RFQ — Requests for Quotation (Zapytania ofertowe do dostawców)
-- -------------------------------------------------------
create table if not exists public.rfqs (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  number          integer not null,
  number_display  text generated always as ('ZO-' || lpad(number::text, 3, '0')) stored,

  title           text not null,
  description     text,
  category        text not null default 'materials'
                    check (category in ('materials','subcontract','equipment','services','other')),

  status          text not null default 'draft'
                    check (status in ('draft','sent','responses_received','awarded','cancelled')),

  due_date        date,
  awarded_to      text,
  awarded_amount  numeric(14,2),
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.rfq_items (
  id          uuid primary key default gen_random_uuid(),
  rfq_id      uuid references public.rfqs(id) on delete cascade not null,
  position    integer not null default 0,
  description text not null,
  quantity    numeric(12,3),
  unit        text,
  notes       text
);

create table if not exists public.rfq_responses (
  id              uuid primary key default gen_random_uuid(),
  rfq_id          uuid references public.rfqs(id) on delete cascade not null,
  supplier_name   text not null,
  supplier_email  text,
  total_amount    numeric(14,2),
  delivery_days   integer,
  valid_until     date,
  notes           text,
  is_selected     boolean not null default false,
  received_at     timestamptz not null default now()
);

create index if not exists idx_rfq_project on public.rfqs(project_id, created_at desc);
alter table public.rfqs enable row level security;
alter table public.rfq_items enable row level security;
alter table public.rfq_responses enable row level security;
create policy "rfq_org" on public.rfqs for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));
create policy "rfq_items_org" on public.rfq_items for all
  using (rfq_id in (select id from public.rfqs where org_id in
    (select org_id from public.organization_members where user_id = auth.uid())));
create policy "rfq_resp_org" on public.rfq_responses for all
  using (rfq_id in (select id from public.rfqs where org_id in
    (select org_id from public.organization_members where user_id = auth.uid())));

-- -------------------------------------------------------
-- 2. KAUCJA GWARANCYJNA (Retention — art. 647¹ KC Polish law)
-- -------------------------------------------------------
create table if not exists public.retention_payments (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid references public.projects(id) on delete cascade not null,
  org_id              uuid references public.organizations(id) on delete cascade not null,
  created_by          uuid references public.profiles(id) on delete set null,

  title               text not null,
  description         text,
  party_name          text not null,          -- subcontractor or investor
  direction           text not null default 'held'
                        check (direction in ('held','paid_out')),  -- held BY us, or paid_out BY us

  contract_value      numeric(14,2) not null,
  retention_pct       numeric(5,2) not null default 5.00,
  retention_amount    numeric(14,2) generated always as
                        (contract_value * retention_pct / 100) stored,

  release_condition   text,           -- e.g. "after 60 days from final handover"
  release_date        date,           -- planned release date
  released_at         date,           -- actual release date
  released_amount     numeric(14,2),

  status              text not null default 'held'
                        check (status in ('held','partially_released','released','disputed')),

  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_retention_project on public.retention_payments(project_id, status);
alter table public.retention_payments enable row level security;
create policy "retention_org" on public.retention_payments for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- -------------------------------------------------------
-- 3. TOOLBOX TALKS (Odprawy BHP — Raken / Procore Safety)
-- -------------------------------------------------------
create table if not exists public.toolbox_talks (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  title           text not null,
  topic           text not null default 'general_safety'
                    check (topic in (
                      'general_safety','fall_protection','electrical','ppe',
                      'manual_handling','fire_safety','chemical','machinery',
                      'excavation','scaffolding','confined_space','first_aid','other'
                    )),
  conducted_by    text not null,
  conducted_date  date not null,
  duration_min    integer,
  location        text,
  content         text,
  attendees       text[],
  attendee_count  integer generated always as (array_length(attendees, 1)) stored,
  has_signatures  boolean not null default false,
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_toolbox_org on public.toolbox_talks(org_id, conducted_date desc);
create index if not exists idx_toolbox_project on public.toolbox_talks(project_id, conducted_date desc);
alter table public.toolbox_talks enable row level security;
create policy "toolbox_org" on public.toolbox_talks for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- -------------------------------------------------------
-- 4. DISPATCH — Crew / Worker Assignments (tygodniowe planowanie)
-- -------------------------------------------------------
create table if not exists public.dispatch_assignments (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references public.organizations(id) on delete cascade not null,
  project_id      uuid references public.projects(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  worker_id       uuid references public.workers(id) on delete cascade,
  crew_id         uuid,                       -- references crews if exists
  worker_name     text,                       -- denormalized for speed

  work_date       date not null,
  start_time      time,
  end_time        time,
  task_description text,
  location_note   text,
  status          text not null default 'planned'
                    check (status in ('planned','confirmed','completed','absent','cancelled')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_dispatch_date on public.dispatch_assignments(org_id, work_date, status);
create index if not exists idx_dispatch_project on public.dispatch_assignments(project_id, work_date);
alter table public.dispatch_assignments enable row level security;
create policy "dispatch_org" on public.dispatch_assignments for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));


-- ==================================================
-- 0022_incidents_job_costing_invoices.sql
-- ==================================================
-- ============================================================
-- MIGRATION 0022 — Incidents, Job Costing, Invoices
-- matadora.business — Phase 18
-- ============================================================

-- -------------------------------------------------------
-- 1. INCIDENTS — Rejestr wypadków i incydentów BHP (art. 234 KP)
-- -------------------------------------------------------
create table if not exists public.incidents (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid references public.projects(id) on delete cascade not null,
  org_id            uuid references public.organizations(id) on delete cascade not null,
  created_by        uuid references public.profiles(id) on delete set null,

  incident_number   integer not null,
  number_display    text generated always as ('INC-' || lpad(incident_number::text, 3, '0')) stored,

  incident_date     date not null,
  incident_time     time,
  location          text not null,

  type              text not null default 'near_miss'
                      check (type in (
                        'near_miss','first_aid','medical_treatment','lost_time',
                        'fatality','property_damage','environmental','other'
                      )),
  severity          text not null default 'low'
                      check (severity in ('low','medium','high','critical')),

  title             text not null,
  description       text not null,
  immediate_cause   text,
  root_cause        text,

  injured_person    text,
  injury_type       text,
  body_part_affected text,
  days_lost         integer default 0,

  witnesses         text[],
  corrective_actions text,
  preventive_actions text,

  reported_to_pip   boolean not null default false,   -- Państwowa Inspekcja Pracy
  pip_report_date   date,
  pip_case_number   text,

  status            text not null default 'open'
                      check (status in ('open','investigating','closed','reported')),

  closed_at         timestamptz,
  investigation_completed boolean not null default false,
  notes             text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_incidents_project on public.incidents(project_id, incident_date desc);
create index if not exists idx_incidents_org on public.incidents(org_id, severity, status);
alter table public.incidents enable row level security;
create policy "incidents_org" on public.incidents for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- -------------------------------------------------------
-- 2. JOB COSTING — Koszty na zadanie (WBS / Cost Breakdown)
-- -------------------------------------------------------
create table if not exists public.job_cost_items (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  wbs_code        text,          -- Work Breakdown Structure code e.g. '1.2.3'
  name            text not null,
  description     text,
  category        text not null default 'labor'
                    check (category in ('labor','materials','equipment','subcontract','overhead','contingency','other')),

  unit            text,
  quantity_planned numeric(12,3),
  unit_cost_planned numeric(14,2),
  planned_total    numeric(14,2) generated always as
                    (quantity_planned * unit_cost_planned) stored,

  quantity_actual  numeric(12,3) default 0,
  unit_cost_actual numeric(14,2),
  actual_total     numeric(14,2) generated always as
                    (quantity_actual * unit_cost_actual) stored,

  percent_complete numeric(5,2) default 0
                    check (percent_complete >= 0 and percent_complete <= 100),

  variance        numeric(14,2) generated always as
                    ((quantity_planned * unit_cost_planned) -
                     (quantity_actual * coalesce(unit_cost_actual, unit_cost_planned))) stored,

  parent_id       uuid references public.job_cost_items(id) on delete set null,
  position        integer not null default 0,
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_job_cost_project on public.job_cost_items(project_id, category, wbs_code);
alter table public.job_cost_items enable row level security;
create policy "job_cost_org" on public.job_cost_items for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- -------------------------------------------------------
-- 3. INVOICES — Faktury przychodzące i wychodzące
-- -------------------------------------------------------
create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  invoice_number  text not null,
  direction       text not null default 'outgoing'
                    check (direction in ('incoming','outgoing')),
  type            text not null default 'vat'
                    check (type in ('vat','proforma','advance','correction','note','other')),

  counterparty    text not null,    -- client or supplier name
  nip             text,             -- VAT number (NIP)

  issue_date      date not null,
  sale_date       date,
  due_date        date,
  paid_date       date,

  net_amount      numeric(14,2) not null,
  vat_rate        numeric(5,2) not null default 23,
  vat_amount      numeric(14,2) generated always as
                    (net_amount * vat_rate / 100) stored,
  gross_amount    numeric(14,2) generated always as
                    (net_amount + net_amount * vat_rate / 100) stored,

  currency        text not null default 'PLN',
  status          text not null default 'unpaid'
                    check (status in ('draft','sent','unpaid','partially_paid','paid','overdue','cancelled')),

  ksef_reference  text,           -- KSeF integration reference
  payment_method  text default 'transfer'
                    check (payment_method in ('transfer','cash','card','barter','other')),
  bank_account    text,
  description     text,
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_invoices_org on public.invoices(org_id, direction, status, due_date);
create index if not exists idx_invoices_project on public.invoices(project_id, direction);
alter table public.invoices enable row level security;
create policy "invoice_org" on public.invoices for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));


-- ==================================================
-- 0023_cashflow_calendar_pdf.sql
-- ==================================================
-- ============================================================
-- MIGRATION 0023 — Cash Flow, Calendar Events, PDF Reports, Investor Messages
-- matadora.business — Phase 19
-- ============================================================

-- -------------------------------------------------------
-- 1. CASH FLOW — Prognoza przepływów pieniężnych
-- -------------------------------------------------------
create table if not exists public.cashflow_entries (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  period_year     integer not null,
  period_month    integer not null check (period_month between 1 and 12),

  type            text not null default 'inflow'
                    check (type in ('inflow','outflow')),
  category        text not null default 'other'
                    check (category in (
                      'invoice_income','advance_income','retention_release',
                      'subcontractor_payment','material_payment','labor_payment',
                      'equipment_payment','overhead','tax','loan','other'
                    )),

  description     text not null,
  planned_amount  numeric(14,2) not null default 0,
  actual_amount   numeric(14,2),
  is_confirmed    boolean not null default false,

  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_cashflow_org_period on public.cashflow_entries(org_id, period_year, period_month);
create index if not exists idx_cashflow_project on public.cashflow_entries(project_id, period_year, period_month);
alter table public.cashflow_entries enable row level security;
create policy "cashflow_org" on public.cashflow_entries for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- -------------------------------------------------------
-- 2. CALENDAR EVENTS — Zdarzenia projektu w kalendarzu
-- -------------------------------------------------------
create table if not exists public.calendar_events (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  title           text not null,
  description     text,
  type            text not null default 'task'
                    check (type in (
                      'task','milestone','meeting','inspection','delivery',
                      'deadline','holiday','other'
                    )),
  color           text default '#3b82f6',

  start_date      date not null,
  end_date        date,
  all_day         boolean not null default true,
  start_time      time,
  end_time        time,

  assignee_name   text,
  location        text,
  status          text not null default 'planned'
                    check (status in ('planned','in_progress','completed','cancelled')),
  priority        text not null default 'medium'
                    check (priority in ('low','medium','high','critical')),

  recurrence      text,     -- 'weekly', 'monthly', etc.
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_calendar_project on public.calendar_events(project_id, start_date);
create index if not exists idx_calendar_org on public.calendar_events(org_id, start_date);
alter table public.calendar_events enable row level security;
create policy "calendar_org" on public.calendar_events for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- -------------------------------------------------------
-- 3. INVESTOR MESSAGES — Wiadomości portal inwestora
-- -------------------------------------------------------
create table if not exists public.investor_messages (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  sender_id       uuid references public.profiles(id) on delete set null,

  direction       text not null default 'contractor_to_investor'
                    check (direction in ('contractor_to_investor','investor_to_contractor')),
  subject         text not null,
  body            text not null,
  is_read         boolean not null default false,
  read_at         timestamptz,
  reply_to        uuid references public.investor_messages(id) on delete set null,

  created_at      timestamptz not null default now()
);

create index if not exists idx_investor_msg_project on public.investor_messages(project_id, created_at desc);
alter table public.investor_messages enable row level security;
create policy "investor_msg_org" on public.investor_messages for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- -------------------------------------------------------
-- 4. INVESTOR APPROVALS — Zatwierdzenia dokumentów przez inwestora
-- -------------------------------------------------------
create table if not exists public.investor_approvals (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  requested_by    uuid references public.profiles(id) on delete set null,

  title           text not null,
  description     text,
  document_type   text not null default 'other'
                    check (document_type in (
                      'drawing','submittal','invoice','change_order',
                      'schedule','contract','report','other'
                    )),
  file_url        text,
  deadline        date,

  status          text not null default 'pending'
                    check (status in ('pending','approved','rejected','revision_requested')),

  reviewer_name   text,
  review_notes    text,
  reviewed_at     timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_investor_approvals_project on public.investor_approvals(project_id, status, created_at desc);
alter table public.investor_approvals enable row level security;
create policy "investor_approvals_org" on public.investor_approvals for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));


-- ==================================================
-- 0024_pricebook_evm_drawings.sql
-- ==================================================
-- ============================================================
-- MIGRATION 0024 — Pricebook, EVM Snapshots, Project Drawings
-- matadora.business — Phase 20
-- ============================================================

-- -------------------------------------------------------
-- 1. PRICEBOOK — Cennik usług i materiałów
-- -------------------------------------------------------
create table if not exists public.pricebook_items (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  code            text,
  name            text not null,
  description     text,
  category        text not null default 'labor'
                    check (category in ('labor','materials','equipment','subcontract','service','other')),
  unit            text not null default 'szt.',
  unit_price      numeric(14,2) not null,
  currency        text not null default 'PLN',
  vat_rate        numeric(5,2) not null default 23,

  -- KNR / KNNR norms (Polish construction pricing standards)
  knr_code        text,
  knr_description text,

  is_active       boolean not null default true,
  tags            text[],
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_pricebook_org on public.pricebook_items(org_id, category, is_active);
create index if not exists idx_pricebook_search on public.pricebook_items using gin(to_tsvector('simple', name));
alter table public.pricebook_items enable row level security;
create policy "pricebook_org" on public.pricebook_items for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- -------------------------------------------------------
-- 2. EVM SNAPSHOTS — Earned Value Management (tygodniowe/miesięczne snapshoty)
-- -------------------------------------------------------
create table if not exists public.evm_snapshots (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  snapshot_date   date not null,
  period_label    text,  -- np. "Tydzień 22", "Maj 2025"

  -- Core EVM metrics
  bac             numeric(14,2) not null,  -- Budget at Completion
  pv              numeric(14,2) not null,  -- Planned Value (BCWS)
  ev              numeric(14,2) not null,  -- Earned Value (BCWP)
  ac              numeric(14,2) not null,  -- Actual Cost (ACWP)

  -- Derived (stored for historical charts)
  sv              numeric(14,2) generated always as (ev - pv) stored,         -- Schedule Variance
  cv              numeric(14,2) generated always as (ev - ac) stored,         -- Cost Variance
  spi             numeric(8,4) generated always as
                    (case when pv = 0 then null else round(ev / pv, 4) end) stored,    -- Schedule Performance Index
  cpi             numeric(8,4) generated always as
                    (case when ac = 0 then null else round(ev / ac, 4) end) stored,    -- Cost Performance Index
  etc             numeric(14,2) generated always as
                    (case when ev = 0 then bac - ev
                     else round((bac - ev) / (ev / ac), 2) end) stored,               -- Estimate to Complete
  eac             numeric(14,2) generated always as
                    (case when ev = 0 then bac
                     else ac + (case when ev = 0 then bac - ev
                                else round((bac - ev) / (ev / ac), 2) end) end) stored, -- Estimate at Completion
  percent_complete numeric(5,2) generated always as
                    (case when bac = 0 then 0
                     else round((ev / bac) * 100, 2) end) stored,

  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_evm_project on public.evm_snapshots(project_id, snapshot_date desc);
alter table public.evm_snapshots enable row level security;
create policy "evm_org" on public.evm_snapshots for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- -------------------------------------------------------
-- 3. PROJECT DRAWINGS — Rejestr rysunków i planów
-- -------------------------------------------------------
create table if not exists public.project_drawings (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  uploaded_by     uuid references public.profiles(id) on delete set null,

  drawing_number  text not null,
  title           text not null,
  description     text,
  discipline      text not null default 'architecture'
                    check (discipline in (
                      'architecture','structure','mep','electrical','plumbing',
                      'hvac','civil','landscape','fire','other'
                    )),
  sheet_size      text,
  revision        text not null default 'A',
  revision_date   date,
  status          text not null default 'issued'
                    check (status in ('draft','for_review','issued','superseded','void')),

  file_url        text,
  file_name       text,
  file_size_bytes bigint,

  scale           text,
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_drawings_project on public.project_drawings(project_id, discipline, status);
alter table public.project_drawings enable row level security;
create policy "drawings_org" on public.project_drawings for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));


-- ==================================================
-- 0025_boq_budget_forecast.sql
-- ==================================================
-- ============================================================
-- MIGRATION 0025 — Przedmiar robót (BoQ) + Budget Forecast
-- matadora.business — Phase 21
-- ============================================================

-- -------------------------------------------------------
-- 1. PRZEDMIAR ROBÓT — Bill of Quantities
-- -------------------------------------------------------
create table if not exists public.boq_documents (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  title           text not null,
  description     text,
  version         text not null default '1.0',
  status          text not null default 'draft'
                    check (status in ('draft', 'approved', 'locked', 'superseded')),
  currency        text not null default 'PLN',
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_boq_docs_project on public.boq_documents(project_id, status);
alter table public.boq_documents enable row level security;
create policy "boq_docs_org" on public.boq_documents for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- -------------------------------------------------------
-- 2. POZYCJE PRZEDMIARU
-- -------------------------------------------------------
create table if not exists public.boq_items (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid references public.boq_documents(id) on delete cascade not null,
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  pricebook_item_id uuid references public.pricebook_items(id) on delete set null,

  -- Pozycja w dokumencie
  position_no     text not null,           -- np. "1.1", "2.3.a"
  section         text,                    -- np. "ROBOTY ZIEMNE", "MURARSTWO"
  subsection      text,

  -- Opis pozycji
  description     text not null,           -- Opis roboty
  knr_code        text,                    -- np. KNR 2-02 0101-00
  category        text not null default 'labor'
                    check (category in ('labor','materials','equipment','subcontract','other')),

  -- Obmiar
  unit            text not null,           -- m², m³, szt., t, m.b.
  quantity        numeric(14,4) not null,  -- Ilość
  unit_price      numeric(14,2) not null,  -- Cena jedn. netto
  vat_rate        numeric(5,2) not null default 23,

  -- Pochodne (obliczane)
  total_net       numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  total_vat       numeric(14,2) generated always as (round(quantity * unit_price * vat_rate / 100, 2)) stored,
  total_gross     numeric(14,2) generated always as (round(quantity * unit_price * (1 + vat_rate / 100), 2)) stored,

  -- Obmiar szczegółowy (np. A*B*C = wynik)
  quantity_formula text,

  sort_order      int not null default 0,
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_boq_items_doc on public.boq_items(document_id, sort_order);
create index if not exists idx_boq_items_project on public.boq_items(project_id, section);
alter table public.boq_items enable row level security;
create policy "boq_items_org" on public.boq_items for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- -------------------------------------------------------
-- 3. BUDGET FORECAST ENTRIES — miesięczna prognoza
-- -------------------------------------------------------
create table if not exists public.budget_forecast_entries (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  year            int not null,
  month           int not null check (month between 1 and 12),
  category        text not null default 'other'
                    check (category in ('labor','materials','equipment','subcontract','overhead','revenue','other')),

  planned_cost    numeric(14,2) not null default 0,
  actual_cost     numeric(14,2),
  planned_revenue numeric(14,2),
  actual_revenue  numeric(14,2),

  confidence      int check (confidence between 1 and 100),  -- % pewności prognozy
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (project_id, year, month, category)
);

create index if not exists idx_budget_forecast_project on public.budget_forecast_entries(project_id, year, month);
alter table public.budget_forecast_entries enable row level security;
create policy "budget_forecast_org" on public.budget_forecast_entries for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));


