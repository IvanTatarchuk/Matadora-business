# BuildMate — ConTech Platform

Connects **Investors**, **Contractors**, and **Building Material Wholesalers** in one transparent workflow: professional estimates → online approval → automated material orders.

## Tech Stack

- **Next.js 14** (App Router, TypeScript strict)
- **Tailwind CSS** + shadcn-style UI primitives
- **Supabase** (PostgreSQL, Auth, RLS) via `@supabase/ssr`
- **Vercel** for deployment

## Project Structure

```
src/
  app/
    (auth)/            login + register (server actions in actions.ts)
    dashboard/         role-scoped dashboards (layout fetches profile/role)
      contractor/      overview, offers, multi-step "new offer" wizard
      investor/        overview, offers to review
      wholesaler/      overview, catalog, orders
    offer/[token]/     public investor offer view + Accept button
    page.tsx           marketing landing page
  components/
    ui/                Button, Card, Input, Label, Textarea, Badge
    dashboard/         Sidebar, Topbar, StatCard
    offers/            OfferWizard (multi-step form), OfferSummary
  lib/
    supabase/          client.ts, server.ts, middleware.ts, admin.ts
    actions/offers.ts  createOffer / sendOffer / acceptOffer (Server Actions)
    offer-calc.ts      VAT + stage total calculations
    utils.ts           cn(), formatPLN(), round2()
  types/database.ts    typed Supabase schema
  middleware.ts        session refresh + role-based routing
supabase/
  migrations/0001_init_schema.sql   tables, enums, triggers, RLS policies
  seed.sql                          optional sample data
```

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** and copy the keys.

3. **Configure environment** — copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

   Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY`.

4. **Apply the database schema** — run `supabase/migrations/0001_init_schema.sql`
   in the Supabase SQL editor (or `supabase db push` with the CLI).

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Core Flow

1. A **contractor** registers, then builds a staged estimate (Logistics,
   Demolition, Material, Labor) with an 8% or 23% VAT rate.
2. The contractor sends the offer; an **investor** opens the public
   `/offer/[token]` link, reviews transparent pricing, and clicks **Accept**.
3. On acceptance, **wholesaler** orders are generated for referenced materials
   (catalog integration is modular for future external wholesaler APIs).

## Security

- **Row Level Security** is enabled on every table; policies scope rows to the
  owning investor / contractor / wholesaler and shared counterparties.
- The service-role key is used **only** server-side in `lib/supabase/admin.ts`
  to resolve public offer links — never import it into client code.

## Deployment

Deploy to **Vercel**, setting the same environment variables in the project
settings. The Supabase database is managed separately.
