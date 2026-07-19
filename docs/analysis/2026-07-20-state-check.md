# Matadora — State Check (2026-07-20)

Fresh verification pass against actual code, migrations, live Supabase data, and
`npm run typecheck`/`lint`. Goal: check what changed since the 2026-07-19 "full
analysis" audit (0 real customers finding) and spot-check `docs/roadmap.md`
claims against reality rather than summarizing the doc at face value.

Evidence standard: every claim below cites a file path, line number, commit
hash, or a live query result.

---

## What changed since the 2026-07-19 audit (verified real)

1. **KNR cost-item catalog is live and applied to the DB**, not just migrated
   in a file. Live query via `SUPABASE_SERVICE_ROLE_KEY` against
   `cost_items` returned **107 rows** (`content-range: 0-106/107`), confirming
   `supabase/migrations/0056_cost_items_catalog.sql` and
   `0057_cost_items_fuzzy_search.sql` are applied — not just "waiting on
   `db:apply`" as `docs/roadmap.md` line 92 currently states (doc is stale on
   this point). `src/lib/actions/cost-items.ts` → `searchCostItems()` is wired
   into `src/app/kosztorys/page.tsx` with a debounced search.

2. **Two previously-fake features are now genuinely fixed** (commit
   `7db6201`, 2026-07-19 21:52). Verified by reading the diff, not just the
   commit message:
   - `src/app/dashboard/settings/ksef/page.tsx`: the old "Testuj połączenie"
     button (which always reported "Połączenie z KSeF aktywne" after a fake
     1.5s delay) is **removed entirely**, replaced with a static amber notice
     stating live KSeF submission isn't connected yet. Marketing copy in 4
     files was softened from "faktura KSeF automatycznie" to "faktura KSeF
     generuje się automatycznie" (generation is real, submission to
     ksef.podatki.gov.pl is still manual).
   - `src/lib/actions/file-uploads.ts` + new
     `supabase/migrations/0055_org_uploads_storage.sql`: file upload now
     writes to a real `org-uploads` Supabase Storage bucket via a new
     `uploadOrgFile` server action instead of fabricating a
     `https://storage.example.com/...` URL (a non-resolving domain) and
     storing only metadata. Download now opens the real public URL instead of
     `console.log`-ing.

3. **Vercel Analytics is live**: `@vercel/analytics@^2.0.1` in `package.json`
   line 27, `<Analytics />` mounted in `src/app/layout.tsx` lines 3/56
   (commit `75cdeb0`). First traffic visibility the site has ever had — no
   way from this session to read the dashboard itself (no MCP/API access to
   Vercel), so no traffic numbers can be reported either way.

4. **Пріоритет №0 (kosztorys repositioning for a broader audience) is DONE**,
   contradicting `docs/roadmap.md` lines 26–44, which still frame it as "not
   yet executed" ("Пріоритет №0 ... жодного разу не виконаний"). Verified in
   `src/app/kosztorys/page.tsx` lines 471–494: hero copy now reads "Dla
   generalnych wykonawców, architektów, zarządców nieruchomości i
   projektantów wnętrz" with four audience badges (Generalni wykonawcy /
   Architekci / Zarządcy nieruchomości / Projektanci wnętrz). Git history
   confirms this shipped in commit `1311611` "kosztorys: reposition hero copy
   for broader audience (DFY priority #0) (#6)" — dated before the roadmap's
   own "not done" framing was written, so the roadmap is describing a state
   that was already superseded by the time it was last edited (`docs/roadmap.md`
   last touched 2026-07-19 23:02, per `git log -1 -- docs/roadmap.md`).

5. **New `agent-studio/` sub-project merged** (commit `cdd57f0`, "Merge Phase
   1 agent-studio harness", 2026-07-20 00:27). See dedicated section below —
   this is infrastructure, not a product feature, and is clearly isolated
   from the main app.

## What's still true / still open

- **0 real customers, still.** Live query against the production Supabase
  project (via `SUPABASE_SERVICE_ROLE_KEY`, bypassing RLS) run this session:
  `profiles: 1 row`, `projects: 0`, `offers: 0`, `invoices: 0`,
  `support_tickets: 0`, `reviews: 0` (table `public.reviews`, from
  `supabase/migrations/0006_trust_reviews.sql`). Identical picture to the
  2026-07-19 audit — the one row in `profiles` is the owner's own account.
  This is a same-day re-check, so it only proves nothing regressed; it
  cannot show a trend.

- **Faza 1 trust items are NOT done.** Checked each one specifically:
  - No public "Bezpieczeństwo i dane" page exists. The only route matching
    "security" is `src/app/dashboard/security/page.tsx`, which is an
    **authenticated internal audit-log/session viewer**
    (`listAuditLogs`/`listSecurityEvents`/`listUserSessions`/`getSecurityStats`
    from `src/lib/actions/security.ts`) — not a public trust/RODO page.
  - No 2FA/MFA enrollment UI anywhere in `src/` (grepped for
    `2FA|MFA|two.factor|totp`, no matches). `node scripts/auth-config.mjs`
    (Supabase Management API) returned `undefined` for the fields it reads,
    which only confirms auto-confirm/signup settings, not MFA — so MFA
    project-level state could not be conclusively checked this session, but
    there is definitely no in-product MFA flow for users.
  - No public support-response-time / SLA copy found (`src/lib/actions/support.ts`
    has ticket CRUD, no SLA text anywhere in `src/app`).
  - No `/status` or uptime/availability page exists (`Glob` for
    `src/app/**/status*/**` returned nothing).

- **Roadmap items #4–#8 (EVM S-curve chart, cash-now widget, qualification
  badges, bid comparison matrix, subcontractor review history) — not
  independently re-verified this session**; nothing in the git log since
  2026-07-19 21:42 touches those areas, so no reason to believe their status
  changed from whatever the roadmap already says.

- **KSeF live submission remains explicitly out of scope** per the owner's
  prior decision, and the fix in item 2 above makes the UI honest about that
  rather than changing the underlying scope decision.

## New finding: `npm run typecheck` is currently broken (regression)

`npm run typecheck` exits **1**:
```
agent-studio/vite.config.ts(4,1): error TS2578: Unused '@ts-expect-error' directive.
```
Root cause: root `tsconfig.json` (`include: ["next-env.d.ts", "**/*.ts",
"**/*.tsx", ".next/types/**/*.ts"]`, `exclude: ["node_modules",
"business-ideas-pl"]`) has no exclusion for `agent-studio/`, so the root
`tsc --noEmit` pass now pulls in the newly-merged Vite/Tauri sub-project and
fails on an unrelated stray `@ts-expect-error` in its own `vite.config.ts`.
This is a direct, mechanical side effect of the `agent-studio` merge
(`cdd57f0`, 2026-07-20 00:27) landing without updating the root tsconfig's
`exclude` list. The Next.js app itself typechecks cleanly — this is purely
the harness introducing a false "the whole repo fails typecheck" signal for
anyone running the root script (including CI, if `npm run typecheck` is used
there). Not fixed as part of this check, per instructions (read-only).

## `npm run lint` — clean, no new smells

0 errors, 158 warnings, all pre-existing categories: `@typescript-eslint/no-explicit-any`
(the large majority — `any` used across ~25 files in `src/lib/actions/`),
`@next/next/no-img-element` (raw `<img>` instead of `next/image`, 4 spots),
and one `react-hooks/exhaustive-deps` in `src/app/sign/[token]/page.tsx`.
Nothing in this run is new or was flagged as a regression relative to what
the code already looked like — no `any`-typed additions came from the
sessions since 2026-07-19 that weren't already `any` before, based on the
files hit (mostly older `src/lib/actions/*.ts` files like `business-intelligence.ts`,
`reports.ts`, `workflows.ts`).

## Other code-smell sweep (fake/simulated feature patterns)

Grepped for `TODO|FIXME|XXX:|HACK:` across `src/` — **zero matches**, clean.

Grepped for `simulate|Simulate|For now,|storage.example.com|fake|mock data`:
- `src/lib/actions/file-uploads.ts:19-20` — a comment describing the *old*
  fake behavior it replaced ("replaces the previous flow where the client
  fabricated a fake `https://storage.example.com/...` URL"). This is
  documentation of a fix, not a live fake feature.
- `src/app/dashboard/messages/messenger-client.tsx:48` — `// For now, we'll
  just load initial messages`. Read in context: this is a real-time-sync
  scoping comment (no polling/websocket refresh yet), not a fabricated
  success response. Flagging as a minor known-gap comment, not a fake
  feature on the scale of the two fixed in `7db6201`.

No new hardcoded-success-response or fake-delay (`setTimeout` pretending to
do real work) patterns were found. The two known fake features from the
prior audit (KSeF test button, file upload) are the only ones that existed
and both are now fixed.

## `agent-studio/` — what it actually is

Read the source directly rather than trusting comments. Confirmed:

- **Zero references from the Matadora product.** `Grep` for `agent-studio`
  across `src/` returned no matches — the Next.js app does not import,
  link to, or reference this sub-project anywhere.
- It is a **separate npm project** (`agent-studio/package.json`, own
  `node_modules`, own `tsconfig.json`) — a Tauri desktop shell
  (`agent-studio/src-tauri/`) + a React UI (`agent-studio/src/App.tsx`) +
  a Node sidecar (`agent-studio/sidecar/feature-dev-agent.mjs`) that shells
  out to `@anthropic-ai/claude-agent-sdk@^0.3.215`.
- The UI **self-labels its own immaturity**: `App.tsx` line 98 still shows
  "Фаза 0: перевірка IPC-каналу" (Phase 0: IPC channel check) as its first
  demo button, and the Phase 1 feature-dev-agent section's help text (lines
  112-120) explicitly warns in Ukrainian: *"Використовуйте тестовий/scratch
  репозиторій, не реальний Matadora-business"* ("Use a test/scratch
  repository, not the real Matadora-business"). This is an explicit,
  visible-to-the-owner disclaimer against pointing it at the production repo.
- The sidecar (`feature-dev-agent.mjs`) requires `ANTHROPIC_API_KEY` set in
  its own process environment (lines 57-68) and fails loudly if absent —
  confirming it has not been run with a real key as part of this repo's
  history in a way that would leave traces here (no evidence either way of
  live runs; the harness is designed to operate on an isolated `git
  worktree` on a fresh branch and never merge/push to main/production, per
  explicit `disallowedTools` and a `PreToolUse` Bash-command guard in the
  same file).
- **Conclusion: this could not mislead anyone into thinking Matadora has
  autonomous AI agents in production.** It's a local desktop dev tool, not
  reachable from matadora.business, not referenced by the product, and
  its own UI text describes itself as an early-phase harness meant for
  scratch repos.

## Business-reality check

`.env.local` contains real Supabase credentials
(`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc. — names only
listed here, values not reproduced). Live read this session (see "still
open" section above): **1 profile (owner), 0 projects, 0 offers, 0 invoices,
0 support tickets, 0 reviews.** No change from the 2026-07-19 finding. Vercel
Analytics was only added today/yesterday (`75cdeb0`), so there is no
dashboard history to check yet, and this session has no Vercel API/MCP
access to pull traffic numbers even if there were.

## Stale-doc watch list for `docs/roadmap.md`

Two concrete inaccuracies found this session (beyond the cost-items
`db:apply` status already noted above):
1. Lines 26-44 present Пріоритет №0 as unexecuted; it shipped in commit
   `1311611`, before the roadmap text asserting it as outstanding was last
   edited.
2. Line 92's "(чекає на `db:apply` власником)" parenthetical is out of date
   — `cost_items` has 107 live rows in production.

No other roadmap claims were checked in this pass (items 4-8, the strategic
track, and the backlog list were read but not independently re-verified
against code this session — flagged above under "still open").
