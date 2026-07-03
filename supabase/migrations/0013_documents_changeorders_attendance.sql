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
