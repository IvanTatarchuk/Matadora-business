---
description: Verify Supabase connectivity and that the schema is applied
---

Read-only check using the REST API + publishable key from `.env.local`.

// turbo
1. Run the check agent:
```powershell
npm run db:check
```

Interpretation:
- `OK: connected ... profiles table is reachable` → schema applied, all good.
- `404 ... table not found` → run the `db-migrate` workflow first.
- `Fill NEXT_PUBLIC_SUPABASE_*` → credentials missing in `.env.local`.
