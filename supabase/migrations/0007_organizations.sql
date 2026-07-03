-- =============================================================================
-- BuildMate — Phase 5: Organizations (firms, team members, invitations)
-- An organization is the firm container. Every user gets a personal org on
-- signup (as owner); orgs can have many members with roles. Existing profiles
-- are backfilled with a personal org.
-- =============================================================================

do $$ begin
  create type org_member_role as enum ('owner', 'admin', 'manager', 'member');
exception when duplicate_object then null; end $$;

-- Organizations -------------------------------------------------------------
create table if not exists public.organizations (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  name         text not null,
  kind         user_role not null default 'contractor',
  logo_url     text,
  nip          text,
  address      text,
  website      text,
  bio          text,
  is_verified  boolean not null default false,
  rating_avg   numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists organizations_owner_id_idx on public.organizations (owner_id);

create table if not exists public.organization_members (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       org_member_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index if not exists organization_members_user_id_idx on public.organization_members (user_id);

create table if not exists public.organization_invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  email       text not null,
  role        org_member_role not null default 'member',
  token       uuid not null default gen_random_uuid(),
  invited_by  uuid references public.profiles (id) on delete set null,
  status      text not null default 'pending',  -- pending | accepted | revoked
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  unique (org_id, email)
);

create index if not exists organization_invitations_token_idx on public.organization_invitations (token);
create index if not exists organization_invitations_email_idx on public.organization_invitations (email);

-- updated_at trigger
drop trigger if exists set_updated_at on public.organizations;
create trigger set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

-- =============================================================================
-- Membership helpers (SECURITY DEFINER avoids RLS recursion)
-- =============================================================================
create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members
    where org_id = p_org and user_id = auth.uid()
  );
$$;

create or replace function public.org_role(p_org uuid)
returns org_member_role language sql stable security definer set search_path = public as $$
  select role from public.organization_members
  where org_id = p_org and user_id = auth.uid();
$$;

-- =============================================================================
-- Auto-create a personal organization on signup
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
  v_org  uuid;
begin
  v_role := coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'investor');

  insert into public.profiles (id, role, full_name, company_name, phone, city)
  values (
    new.id,
    v_role,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company_name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'city'
  )
  on conflict (id) do nothing;

  insert into public.organizations (owner_id, name, kind)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'company_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      'My organization'
    ),
    v_role
  )
  returning id into v_org;

  insert into public.organization_members (org_id, user_id, role)
  values (v_org, new.id, 'owner')
  on conflict do nothing;

  return new;
end;
$$;

-- =============================================================================
-- Backfill: give every existing profile a personal org (if none yet)
-- =============================================================================
do $$
declare p record; v_org uuid;
begin
  for p in
    select pr.id, pr.role, pr.company_name, pr.full_name
    from public.profiles pr
    where not exists (
      select 1 from public.organization_members m where m.user_id = pr.id
    )
  loop
    insert into public.organizations (owner_id, name, kind)
    values (p.id, coalesce(nullif(p.company_name,''), nullif(p.full_name,''), 'My organization'), p.role)
    returning id into v_org;

    insert into public.organization_members (org_id, user_id, role)
    values (v_org, p.id, 'owner')
    on conflict do nothing;
  end loop;
end $$;

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;

-- organizations
drop policy if exists "org_select_member" on public.organizations;
create policy "org_select_member" on public.organizations for select
  to authenticated using (is_org_member(id));

drop policy if exists "org_insert_owner" on public.organizations;
create policy "org_insert_owner" on public.organizations for insert
  to authenticated with check (owner_id = auth.uid());

drop policy if exists "org_update_admin" on public.organizations;
create policy "org_update_admin" on public.organizations for update
  to authenticated using (org_role(id) in ('owner','admin'))
  with check (org_role(id) in ('owner','admin'));

drop policy if exists "org_delete_owner" on public.organizations;
create policy "org_delete_owner" on public.organizations for delete
  to authenticated using (owner_id = auth.uid());

-- organization_members
drop policy if exists "member_select" on public.organization_members;
create policy "member_select" on public.organization_members for select
  to authenticated using (is_org_member(org_id));

drop policy if exists "member_insert_admin" on public.organization_members;
create policy "member_insert_admin" on public.organization_members for insert
  to authenticated with check (org_role(org_id) in ('owner','admin'));

drop policy if exists "member_update_admin" on public.organization_members;
create policy "member_update_admin" on public.organization_members for update
  to authenticated using (org_role(org_id) in ('owner','admin'))
  with check (org_role(org_id) in ('owner','admin'));

drop policy if exists "member_delete_admin" on public.organization_members;
create policy "member_delete_admin" on public.organization_members for delete
  to authenticated using (org_role(org_id) in ('owner','admin'));

-- organization_invitations
drop policy if exists "invite_select" on public.organization_invitations;
create policy "invite_select" on public.organization_invitations for select
  to authenticated using (
    is_org_member(org_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "invite_insert_admin" on public.organization_invitations;
create policy "invite_insert_admin" on public.organization_invitations for insert
  to authenticated with check (org_role(org_id) in ('owner','admin'));

drop policy if exists "invite_update_admin" on public.organization_invitations;
create policy "invite_update_admin" on public.organization_invitations for update
  to authenticated using (org_role(org_id) in ('owner','admin'))
  with check (org_role(org_id) in ('owner','admin'));

drop policy if exists "invite_delete_admin" on public.organization_invitations;
create policy "invite_delete_admin" on public.organization_invitations for delete
  to authenticated using (org_role(org_id) in ('owner','admin'));
