-- =============================================================================
-- BuildMate ConTech Platform — Initial Schema
-- Connects Investors, Contractors, and Building Material Wholesalers.
-- PostgreSQL / Supabase. Row Level Security (RLS) enabled on all tables.
-- =============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Enums -----------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('investor', 'contractor', 'wholesaler');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_status as enum ('draft', 'open', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type offer_status as enum ('draft', 'sent', 'accepted', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type stock_status as enum ('in_stock', 'low_stock', 'out_of_stock', 'on_order');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- profiles — extends auth.users with role + company metadata
-- =============================================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  role          user_role not null default 'investor',
  full_name     text,
  company_name  text,
  phone         text,
  city          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- =============================================================================
-- projects — owned by an investor, optionally assigned to a contractor
-- =============================================================================
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  investor_id   uuid not null references public.profiles (id) on delete cascade,
  contractor_id uuid references public.profiles (id) on delete set null,
  title         text not null,
  address       text,
  surface_area  numeric(10,2),          -- m²
  status        project_status not null default 'draft',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- =============================================================================
-- offers — a contractor's estimate for a project
-- =============================================================================
create table if not exists public.offers (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  contractor_id uuid not null references public.profiles (id) on delete cascade,
  title         text not null,
  total_net     numeric(12,2) not null default 0,
  total_gross   numeric(12,2) not null default 0,
  vat_rate      numeric(5,2)  not null default 23,   -- 8 or 23 in PL
  status        offer_status  not null default 'draft',
  public_token  uuid not null default gen_random_uuid(),  -- shareable link for investor
  sent_at       timestamptz,
  accepted_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists offers_project_id_idx on public.offers (project_id);
create index if not exists offers_public_token_idx on public.offers (public_token);

-- =============================================================================
-- offer_stages — line items grouped into estimate stages
-- (Logistics, Demolition, Material, Labor, Taxes ...)
-- =============================================================================
create table if not exists public.offer_stages (
  id           uuid primary key default gen_random_uuid(),
  offer_id     uuid not null references public.offers (id) on delete cascade,
  stage_name   text not null,
  description  text,
  cost         numeric(12,2) not null default 0,
  order_index  integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists offer_stages_offer_id_idx on public.offer_stages (offer_id);

-- =============================================================================
-- materials_catalog — products supplied by wholesalers
-- =============================================================================
create table if not exists public.materials_catalog (
  id            uuid primary key default gen_random_uuid(),
  wholesaler_id uuid not null references public.profiles (id) on delete cascade,
  product_name  text not null,
  sku           text,
  price_net     numeric(12,2) not null default 0,
  unit          text not null default 'szt',   -- szt, m2, m3, kg, t, ...
  stock_status  stock_status not null default 'in_stock',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists materials_catalog_wholesaler_id_idx on public.materials_catalog (wholesaler_id);

-- =============================================================================
-- orders — generated for a wholesaler when an offer is accepted
-- =============================================================================
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  offer_id      uuid not null references public.offers (id) on delete cascade,
  wholesaler_id uuid not null references public.profiles (id) on delete cascade,
  status        order_status not null default 'pending',
  total_amount  numeric(12,2) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists orders_offer_id_idx on public.orders (offer_id);
create index if not exists orders_wholesaler_id_idx on public.orders (wholesaler_id);

-- =============================================================================
-- Helper: current user's role (SECURITY DEFINER avoids RLS recursion)
-- =============================================================================
create or replace function public.current_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- =============================================================================
-- updated_at trigger
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','projects','offers','materials_catalog','orders']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- =============================================================================
-- Auto-create a profile row on signup (role taken from user metadata)
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, company_name, phone, city)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'investor'),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company_name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'city'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================
alter table public.profiles          enable row level security;
alter table public.projects          enable row level security;
alter table public.offers            enable row level security;
alter table public.offer_stages      enable row level security;
alter table public.materials_catalog enable row level security;
alter table public.orders            enable row level security;

-- ---------------------------------------------------------------------------
-- profiles policies
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Allow reading basic profile info of counterparties you share a project with
drop policy if exists "profiles_select_related" on public.profiles;
create policy "profiles_select_related"
  on public.profiles for select
  using (
    exists (
      select 1 from public.projects p
      where (p.investor_id = auth.uid() and p.contractor_id = profiles.id)
         or (p.contractor_id = auth.uid() and p.investor_id = profiles.id)
    )
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- projects policies — investor owns; assigned contractor can read/update
-- ---------------------------------------------------------------------------
drop policy if exists "projects_select_party" on public.projects;
create policy "projects_select_party"
  on public.projects for select
  using (auth.uid() = investor_id or auth.uid() = contractor_id);

-- Either the investor (owner) or an assigned contractor may create a project.
drop policy if exists "projects_insert_party" on public.projects;
create policy "projects_insert_party"
  on public.projects for insert
  with check (auth.uid() = investor_id or auth.uid() = contractor_id);

drop policy if exists "projects_update_party" on public.projects;
create policy "projects_update_party"
  on public.projects for update
  using (auth.uid() = investor_id or auth.uid() = contractor_id)
  with check (auth.uid() = investor_id or auth.uid() = contractor_id);

drop policy if exists "projects_delete_investor" on public.projects;
create policy "projects_delete_investor"
  on public.projects for delete
  using (auth.uid() = investor_id);

-- ---------------------------------------------------------------------------
-- offers policies — contractor owns; investor of the project can read/accept
-- ---------------------------------------------------------------------------
drop policy if exists "offers_select_party" on public.offers;
create policy "offers_select_party"
  on public.offers for select
  using (
    auth.uid() = contractor_id
    or exists (
      select 1 from public.projects p
      where p.id = offers.project_id and p.investor_id = auth.uid()
    )
  );

drop policy if exists "offers_insert_contractor" on public.offers;
create policy "offers_insert_contractor"
  on public.offers for insert
  with check (auth.uid() = contractor_id and public.current_role() = 'contractor');

drop policy if exists "offers_update_party" on public.offers;
create policy "offers_update_party"
  on public.offers for update
  using (
    auth.uid() = contractor_id
    or exists (
      select 1 from public.projects p
      where p.id = offers.project_id and p.investor_id = auth.uid()
    )
  )
  with check (
    auth.uid() = contractor_id
    or exists (
      select 1 from public.projects p
      where p.id = offers.project_id and p.investor_id = auth.uid()
    )
  );

drop policy if exists "offers_delete_contractor" on public.offers;
create policy "offers_delete_contractor"
  on public.offers for delete
  using (auth.uid() = contractor_id);

-- ---------------------------------------------------------------------------
-- offer_stages policies — follow parent offer access
-- ---------------------------------------------------------------------------
drop policy if exists "offer_stages_select_party" on public.offer_stages;
create policy "offer_stages_select_party"
  on public.offer_stages for select
  using (
    exists (
      select 1 from public.offers o
      join public.projects p on p.id = o.project_id
      where o.id = offer_stages.offer_id
        and (o.contractor_id = auth.uid() or p.investor_id = auth.uid())
    )
  );

drop policy if exists "offer_stages_write_contractor" on public.offer_stages;
create policy "offer_stages_write_contractor"
  on public.offer_stages for all
  using (
    exists (
      select 1 from public.offers o
      where o.id = offer_stages.offer_id and o.contractor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.offers o
      where o.id = offer_stages.offer_id and o.contractor_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- materials_catalog policies — wholesaler owns; everyone authenticated can read
-- ---------------------------------------------------------------------------
drop policy if exists "materials_select_all" on public.materials_catalog;
create policy "materials_select_all"
  on public.materials_catalog for select
  using (auth.role() = 'authenticated');

drop policy if exists "materials_write_owner" on public.materials_catalog;
create policy "materials_write_owner"
  on public.materials_catalog for all
  using (auth.uid() = wholesaler_id and public.current_role() = 'wholesaler')
  with check (auth.uid() = wholesaler_id and public.current_role() = 'wholesaler');

-- ---------------------------------------------------------------------------
-- orders policies — wholesaler sees own; contractor of the offer sees own
-- ---------------------------------------------------------------------------
drop policy if exists "orders_select_party" on public.orders;
create policy "orders_select_party"
  on public.orders for select
  using (
    auth.uid() = wholesaler_id
    or exists (
      select 1 from public.offers o
      where o.id = orders.offer_id and o.contractor_id = auth.uid()
    )
  );

drop policy if exists "orders_insert_contractor" on public.orders;
create policy "orders_insert_contractor"
  on public.orders for insert
  with check (
    exists (
      select 1 from public.offers o
      where o.id = orders.offer_id and o.contractor_id = auth.uid()
    )
  );

drop policy if exists "orders_update_wholesaler" on public.orders;
create policy "orders_update_wholesaler"
  on public.orders for update
  using (auth.uid() = wholesaler_id)
  with check (auth.uid() = wholesaler_id);
