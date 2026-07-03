# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Matadora** (matadora.business) is a Polish ConTech SaaS platform connecting investors, contractors, and wholesalers. It handles the full construction workflow: estimates/offers, marketplace bidding, project execution, finance, workforce, procurement, and compliance with Polish regulations (VAT, KSeF).

Three user roles: `investor`, `contractor`, `wholesaler`. The platform is localized for Poland (PLN, VAT 8%/23%, KSeF e-invoicing) with some Ukrainian i18n support.

## Commands

```bash
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run typecheck    # TypeScript check (no emit)
npm run lint         # ESLint (next/core-web-vitals)

npm run db:check     # Verify DB connectivity and schema state
npm run db:migrate   # Apply all pending migrations
npm run db:apply <file.sql>  # Apply a single SQL file
```

**No test runner** is configured — `scripts/smoke-*.mjs` are Node.js integration scripts against a live DB (not unit tests).

ESLint is excluded from builds (`ignoreDuringBuilds: true`); run it separately.

## Environment Setup

Copy `.env.example` to `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-only, never expose to client
NEXT_PUBLIC_SITE_URL=
RESEND_API_KEY=                  # optional, emails silently no-op without it
```

For DB scripts, add one of:
```
SUPABASE_DB_PASSWORD=<password>
# or full URL:
SUPABASE_DB_URL=postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres
```

## Architecture

### Next.js App Router Structure
- `src/app/(auth)/` — login/register routes and server actions
- `src/app/dashboard/[role]/` — role-scoped dashboards (`contractor/`, `investor/`, `wholesaler/`)
- `src/app/offer/[token]/` — public investor offer view (no auth required, uses admin client for token resolution)
- `src/app/kosztorys/`, `src/app/przetargi/` — public-facing Polish features (estimate builder, tender tracker)

### Supabase Client Usage
Three separate clients — use the right one for the context:
- `src/lib/supabase/client.ts` — browser client for Client Components (`"use client"`)
- `src/lib/supabase/server.ts` — server client for Server Components, Route Handlers, Server Actions
- `src/lib/supabase/admin.ts` — service-role (bypasses RLS), **server-only**, used sparingly for privileged ops

### Auth & Role-Based Routing
`src/middleware.ts` handles:
1. Session cookie refresh on every request
2. Redirects unauthenticated users to `/login`
3. Enforces role-based dashboard routing (reads `profiles.role` from DB)

On registration, a row is created in `public.profiles` linked to `auth.users` with the user's role and company info.

### Server Actions (`src/lib/actions/`)
All DB mutations go through Server Actions (`"use server"`). Each domain has its own file (30+ files): `offers.ts`, `projects.ts`, `finance.ts`, `execution.ts`, `workforce.ts`, `attendance.ts`, `subcontractors.ts`, `equipment.ts`, `crm.ts`, `analytics.ts`, etc.

### Key Business Logic
- **Offer calculation** (`src/lib/offer-calc.ts`): `computeOfferTotals()` handles multi-stage estimates with 8%/23% VAT. Stages map to Polish construction norms (Logistics, Demolition, Material, Labor).
- **Offer flow**: Contractor creates estimate → generates public token link → Investor views and accepts → contractor assigned to project + materials ordered.
- **Project marketplace**: Investor publishes project → contractors bid → investor accepts best bid. Status: `draft → open → in_progress → completed`.
- **Finance**: PLN-denominated, `formatPLN()` for display, `round2()` for money arithmetic.

### Database
25+ migrations in `supabase/migrations/`. Schema includes RLS on all tables, `updated_at` triggers, UUID primary keys, and enums for status fields.

Key tables: `profiles`, `projects`, `offers`, `offer_stages`, `offer_materials`, `invoices`, `payments`, `crews`, `workers`, `tasks`, `milestones`, `change_orders`, `purchase_orders`, `rfis`, `rfqs`, `equipment`, `subcontractors`.

### Polish-Specific Modules
- `src/lib/ksef/` — KSeF (Polish mandatory e-invoice system) integration
- VAT rates hardcoded as 8% (renovation) and 23% (standard)
- Currency: PLN, locale `pl-PL` for formatting
- Some route names are Polish: `/dashboard/finanse`, `/dashboard/podwykonawcy`, `/dashboard/sprzet`, `/dashboard/gwarancje`, `/dashboard/powiadomienia`, `/dashboard/cennik`, `/dashboard/kwalifikacje`

### UI Components
`src/components/ui/` — shadcn-style Radix UI wrappers. Add new primitives here following the existing `cn()` + `cva` pattern.
`src/lib/utils.ts` — `cn()` (clsx + tailwind-merge), `formatPLN()`, `round2()`.

### Windows Build Fix
`scripts/patch-readlink.js` patches Node.js symlink handling — required for Vercel deployment from Windows. The `vercel.json` build command runs this before `next build`.
