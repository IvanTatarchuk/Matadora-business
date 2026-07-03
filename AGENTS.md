# Local automation agents

Single-command scripts that Cascade runs in your terminal to perform tasks it
cannot do directly (DB writes, schema checks). Credentials live only in
`.env.local` (gitignored) — grant access once, and migrations/checks just work.

## Setup (one-time): grant DB access

Add **one** of these to `.env.local`:

```
# Option A — just the password; host is derived from NEXT_PUBLIC_SUPABASE_URL
SUPABASE_DB_PASSWORD=your-database-password

# Option B — a full connection string (use this if you need the pooler host)
SUPABASE_DB_URL=postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres
```

Optional overrides (only if not using a full URL):
`SUPABASE_DB_HOST`, `SUPABASE_DB_PORT`, `SUPABASE_DB_USER`.

## Agents

| Command | What it does |
| --- | --- |
| `npm run db:check` | Read-only: confirms connectivity + that the schema is applied (REST API). |
| `npm run db:migrate` | Applies all pending `supabase/migrations/*.sql`, tracked in `public.schema_migrations`. Safe to re-run. |
| `npm run db:apply <file.sql>` | Applies a single SQL file (needs `SUPABASE_DB_URL`). |

## Windsurf workflows

- `/db-migrate` — apply pending migrations, then verify.
- `/db-check` — verify connectivity and schema state.

## Notes

- These scripts use the `pg` driver and connect over SSL.
- After granting access, you may rotate the DB password anytime in
  **Supabase → Settings → Database**; the app itself uses API keys, not the DB
  password, so app behavior is unaffected.
