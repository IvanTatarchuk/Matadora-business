---
description: Apply all pending Supabase migrations (migration agent)
---

Applies every `supabase/migrations/*.sql` that has not yet run, tracking applied
files in `public.schema_migrations`. Safe to re-run.

Prerequisite: `.env.local` must contain DB credentials — either
`SUPABASE_DB_URL` (full connection string) or `SUPABASE_DB_PASSWORD`
(host is derived from `NEXT_PUBLIC_SUPABASE_URL`).

1. Confirm credentials exist in `.env.local` (`SUPABASE_DB_URL` or `SUPABASE_DB_PASSWORD`). If missing, ask the user to add one.

2. Run the migration agent (mutates the database — requires user approval):
```powershell
npm run db:migrate
```

3. Verify the schema is reachable via the REST API:
// turbo
```powershell
npm run db:check
```
