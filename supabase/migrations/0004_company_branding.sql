-- =============================================================================
-- BuildMate — Phase 1: Company branding & logo
-- Adds company profile fields and a public Storage bucket for logos/assets.
-- =============================================================================

-- Profile branding / company details -----------------------------------------
alter table public.profiles
  add column if not exists logo_url        text,
  add column if not exists nip             text,   -- PL tax id (NIP)
  add column if not exists company_address text,
  add column if not exists website         text,
  add column if not exists bio             text;

-- =============================================================================
-- Storage bucket for company assets (logos). Public read so logos render on
-- the public offer page; writes are restricted per-user via policies below.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('company-assets', 'company-assets', true)
on conflict (id) do update set public = excluded.public;

-- Object path convention: "<auth.uid()>/<filename>" — the first folder segment
-- is the owner's user id, which the policies enforce on write.

-- Public read of company assets.
drop policy if exists "company_assets_public_read" on storage.objects;
create policy "company_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'company-assets');

-- Authenticated users may upload into their own folder.
drop policy if exists "company_assets_insert_own" on storage.objects;
create policy "company_assets_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'company-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users may update their own objects.
drop policy if exists "company_assets_update_own" on storage.objects;
create policy "company_assets_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'company-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'company-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users may delete their own objects.
drop policy if exists "company_assets_delete_own" on storage.objects;
create policy "company_assets_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'company-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
