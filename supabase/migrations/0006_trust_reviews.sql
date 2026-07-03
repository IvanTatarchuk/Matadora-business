-- =============================================================================
-- BuildMate — Phase 4: Trust (reviews, ratings, verified firms)
-- Reviews are tied to a real project and its two participants. Reviewee rating
-- aggregates are maintained on profiles by a trigger.
-- =============================================================================

-- Trust fields on profiles ---------------------------------------------------
alter table public.profiles
  add column if not exists is_verified  boolean not null default false,
  add column if not exists rating_avg   numeric(3,2) not null default 0,
  add column if not exists rating_count integer not null default 0;

-- Reviews --------------------------------------------------------------------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (project_id, reviewer_id, reviewee_id),
  check (reviewer_id <> reviewee_id)
);

create index if not exists reviews_reviewee_id_idx on public.reviews (reviewee_id);
create index if not exists reviews_project_id_idx on public.reviews (project_id);

-- updated_at trigger
drop trigger if exists set_updated_at on public.reviews;
create trigger set_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

-- Rating aggregate maintenance -----------------------------------------------
create or replace function public.recompute_rating(p_id uuid)
returns void
language sql
security definer
as $$
  update public.profiles p set
    rating_count = sub.cnt,
    rating_avg   = sub.avg
  from (
    select
      count(*)::int as cnt,
      coalesce(round(avg(rating)::numeric, 2), 0) as avg
    from public.reviews where reviewee_id = p_id
  ) sub
  where p.id = p_id;
$$;

create or replace function public.reviews_after_change()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'DELETE') then
    perform public.recompute_rating(old.reviewee_id);
    return old;
  end if;
  perform public.recompute_rating(new.reviewee_id);
  if (tg_op = 'UPDATE' and new.reviewee_id is distinct from old.reviewee_id) then
    perform public.recompute_rating(old.reviewee_id);
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_aggregate on public.reviews;
create trigger reviews_aggregate
  after insert or update or delete on public.reviews
  for each row execute function public.reviews_after_change();

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.reviews enable row level security;

-- Everyone authenticated can read reviews (public trust signal).
drop policy if exists "reviews_select_all" on public.reviews;
create policy "reviews_select_all"
  on public.reviews for select
  using (auth.role() = 'authenticated');

-- A reviewer may post a review only for a project they participate in, about
-- the counterparty, once the project is in progress or completed.
drop policy if exists "reviews_insert_participant" on public.reviews;
create policy "reviews_insert_participant"
  on public.reviews for insert
  to authenticated
  with check (
    reviewer_id = auth.uid()
    and reviewer_id <> reviewee_id
    and exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and pr.status in ('in_progress', 'completed')
        and (pr.investor_id = auth.uid() or pr.contractor_id = auth.uid())
        and (pr.investor_id = reviewee_id or pr.contractor_id = reviewee_id)
    )
  );

-- Reviewers manage their own reviews.
drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own"
  on public.reviews for update
  to authenticated
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid());

drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own"
  on public.reviews for delete
  to authenticated
  using (reviewer_id = auth.uid());
