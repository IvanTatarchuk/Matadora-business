-- =============================================================================
-- Matadora — Phase 55: real storage backend for the "Przesyłanie plików" module
-- =============================================================================
-- `file_uploads` (0048) has stored only fabricated metadata since it shipped —
-- the upload button never sent bytes anywhere, it just saved a fake
-- "https://storage.example.com/..." URL. This creates the actual bucket so
-- uploads are real, org-scoped by the same rule as `file_uploads` RLS
-- (organization_members), with folder layout <org_id>/<filename>.

insert into storage.buckets (id, name, public)
values ('org-uploads', 'org-uploads', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "org_uploads_read" on storage.objects;
create policy "org_uploads_read"
  on storage.objects for select
  using (bucket_id = 'org-uploads');

drop policy if exists "org_uploads_insert_member" on storage.objects;
create policy "org_uploads_insert_member"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'org-uploads'
    and (storage.foldername(name))[1] in (
      select org_id::text from public.organization_members where user_id = auth.uid()
    )
  );

drop policy if exists "org_uploads_delete_member" on storage.objects;
create policy "org_uploads_delete_member"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'org-uploads'
    and (storage.foldername(name))[1] in (
      select org_id::text from public.organization_members where user_id = auth.uid()
    )
  );
