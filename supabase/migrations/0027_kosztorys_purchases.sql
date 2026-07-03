-- =============================================================================
-- Matadora — Phase 27: Kosztorys pay-per-use purchases (Stripe)
-- =============================================================================

do $$ begin
  create type public.purchase_tier as enum ('maly', 'standardowy', 'kompleksowy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.purchase_status as enum ('pending', 'paid', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

create table if not exists public.kosztorys_purchases (
  id                uuid primary key default gen_random_uuid(),
  stripe_session_id text unique not null,
  stripe_payment_id text,
  email             text not null,
  tier              public.purchase_tier not null,
  amount_pln        integer not null,        -- in grosz, e.g. 14900 = 149.00 zł
  status            public.purchase_status not null default 'pending',
  kosztorys_token   text unique default encode(gen_random_bytes(24), 'hex'),
  user_id           uuid references public.profiles (id) on delete set null,
  metadata          jsonb,
  paid_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists kosztorys_purchases_email_idx   on public.kosztorys_purchases (email);
create index if not exists kosztorys_purchases_session_idx on public.kosztorys_purchases (stripe_session_id);
create index if not exists kosztorys_purchases_token_idx   on public.kosztorys_purchases (kosztorys_token);

drop trigger if exists set_updated_at on public.kosztorys_purchases;
create trigger set_updated_at before update on public.kosztorys_purchases
  for each row execute function public.set_updated_at();

-- Public read by token (for download page), full write via service role only
alter table public.kosztorys_purchases enable row level security;

drop policy if exists "purchase_read_by_token" on public.kosztorys_purchases;
create policy "purchase_read_by_token" on public.kosztorys_purchases
  for select to anon, authenticated
  using (true);  -- token check done in application layer

drop policy if exists "purchase_own_read" on public.kosztorys_purchases;
create policy "purchase_own_read" on public.kosztorys_purchases
  for select to authenticated
  using (user_id = auth.uid() or email = (
    select email from public.profiles where id = auth.uid()
  ));
