-- =============================================================================
-- BuildMate — Offer ↔ Materials linkage
-- Adds offer_materials so an offer can reference wholesaler catalog products.
-- When an offer is accepted, orders are generated per wholesaler from these rows.
-- =============================================================================

create table if not exists public.offer_materials (
  id           uuid primary key default gen_random_uuid(),
  offer_id     uuid not null references public.offers (id) on delete cascade,
  material_id  uuid not null references public.materials_catalog (id) on delete restrict,
  quantity     numeric(12,2) not null default 1,
  price_net    numeric(12,2) not null default 0,  -- price snapshot at offer time
  created_at   timestamptz not null default now()
);

create index if not exists offer_materials_offer_id_idx on public.offer_materials (offer_id);
create index if not exists offer_materials_material_id_idx on public.offer_materials (material_id);

-- Prevent the same material being added twice to one offer.
create unique index if not exists offer_materials_offer_material_uniq
  on public.offer_materials (offer_id, material_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.offer_materials enable row level security;

-- SELECT: offer parties (contractor of the offer, investor of the project) and
-- the wholesaler that owns the referenced material.
drop policy if exists "offer_materials_select_party" on public.offer_materials;
create policy "offer_materials_select_party"
  on public.offer_materials for select
  using (
    exists (
      select 1 from public.offers o
      join public.projects p on p.id = o.project_id
      where o.id = offer_materials.offer_id
        and (o.contractor_id = auth.uid() or p.investor_id = auth.uid())
    )
    or exists (
      select 1 from public.materials_catalog m
      where m.id = offer_materials.material_id and m.wholesaler_id = auth.uid()
    )
  );

-- WRITE: only the contractor who owns the parent offer.
drop policy if exists "offer_materials_write_contractor" on public.offer_materials;
create policy "offer_materials_write_contractor"
  on public.offer_materials for all
  using (
    exists (
      select 1 from public.offers o
      where o.id = offer_materials.offer_id and o.contractor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.offers o
      where o.id = offer_materials.offer_id and o.contractor_id = auth.uid()
    )
  );
