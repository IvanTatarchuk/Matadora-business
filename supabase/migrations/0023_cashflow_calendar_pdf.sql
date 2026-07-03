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
