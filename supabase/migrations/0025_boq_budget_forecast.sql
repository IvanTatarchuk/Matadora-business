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
