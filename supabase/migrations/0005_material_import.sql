-- =============================================================================
-- BuildMate — Phase 3: Legal material/price import (CSV)
-- Suppliers (external wholesalers whose price lists are imported by the owner),
-- import job logging, price history, and source columns on materials_catalog.
-- Data is provided by the catalog owner (upload), never scraped.
-- =============================================================================

-- Suppliers ------------------------------------------------------------------
create table if not exists public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  website     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists suppliers_owner_id_idx on public.suppliers (owner_id);

-- Source columns on the catalog ----------------------------------------------
alter table public.materials_catalog
  add column if not exists supplier_id      uuid references public.suppliers (id) on delete set null,
  add column if not exists external_id      text,   -- supplier's own product code
  add column if not exists currency         text not null default 'PLN',
  add column if not exists source           text not null default 'manual', -- manual|csv|api
  add column if not exists price_updated_at timestamptz;

create index if not exists materials_catalog_supplier_id_idx
  on public.materials_catalog (supplier_id);

-- Import jobs (audit) --------------------------------------------------------
create table if not exists public.import_jobs (
  id             uuid primary key default gen_random_uuid(),
  wholesaler_id  uuid not null references public.profiles (id) on delete cascade,
  supplier_id    uuid references public.suppliers (id) on delete set null,
  filename       text,
  total_rows     integer not null default 0,
  created_count  integer not null default 0,
  updated_count  integer not null default 0,
  skipped_count  integer not null default 0,
  status         text not null default 'completed', -- completed|failed
  error          text,
  created_at     timestamptz not null default now()
);

create index if not exists import_jobs_wholesaler_id_idx
  on public.import_jobs (wholesaler_id);

-- Price history --------------------------------------------------------------
create table if not exists public.price_history (
  id             uuid primary key default gen_random_uuid(),
  material_id    uuid not null references public.materials_catalog (id) on delete cascade,
  wholesaler_id  uuid not null references public.profiles (id) on delete cascade,
  price_net      numeric(12,2) not null,
  recorded_at    timestamptz not null default now()
);

create index if not exists price_history_material_id_idx
  on public.price_history (material_id);

-- updated_at trigger for suppliers -------------------------------------------
drop trigger if exists set_updated_at on public.suppliers;
create trigger set_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();

-- =============================================================================
-- RLS — every row is scoped to its owning wholesaler.
-- =============================================================================
alter table public.suppliers     enable row level security;
alter table public.import_jobs   enable row level security;
alter table public.price_history enable row level security;

-- suppliers
drop policy if exists "suppliers_rw_owner" on public.suppliers;
create policy "suppliers_rw_owner"
  on public.suppliers for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- import_jobs
drop policy if exists "import_jobs_rw_owner" on public.import_jobs;
create policy "import_jobs_rw_owner"
  on public.import_jobs for all
  using (auth.uid() = wholesaler_id)
  with check (auth.uid() = wholesaler_id);

-- price_history
drop policy if exists "price_history_rw_owner" on public.price_history;
create policy "price_history_rw_owner"
  on public.price_history for all
  using (auth.uid() = wholesaler_id)
  with check (auth.uid() = wholesaler_id);
