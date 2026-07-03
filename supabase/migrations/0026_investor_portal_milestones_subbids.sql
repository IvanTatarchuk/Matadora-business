-- =============================================================================
-- Matadora — Phase 26: Investor Portal tables, Progress Milestones, Sub Bids
-- =============================================================================

-- ─── Investor Messages ───────────────────────────────────────────────────────
create table if not exists public.investor_messages (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  org_id       uuid not null references public.organizations (id) on delete cascade,
  sender_id    uuid references public.profiles (id) on delete set null,
  direction    text not null check (direction in ('contractor_to_investor', 'investor_to_contractor')),
  subject      text not null,
  body         text not null,
  is_read      boolean not null default false,
  read_at      timestamptz,
  reply_to     uuid references public.investor_messages (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists investor_messages_project_idx on public.investor_messages (project_id);
create index if not exists investor_messages_org_idx     on public.investor_messages (org_id);

alter table public.investor_messages enable row level security;

drop policy if exists "investor_messages_participant" on public.investor_messages;
create policy "investor_messages_participant" on public.investor_messages for all
  to authenticated
  using (is_project_participant(project_id))
  with check (is_project_participant(project_id));

-- ─── Investor Approvals ──────────────────────────────────────────────────────
do $$ begin
  create type public.approval_status as enum ('pending','approved','rejected','revision_requested');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.approval_doc_type as enum
    ('drawing','submittal','invoice','change_order','schedule','contract','report','other');
exception when duplicate_object then null; end $$;

create table if not exists public.investor_approvals (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects (id) on delete cascade,
  org_id         uuid not null references public.organizations (id) on delete cascade,
  requested_by   uuid references public.profiles (id) on delete set null,
  title          text not null,
  description    text,
  document_type  public.approval_doc_type not null default 'other',
  file_url       text,
  deadline       date,
  status         public.approval_status not null default 'pending',
  reviewer_name  text,
  review_notes   text,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists investor_approvals_project_idx on public.investor_approvals (project_id);
create index if not exists investor_approvals_status_idx  on public.investor_approvals (status);

drop trigger if exists set_updated_at on public.investor_approvals;
create trigger set_updated_at before update on public.investor_approvals
  for each row execute function public.set_updated_at();

alter table public.investor_approvals enable row level security;

drop policy if exists "investor_approvals_participant" on public.investor_approvals;
create policy "investor_approvals_participant" on public.investor_approvals for all
  to authenticated
  using (is_project_participant(project_id))
  with check (is_project_participant(project_id));

-- ─── Project Milestones (for Progress Billing) ───────────────────────────────
do $$ begin
  create type public.milestone_status as enum ('planned','in_progress','pending_approval','approved','invoiced');
exception when duplicate_object then null; end $$;

create table if not exists public.project_milestones (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projects (id) on delete cascade,
  org_id           uuid not null references public.organizations (id) on delete cascade,
  title            text not null,
  description      text,
  order_index      integer not null default 0,
  amount_net       numeric(14,2) not null default 0 check (amount_net >= 0),
  vat_rate         integer not null default 23 check (vat_rate in (0,5,8,23)),
  amount_gross     numeric(14,2) generated always as (amount_net * (1 + vat_rate::numeric / 100)) stored,
  planned_date     date,
  completed_date   date,
  status           public.milestone_status not null default 'planned',
  approved_by      uuid references public.profiles (id) on delete set null,
  approved_at      timestamptz,
  invoice_id       uuid references public.invoices (id) on delete set null,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists project_milestones_project_idx on public.project_milestones (project_id);

drop trigger if exists set_updated_at on public.project_milestones;
create trigger set_updated_at before update on public.project_milestones
  for each row execute function public.set_updated_at();

alter table public.project_milestones enable row level security;

drop policy if exists "project_milestones_rw" on public.project_milestones;
create policy "project_milestones_rw" on public.project_milestones for all
  to authenticated
  using (is_project_participant(project_id))
  with check (is_project_participant(project_id));

-- ─── Sub Bids (subcontractor bid responses to RFQs) ─────────────────────────
do $$ begin
  create type public.sub_bid_status as enum ('draft','submitted','shortlisted','accepted','rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.sub_bids (
  id              uuid primary key default gen_random_uuid(),
  rfq_id          uuid not null references public.rfqs (id) on delete cascade,
  project_id      uuid not null references public.projects (id) on delete cascade,
  org_id          uuid not null references public.organizations (id) on delete cascade,
  subcontractor_id uuid references public.subcontractors (id) on delete cascade,
  bidder_name     text not null,
  bidder_nip      text,
  bidder_email    text,
  bidder_phone    text,
  amount_net      numeric(14,2) not null check (amount_net >= 0),
  vat_rate        integer not null default 23,
  amount_gross    numeric(14,2) generated always as (amount_net * (1 + vat_rate::numeric / 100)) stored,
  completion_days integer,
  notes           text,
  file_url        text,
  status          public.sub_bid_status not null default 'submitted',
  submitted_at    timestamptz not null default now(),
  reviewed_at     timestamptz,
  review_notes    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists sub_bids_rfq_idx     on public.sub_bids (rfq_id);
create index if not exists sub_bids_project_idx on public.sub_bids (project_id);

drop trigger if exists set_updated_at on public.sub_bids;
create trigger set_updated_at before update on public.sub_bids
  for each row execute function public.set_updated_at();

alter table public.sub_bids enable row level security;

drop policy if exists "sub_bids_org" on public.sub_bids;
create policy "sub_bids_org" on public.sub_bids for all
  to authenticated
  using (
    org_id in (
      select org_id from public.organization_members where user_id = auth.uid()
    )
  )
  with check (
    org_id in (
      select org_id from public.organization_members where user_id = auth.uid()
    )
  );
