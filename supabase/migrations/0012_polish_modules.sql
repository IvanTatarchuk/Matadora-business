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
