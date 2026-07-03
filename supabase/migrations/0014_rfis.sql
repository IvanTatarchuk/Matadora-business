-- ============================================================
-- Migration 0014: RFI (Request for Information / Zapytania techniczne)
-- Wzorowane na: Procore RFI, Aconex, Trimble ProjectSight, Fieldwire
-- ============================================================

create table if not exists public.rfis (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,

  -- Numbering (auto per project)
  number          integer not null,
  number_display  text generated always as ('RFI-' || lpad(number::text, 3, '0')) stored,

  -- Core fields (Procore-style)
  title           text not null,
  question        text not null,
  discipline      text not null default 'general'
                    check (discipline in (
                      'general',
                      'architektura',
                      'konstrukcja',
                      'instalacje_elektryczne',
                      'instalacje_sanitarne',
                      'instalacje_hvac',
                      'geotechnika',
                      'drogi',
                      'kosztorys',
                      'bhp',
                      'inne'
                    )),

  -- Workflow
  priority        text not null default 'normal'
                    check (priority in ('low', 'normal', 'high', 'urgent')),
  status          text not null default 'draft'
                    check (status in (
                      'draft',
                      'open',
                      'answered',
                      'closed',
                      'void'
                    )),

  -- Parties (Procore: originator, assignee, manager)
  created_by      uuid references public.profiles(id) on delete set null,
  assigned_to     uuid references public.profiles(id) on delete set null,
  assigned_to_name text,                          -- external person (no account)

  -- Dates
  date_initiated  date not null default current_date,
  due_date        date,
  answered_at     timestamptz,
  closed_at       timestamptz,

  -- Impact flags (Procore-style)
  cost_impact     boolean not null default false,
  schedule_impact boolean not null default false,
  schedule_days   integer default 0,

  -- Response
  answer          text,
  answered_by     uuid references public.profiles(id) on delete set null,
  answered_by_name text,

  -- Attachments (references to project_documents)
  document_ids    uuid[] default '{}',

  -- Distribution list (emails or user ids)
  distribution    text[] default '{}',

  -- Reference to drawing/location
  drawing_ref     text,
  spec_section    text,
  location_note   text,

  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (project_id, number)
);

create index if not exists idx_rfis_project on public.rfis(project_id, status);
create index if not exists idx_rfis_due on public.rfis(due_date) where status in ('open','draft');
create index if not exists idx_rfis_assigned on public.rfis(assigned_to) where status = 'open';

alter table public.rfis enable row level security;

create policy "rfi_org_member_full"
  on public.rfis for all
  using (
    org_id in (
      select org_id from public.organization_members
      where user_id = auth.uid()
    )
  );

create policy "rfi_investor_read"
  on public.rfis for select
  using (
    project_id in (
      select id from public.projects where investor_id = auth.uid()
    )
  );

-- ============================================================
-- Migration 0015: Meeting Minutes (Notatki ze spotkań)
-- Wzorowane na: Procore Meetings, Archdesk, Trimble, Aconex
-- ============================================================

create table if not exists public.meetings (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  -- Numbering
  number          integer not null,
  number_display  text generated always as ('SPK-' || lpad(number::text, 3, '0')) stored,

  title           text not null,
  meeting_type    text not null default 'site'
                    check (meeting_type in (
                      'site',           -- Narada budowlana
                      'progress',       -- Narada postępu
                      'design',         -- Narada projektowa
                      'safety',         -- Odprawa BHP
                      'kickoff',        -- Spotkanie inauguracyjne
                      'closeout',       -- Spotkanie końcowe
                      'client',         -- Spotkanie z inwestorem
                      'subcontractor',  -- Narada podwykonawców
                      'other'
                    )),

  meeting_date    date not null,
  meeting_time    time,
  location        text,
  duration_min    integer default 60,

  -- Participants (names + external)
  attendees       jsonb not null default '[]', -- [{name, company, role, present}]
  absent          jsonb default '[]',

  -- Content
  agenda          text,
  summary         text,

  -- Status
  status          text not null default 'draft'
                    check (status in ('draft', 'published', 'approved')),
  published_at    timestamptz,

  -- Next meeting
  next_meeting_date date,
  next_meeting_location text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (project_id, number)
);

create table if not exists public.meeting_items (
  id              uuid primary key default gen_random_uuid(),
  meeting_id      uuid references public.meetings(id) on delete cascade not null,
  sort_order      integer not null default 0,

  item_type       text not null default 'topic'
                    check (item_type in (
                      'topic',         -- Temat do omówienia
                      'decision',      -- Podjęta decyzja
                      'action',        -- Działanie do wykonania
                      'issue',         -- Problem / issue
                      'information'    -- Informacja
                    )),

  title           text not null,
  description     text,

  -- For action items
  assigned_to_name text,
  due_date        date,
  status          text default 'open'
                    check (status in ('open', 'in_progress', 'done', 'cancelled')),

  -- Carry-over from previous meeting
  carried_over_from uuid references public.meeting_items(id) on delete set null,

  created_at      timestamptz not null default now()
);

create index if not exists idx_meetings_project on public.meetings(project_id, meeting_date desc);
create index if not exists idx_meeting_items_meeting on public.meeting_items(meeting_id, sort_order);

alter table public.meetings enable row level security;
alter table public.meeting_items enable row level security;

create policy "meeting_org_full"
  on public.meetings for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

create policy "meeting_investor_read"
  on public.meetings for select
  using (project_id in (select id from public.projects where investor_id = auth.uid()));

create policy "meeting_items_via_meeting"
  on public.meeting_items for all
  using (
    meeting_id in (
      select m.id from public.meetings m
      join public.organization_members om on om.org_id = m.org_id
      where om.user_id = auth.uid()
    )
  );

-- ============================================================
-- Migration 0016: Risk Register (Rejestr ryzyk)
-- Wzorowane na: Archdesk, Procore, InEight, Oracle Primavera Risk
-- ============================================================

create table if not exists public.project_risks (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  -- Identification
  number          integer not null,
  title           text not null,
  description     text,

  category        text not null default 'other'
                    check (category in (
                      'technical',      -- Techniczne
                      'financial',      -- Finansowe
                      'schedule',       -- Harmonogram
                      'safety',         -- BHP / bezpieczeństwo
                      'legal',          -- Prawne
                      'environmental',  -- Środowiskowe
                      'subcontractor',  -- Podwykonawcy
                      'design',         -- Projektowe
                      'weather',        -- Pogodowe
                      'client',         -- Po stronie klienta
                      'other'
                    )),

  -- Risk scoring (5x5 matrix — standard Procore/PMI)
  probability     integer not null default 3
                    check (probability between 1 and 5),
  -- 1=bardzo niskie, 2=niskie, 3=umiarkowane, 4=wysokie, 5=bardzo wysokie

  impact          integer not null default 3
                    check (impact between 1 and 5),
  -- 1=minimalne, 2=niskie, 3=umiarkowane, 4=poważne, 5=katastrofalne

  risk_score      integer generated always as (probability * impact) stored,
  -- 1-4: Niskie | 5-9: Umiarkowane | 10-16: Wysokie | 17-25: Krytyczne

  -- Risk type
  risk_type       text not null default 'threat'
                    check (risk_type in ('threat', 'opportunity')),

  -- Owner & mitigation
  owner_name      text,
  owner_id        uuid references public.profiles(id) on delete set null,

  -- Response strategy (PMI standard)
  response_strategy text not null default 'monitor'
                    check (response_strategy in (
                      'avoid',      -- Unikanie (zagrożenie)
                      'transfer',   -- Transfer/ubezpieczenie
                      'mitigate',   -- Mitygacja / redukcja
                      'accept',     -- Akceptacja
                      'monitor',    -- Monitorowanie
                      'exploit',    -- Wykorzystanie (szansa)
                      'share',      -- Podział (szansa)
                      'enhance'     -- Wzmocnienie (szansa)
                    )),

  mitigation_plan text,
  contingency_plan text,

  -- Financial impact estimate
  cost_impact_min numeric(14,2),
  cost_impact_max numeric(14,2),

  -- Schedule impact
  schedule_days_min integer default 0,
  schedule_days_max integer default 0,

  -- Status
  status          text not null default 'identified'
                    check (status in (
                      'identified',
                      'assessed',
                      'mitigated',
                      'realized',
                      'closed'
                    )),

  -- Residual risk after mitigation
  residual_probability integer check (residual_probability between 1 and 5),
  residual_impact      integer check (residual_impact between 1 and 5),

  review_date     date,
  closed_at       timestamptz,
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (project_id, number)
);

create index if not exists idx_risks_project on public.project_risks(project_id, status);
create index if not exists idx_risks_score on public.project_risks(project_id, risk_score desc);

alter table public.project_risks enable row level security;

create policy "risk_org_full"
  on public.project_risks for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

-- ============================================================
-- Schema migrations tracking
-- ============================================================
insert into public.schema_migrations (version, applied_at)
values
  ('0014_rfis', now()),
  ('0015_meetings', now()),
  ('0016_risk_register', now())
on conflict (version) do nothing;
