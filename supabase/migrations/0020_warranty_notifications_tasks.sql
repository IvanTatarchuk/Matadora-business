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
