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
