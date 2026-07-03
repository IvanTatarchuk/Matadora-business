-- =============================================================================
-- BuildMate — Epic 1: Marketplace & bidding
-- Investors publish projects to a marketplace; contractors browse and bid
-- (submit offers). Adds project metadata + an RLS policy that lets any
-- authenticated user read published (open) projects.
-- =============================================================================

alter table public.projects
  add column if not exists description text,
  add column if not exists category    text,
  add column if not exists budget_min   numeric(12,2),
  add column if not exists budget_max   numeric(12,2),
  add column if not exists deadline     date,
  add column if not exists published_at timestamptz;

create index if not exists projects_status_idx on public.projects (status);
create index if not exists projects_category_idx on public.projects (category);

-- ---------------------------------------------------------------------------
-- Marketplace visibility: any authenticated user can read OPEN projects.
-- This is additive to the existing party-only select policy (policies are OR'd).
-- ---------------------------------------------------------------------------
drop policy if exists "projects_select_marketplace" on public.projects;
create policy "projects_select_marketplace"
  on public.projects for select
  using (status = 'open' and auth.role() = 'authenticated');

-- Allow the project owner (investor) to read the contractor profiles that have
-- bid on their project, so offers can show who submitted them. Covered by
-- profiles_select_related once a contractor is assigned; for open bids we rely
-- on the offer row itself (contractor_id) and a public-safe profile lookup.
drop policy if exists "profiles_select_bidders" on public.profiles;
create policy "profiles_select_bidders"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.offers o
      join public.projects p on p.id = o.project_id
      where o.contractor_id = profiles.id
        and p.investor_id = auth.uid()
    )
  );
