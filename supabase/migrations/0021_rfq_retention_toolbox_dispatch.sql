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
