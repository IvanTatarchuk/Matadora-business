-- =============================================================================
-- Matadora — Phase 54: Marketing content drafts (AI-assisted, human-approved)
-- =============================================================================
-- The marketing agent only ever GENERATES drafts here. There is no
-- integration that publishes anything or spends ad budget automatically —
-- every row must be reviewed and manually approved/published by the owner.
-- No end-user (investor/contractor/wholesaler) ever reads or writes this
-- table, so RLS is enabled with zero policies: only the service-role client
-- (used exclusively by admin-gated routes, see src/lib/admin.ts) can touch it.

create table if not exists public.marketing_drafts (
  id            uuid primary key default gen_random_uuid(),
  type          text not null
                  check (type in ('social_post', 'blog_article', 'ad_campaign')),
  platform      text,                -- 'facebook' | 'instagram' | 'linkedin' | 'blog' | 'google_ads' | ...
  topic         text not null,       -- the brief/topic the draft was generated from
  title         text,
  content       text not null,       -- generated post/article body or ad copy
  meta          jsonb,               -- structured extras: hashtags, headline variants, targeting notes, budget suggestion
  status        text not null default 'draft'
                  check (status in ('draft', 'approved', 'rejected', 'published')),
  reviewed_by   uuid references public.profiles (id) on delete set null,
  reviewed_at   timestamptz,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists marketing_drafts_status_idx on public.marketing_drafts (status);
create index if not exists marketing_drafts_type_idx on public.marketing_drafts (type);

drop trigger if exists set_updated_at on public.marketing_drafts;
create trigger set_updated_at before update on public.marketing_drafts
  for each row execute function public.set_updated_at();

alter table public.marketing_drafts enable row level security;
-- Intentionally no policies — service-role only (bypasses RLS), see comment above.
