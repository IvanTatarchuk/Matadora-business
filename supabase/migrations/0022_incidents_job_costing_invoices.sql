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
