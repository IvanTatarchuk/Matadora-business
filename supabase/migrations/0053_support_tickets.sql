-- =============================================================================
-- Matadora — Phase 53: Support tickets (in-app "Zgłoś problem")
-- =============================================================================
-- Real platform users (any role) can report a problem from inside the
-- dashboard. Tickets are triaged by the owner (email allowlist, checked in
-- the app layer via createAdminClient() — there is no 4th "admin" DB role,
-- consistent with the rest of this schema). A human-invoked triage process
-- (docs/support-triage.md) may draft a fix branch for review, but nothing
-- in this schema or the app grants any automated write access to code or
-- deploys — this table only stores the ticket itself.

create table if not exists public.support_tickets (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid references public.profiles (id) on delete set null,
  reporter_role text,                 -- snapshot of profiles.role at submission time
  reporter_email text,                -- snapshot, in case the account is later deleted
  page_url      text,                 -- pathname the user was on when reporting
  message       text not null,
  status        text not null default 'open'
                  check (status in ('open', 'triaging', 'fix_drafted', 'waiting_on_user', 'resolved', 'wont_fix')),
  triage_notes  text,                 -- filled in by the triage process
  fix_branch    text,                 -- git branch name, if a fix was drafted
  fix_summary   text,                 -- what changed and why
  admin_reply   text,                 -- free-text reply sent back to the reporter
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists support_tickets_status_idx on public.support_tickets (status);
create index if not exists support_tickets_reporter_idx on public.support_tickets (reporter_id);

drop trigger if exists set_updated_at on public.support_tickets;
create trigger set_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

alter table public.support_tickets enable row level security;

-- Reporters can create tickets and read their own — no update/delete from the
-- client; status changes and replies go through the admin (service-role) path.
drop policy if exists "reporter_insert_own_ticket" on public.support_tickets;
create policy "reporter_insert_own_ticket" on public.support_tickets
  for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "reporter_read_own_tickets" on public.support_tickets;
create policy "reporter_read_own_tickets" on public.support_tickets
  for select to authenticated
  using (reporter_id = auth.uid());
