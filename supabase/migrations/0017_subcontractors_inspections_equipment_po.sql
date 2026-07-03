-- ============================================================
-- Migration 0017: Subcontractors, Inspections, Equipment, Purchase Orders, CRM
-- Wzorowane na: Procore, Archdesk, PlanRadar, Fieldwire, Buildertrend
-- ============================================================

-- ============================================================
-- SUBCONTRACTORS (Podwykonawcy)
-- ============================================================
create table if not exists public.subcontractors (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references public.organizations(id) on delete cascade not null,
  name            text not null,
  nip             text,
  regon           text,
  address         text,
  city            text,
  postal_code     text,
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  website         text,
  specialty       text not null default 'general'
                    check (specialty in (
                      'general', 'electrical', 'plumbing', 'hvac', 'roofing',
                      'flooring', 'painting', 'insulation', 'concrete', 'steel',
                      'windows', 'landscaping', 'demolition', 'excavation', 'other'
                    )),
  rating          numeric(3,2) check (rating >= 0 and rating <= 5),
  status          text not null default 'active'
                    check (status in ('active', 'inactive', 'blacklisted')),
  notes           text,
  insurance_expiry date,
  license_number  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.subcontractor_contracts (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid references public.projects(id) on delete cascade not null,
  subcontractor_id    uuid references public.subcontractors(id) on delete cascade not null,
  org_id              uuid references public.organizations(id) on delete cascade not null,
  contract_number     text,
  scope_description   text not null,
  start_date          date,
  end_date            date,
  contract_value      numeric(14,2) not null default 0,
  paid_to_date        numeric(14,2) not null default 0,
  retention_percent   numeric(5,2) not null default 10,
  status              text not null default 'draft'
                        check (status in ('draft','active','completed','terminated')),
  notes               text,
  created_at          timestamptz not null default now()
);

create index if not exists idx_subs_org on public.subcontractors(org_id, status);
create index if not exists idx_sub_contracts_project on public.subcontractor_contracts(project_id);

alter table public.subcontractors enable row level security;
alter table public.subcontractor_contracts enable row level security;

create policy "subs_org_full" on public.subcontractors for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

create policy "sub_contracts_org_full" on public.subcontractor_contracts for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- ============================================================
-- INSPECTIONS / QC (Inspekcje / Kontrola jakości)
-- Wzorowane na: PlanRadar, Fieldwire, Finalcad
-- ============================================================
create table if not exists public.inspection_templates (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references public.organizations(id) on delete cascade not null,
  name            text not null,
  category        text not null default 'quality'
                    check (category in (
                      'quality',     -- Kontrola jakości
                      'safety',      -- BHP
                      'handover',    -- Odbiór
                      'maintenance', -- Przegląd
                      'environment', -- Środowisko
                      'regulatory',  -- Wymogi prawne
                      'custom'       -- Własny
                    )),
  items           jsonb not null default '[]',
  -- [{id, question, required, type: "pass_fail"|"yes_no"|"text"|"number"|"photo"}]
  is_global       boolean not null default false,
  created_at      timestamptz not null default now()
);

create table if not exists public.inspections (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid references public.projects(id) on delete cascade not null,
  org_id              uuid references public.organizations(id) on delete cascade not null,
  template_id         uuid references public.inspection_templates(id) on delete set null,
  created_by          uuid references public.profiles(id) on delete set null,

  number              integer not null,
  number_display      text generated always as ('INS-' || lpad(number::text, 3, '0')) stored,

  title               text not null,
  category            text not null default 'quality',
  inspection_date     date not null default current_date,
  inspector_name      text,
  location_note       text,

  status              text not null default 'draft'
                        check (status in ('draft','in_progress','passed','failed','conditional')),

  -- Items: [{id, question, result: pass|fail|observation|na, value, notes, photo_url}]
  items               jsonb not null default '[]',

  overall_result      text check (overall_result in ('pass','fail','conditional','na')),
  defects_count       integer not null default 0,
  observations_count  integer not null default 0,

  notes               text,
  corrective_actions  text,
  follow_up_date      date,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (project_id, number)
);

create index if not exists idx_inspections_project on public.inspections(project_id, status);

alter table public.inspection_templates enable row level security;
alter table public.inspections enable row level security;

create policy "insp_templates_org" on public.inspection_templates for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid())
         or is_global = true);

create policy "inspections_org_full" on public.inspections for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- ============================================================
-- EQUIPMENT (Sprzęt i maszyny)
-- Wzorowane na: Procore, Archdesk, HCSS, Viewpoint
-- ============================================================
create table if not exists public.equipment (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references public.organizations(id) on delete cascade not null,
  name            text not null,
  category        text not null default 'other'
                    check (category in (
                      'excavator',     -- Koparka
                      'crane',         -- Dźwig
                      'concrete_mixer',-- Betoniarka / mieszalnik
                      'forklift',      -- Wózek widłowy
                      'scaffold',      -- Rusztowanie
                      'compressor',    -- Sprężarka
                      'generator',     -- Generator
                      'pump',          -- Pompa
                      'vehicle',       -- Pojazd
                      'hand_tool',     -- Narzędzie ręczne
                      'measurement',   -- Sprzęt pomiarowy
                      'safety',        -- Sprzęt BHP
                      'other'
                    )),
  brand           text,
  model           text,
  serial_number   text,
  year            integer,
  purchase_price  numeric(14,2),
  daily_rate      numeric(10,2),    -- stawka dzienna wynajmu / amortyzacja
  status          text not null default 'available'
                    check (status in (
                      'available',   -- Dostępny
                      'in_use',      -- W użyciu
                      'maintenance', -- Serwis / naprawa
                      'retired'      -- Wycofany
                    )),
  location        text,
  next_service_date date,
  insurance_expiry date,
  notes           text,
  created_at      timestamptz not null default now()
);

create table if not exists public.equipment_assignments (
  id              uuid primary key default gen_random_uuid(),
  equipment_id    uuid references public.equipment(id) on delete cascade not null,
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  assigned_date   date not null default current_date,
  returned_date   date,
  days_used       integer,
  cost            numeric(12,2),
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_equipment_org on public.equipment(org_id, status);
create index if not exists idx_eq_assign_project on public.equipment_assignments(project_id);

alter table public.equipment enable row level security;
alter table public.equipment_assignments enable row level security;

create policy "equipment_org_full" on public.equipment for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

create policy "eq_assign_org_full" on public.equipment_assignments for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- ============================================================
-- PURCHASE ORDERS (Zamówienia zakupu)
-- Wzorowane na: Archdesk, Procore, Buildertrend
-- ============================================================
create table if not exists public.purchase_orders (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  number          integer not null,
  number_display  text generated always as ('ZAM-' || lpad(number::text, 4, '0')) stored,

  supplier_name   text not null,
  supplier_nip    text,
  supplier_contact text,

  order_date      date not null default current_date,
  expected_delivery date,
  actual_delivery date,

  status          text not null default 'draft'
                    check (status in (
                      'draft',      -- Szkic
                      'sent',       -- Wysłane do dostawcy
                      'confirmed',  -- Potwierdzone
                      'partial',    -- Częściowa dostawa
                      'delivered',  -- Dostarczone
                      'invoiced',   -- Zafakturowane
                      'cancelled'   -- Anulowane
                    )),

  -- Financial
  net_total       numeric(14,2) not null default 0,
  vat_total       numeric(14,2) not null default 0,
  gross_total     numeric(14,2) not null default 0,
  paid_amount     numeric(14,2) not null default 0,

  payment_terms   text,  -- np. "30 dni", "przelew 14 dni"
  delivery_address text,
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (project_id, number)
);

create table if not exists public.purchase_order_items (
  id              uuid primary key default gen_random_uuid(),
  po_id           uuid references public.purchase_orders(id) on delete cascade not null,
  sort_order      integer not null default 0,
  description     text not null,
  unit            text not null default 'szt',
  quantity        numeric(12,3) not null default 1,
  unit_price      numeric(12,2) not null default 0,
  vat_rate        numeric(5,2) not null default 23,
  net_amount      numeric(14,2) generated always as (quantity * unit_price) stored,
  gross_amount    numeric(14,2) generated always as (quantity * unit_price * (1 + vat_rate/100)) stored,
  delivered_qty   numeric(12,3) not null default 0,
  notes           text
);

create index if not exists idx_po_project on public.purchase_orders(project_id, status);
create index if not exists idx_po_items on public.purchase_order_items(po_id, sort_order);

alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;

create policy "po_org_full" on public.purchase_orders for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

create policy "po_items_via_po" on public.purchase_order_items for all
  using (po_id in (
    select p.id from public.purchase_orders p
    join public.organization_members om on om.org_id = p.org_id
    where om.user_id = auth.uid()
  ));

-- ============================================================
-- CRM — LEADS (Leady sprzedażowe)
-- Wzorowane na: Archdesk, CoConstruct, JobNimbus, Cosential
-- ============================================================
create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  -- Client info
  client_name     text not null,
  client_company  text,
  client_email    text,
  client_phone    text,
  client_nip      text,

  -- Project info
  title           text not null,
  description     text,
  address         text,
  city            text,

  -- Pipeline stage (Kanban)
  stage           text not null default 'prospect'
                    check (stage in (
                      'prospect',     -- Potencjalny klient
                      'contact',      -- Kontakt nawiązany
                      'site_visit',   -- Wizja lokalna
                      'offer_sent',   -- Oferta wysłana
                      'negotiation',  -- Negocjacje
                      'won',          -- Wygrany
                      'lost',         -- Przegrany / zrezygnował
                      'on_hold'       -- Wstrzymany
                    )),

  -- Value estimation
  estimated_value numeric(14,2),
  win_probability integer default 50 check (win_probability between 0 and 100),

  -- Source
  source          text default 'referral'
                    check (source in (
                      'referral',      -- Polecenie
                      'przetarg',      -- Przetarg BZP
                      'website',       -- Strona www
                      'social',        -- Media społecznościowe
                      'cold_call',     -- Zimny kontakt
                      'repeat_client', -- Stały klient
                      'other'
                    )),

  -- Dates
  first_contact_date date default current_date,
  expected_start_date date,
  expected_close_date date,
  won_at          timestamptz,
  lost_at         timestamptz,
  lost_reason     text,

  -- Converted to project
  project_id      uuid references public.projects(id) on delete set null,

  priority        text default 'medium' check (priority in ('low','medium','high')),
  assigned_to     uuid references public.profiles(id) on delete set null,
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.lead_activities (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid references public.leads(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,
  activity_type   text not null check (activity_type in (
    'note', 'call', 'email', 'meeting', 'site_visit', 'offer', 'follow_up', 'stage_change'
  )),
  title           text not null,
  description     text,
  activity_date   timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists idx_leads_org on public.leads(org_id, stage);
create index if not exists idx_lead_activities on public.lead_activities(lead_id, activity_date desc);

alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;

create policy "leads_org_full" on public.leads for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

create policy "lead_activities_org" on public.lead_activities for all
  using (lead_id in (
    select l.id from public.leads l
    join public.organization_members om on om.org_id = l.org_id
    where om.user_id = auth.uid()
  ));

-- ============================================================
-- WORKER CERTIFICATIONS (Kwalifikacje / Uprawnienia)
-- Wzorowane na: Assignar, Procore Workforce
-- ============================================================
create table if not exists public.worker_certifications (
  id              uuid primary key default gen_random_uuid(),
  worker_id       uuid references public.workers(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  cert_type       text not null check (cert_type in (
    'bhp_general',       -- Szkolenie BHP ogólne
    'bhp_work',          -- Szkolenie BHP stanowiskowe
    'udt_operator',      -- Uprawnienia UDT
    'electrical_e',      -- Uprawnienia elektryczne E (eksploatacja)
    'electrical_d',      -- Uprawnienia elektryczne D (dozór)
    'high_work',         -- Praca na wysokości
    'forklift',          -- Wózek widłowy
    'crane',             -- Dźwig
    'welding',           -- Spawanie (np. PREN)
    'driving_cat_b',     -- Prawo jazdy kat. B
    'driving_cat_c',     -- Prawo jazdy kat. C
    'driving_cat_ce',    -- Prawo jazdy kat. CE
    'first_aid',         -- Pierwsza pomoc
    'asbestos',          -- Usuwanie azbestu
    'scaffolding',       -- Rusztowania
    'blasting',          -- Roboty strzałowe
    'gas_installation',  -- Instalacje gazowe
    'other'
  )),
  cert_name       text not null,          -- pełna nazwa uprawnienia
  cert_number     text,                   -- numer dokumentu
  issuing_body    text,                   -- organ wydający (UDT, SEP, itp.)
  issued_date     date,
  expiry_date     date,
  is_permanent    boolean not null default false,
  file_url        text,                   -- skan dokumentu
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_worker_certs_worker on public.worker_certifications(worker_id);
create index if not exists idx_worker_certs_expiry on public.worker_certifications(expiry_date, org_id)
  where expiry_date is not null and is_permanent = false;

alter table public.worker_certifications enable row level security;

create policy "worker_certs_org_full" on public.worker_certifications for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- ============================================================
-- Tracking
-- ============================================================
insert into public.schema_migrations (version, applied_at)
values
  ('0017_subcontractors', now()),
  ('0017_inspections', now()),
  ('0017_equipment', now()),
  ('0017_purchase_orders', now()),
  ('0017_crm_leads', now()),
  ('0017_worker_certs', now())
on conflict (version) do nothing;
