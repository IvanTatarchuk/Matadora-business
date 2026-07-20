-- =============================================================================
-- Matadora — Phase 59: Obserwacje jakości i BHP (Quality & Safety Observations)
-- =============================================================================
-- Procore-równoważny moduł "Observations". Odnotowuje w terenie obserwacje
-- dotyczące jakości, BHP, środowiska, odbiorów i zgodności — z priorytetem,
-- osobą odpowiedzialną, lokalizacją i terminem usunięcia. Odróżnia się od:
--   * inspekcji (protokoły z listami kontrolnymi),
--   * wypadków / incydentów (zdarzenia po fakcie),
--   * usterek/punch list (defekty przy odbiorze).
-- Obserwacja to proaktywne zgłoszenie z pętlą "zgłoś → przydziel → usuń →
-- weryfikuj → zamknij".

create table if not exists public.project_observations (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  org_id          uuid references public.organizations(id) on delete cascade not null,
  created_by      uuid references public.profiles(id) on delete set null,

  number          integer not null,
  title           text not null,
  description     text,

  -- Typ obserwacji
  type            text not null default 'safety'
                    check (type in (
                      'safety',         -- BHP / Bezpieczeństwo
                      'quality',        -- Jakość
                      'environmental',  -- Środowisko
                      'commissioning',  -- Odbiory / rozruch
                      'work',           -- Wykonawstwo / roboty
                      'other'
                    )),

  -- Priorytet
  priority        text not null default 'medium'
                    check (priority in ('low', 'medium', 'high', 'urgent')),

  -- Status (pętla obserwacji)
  status          text not null default 'initiated'
                    check (status in (
                      'initiated',      -- Zgłoszona
                      'in_progress',    -- W trakcie usuwania
                      'ready_review',   -- Do weryfikacji
                      'closed',         -- Zamknięta
                      'void'            -- Anulowana
                    )),

  -- Przypisanie i lokalizacja
  assignee_name   text,
  assignee_id     uuid references public.profiles(id) on delete set null,
  location        text,
  trade           text,               -- Branża / rodzaj robót

  -- Powiązanie z osobą zgłaszającą (np. kierownik BHP)
  observed_by     text,

  due_date        date,
  resolved_at     timestamptz,
  closed_at       timestamptz,
  resolution_note text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (project_id, number)
);

create index if not exists idx_observations_project on public.project_observations(project_id, status);
create index if not exists idx_observations_priority on public.project_observations(project_id, priority);

alter table public.project_observations enable row level security;

drop policy if exists "observation_org_full" on public.project_observations;
create policy "observation_org_full"
  on public.project_observations for all
  using (org_id in (select org_id from public.organization_members where user_id = auth.uid()))
  with check (org_id in (select org_id from public.organization_members where user_id = auth.uid()));

drop trigger if exists trg_observations_updated_at on public.project_observations;
create trigger trg_observations_updated_at
  before update on public.project_observations
  for each row execute function public.set_updated_at();
