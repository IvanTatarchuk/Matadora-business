# Recovery runbook

This project was fully lost on 2026-07-03 when the removable FAT32 drive it lived
on (`E:\`) suffered hardware-level corruption (Windows Event ID 51 disk errors,
`HealthStatus: Warning`). It was reconstructed from two sources:

1. Claude Code session transcripts (`~/.claude/projects/E--Matadora-business/*.jsonl`)
   — every `Write`/`Edit` tool call ever made in this project, replayed in
   chronological order using each edit's recorded `originalFile` snapshot.
2. The Vercel deployment source for project `buildmate-app`
   (pulled via `GET /v13/deployments/{id}/files` + `/v7/.../files/{uid}`),
   which filled in everything transcripts never touched (`package.json`,
   `next.config.mjs`, `tsconfig.json`, lockfile, scripts/, etc).

Two SQL migrations (`0015`, `0016`) could not be recovered from either source —
if you ever find them, add them and re-check `schema_migrations` in Supabase
against `supabase/*.sql`.

## If this ever happens again

1. **Don't panic, don't write anything new to the broken drive.** Every write
   risks overwriting recoverable fragments.
2. **Git is now the primary source of truth**: https://github.com/IvanTatarchuk/Matadora-business
   `git clone` it — that alone recovers ~everything, no forensics needed.
3. **Vercel is a secondary code mirror**: project `buildmate-app`
   (`prj_0Y0tkYnljrpCLqRmupQ0D3YT1ZtP`) is git-connected — every deploy is
   traceable to a commit now, and Vercel keeps the last N deployments' full
   source even independent of git.
4. **Supabase is the source of truth for data** (project ref
   `wyuxlvieoifkfiovsfux`) — schema lives in `supabase/*.sql` in this repo;
   actual rows only exist in Supabase itself (check backup/PITR settings on
   the Supabase dashboard — not verified as of this writing).
5. **Secrets live only in `.env.local` (gitignored) + Vercel's env var
   store.** If both are lost, regenerate each key from its dashboard — see
   the comments in `.env.local` / `.env.example` for where each one comes
   from.

## Known gaps as of this recovery

- `next@14.2.21` has a known security vulnerability — upgrade when convenient.
- Migrations `0026`/`0027` (`sub_bids`, `project_milestones`,
  `kosztorys_purchases`) exist in `supabase/` but were never applied to the
  live database — apply them if the app code depends on those tables.
- `SUPABASE_ACCESS_TOKEN` in `.env.local` was invalid (401) as of recovery —
  regenerate in Supabase Dashboard → Settings → API if you need the
  Management API.
