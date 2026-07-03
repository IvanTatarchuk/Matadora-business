# Research: platform-wide feature analysis (beyond kosztorys)

**Date:** 2026-07-03
**Author:** Automated research (Claude Code)
**Purpose:** Survey established field-management / construction-management SaaS products — **not** estimating tools — for UX/feature *ideas* relevant to Matadora's project marketplace (`przetargi`), execution-tracking, subcontractor/crew management, and finance modules. A prior research pass (`docs/research/openconstructionerp-analysis.md`) already covered the `/kosztorys` estimate builder specifically; this document covers the rest of the platform.

Products reviewed (public marketing pages, help-center articles, and blog posts only — no source code, no gated docs, no logged-in areas):
- [Procore — Project Management](https://www.procore.com/project-management), [RFIs](https://www.procore.com/project-management/rfis), [Daily Log Tool](https://learn.procore.com/daily-log-tool), [Submittals manual](https://v2.support.procore.com/product-manuals/submittals-project/)
- [Fieldwire by Hilti — Punch List App](https://www.fieldwire.com/punch-list-app/), [Punch list use case](https://www.fieldwire.com/usecase/punch-management-gc/)
- [PlanRadar — Defect Management](https://www.planradar.com/product/defect-management/), [PlanRadar project management overview](https://www.planradar.com/project-management-software-for-construction/)
- [Buildertrend — Job Costing Budget Overview](https://buildertrend.com/help-article/job-costing-budget-overview/), [Cash flow blog](https://buildertrend.com/blog/improve-construction-cash-flow/), [Job profitability](https://www.tradiesaccountant.com/blog/the-advantage-of-using-cost-budgets-in-buildertrend-for-managing-job-profitability)
- [CoConstruct — Bidding overview](https://www.coconstruct.com/learn-construction-software/bidding-overview), [Construction bidding software features](https://www.coconstruct.com/features/construction-bidding-software)
- Poland-specific: [SimplyBud](https://simplybud.pl/), [IC Project](https://www.icproject.com/blog/ranking-10-najlepszych-programow-erp-dla-firm-budowlanych-w-2025) (mentioned only for context — neither exposes enough public detail on bidding/execution UX to describe concretely, so no ideas below are attributed to them specifically)

All five primary products above (Procore, Fieldwire/Hilti, PlanRadar, Buildertrend, CoConstruct) are **closed-source commercial SaaS** — there is no AGPL/GPL/open-source exposure at all for this document, unlike the prior OpenConstructionERP research. That removes the "must open-source Matadora" risk entirely; the only care taken here is not copying marketing copy verbatim (everything below is an original restatement of a *concept*, not quoted text) and not treating any single vendor's implementation as something to reverse-engineer.

Each idea below is grounded in Matadora's **actual current implementation**, confirmed by reading the relevant server actions and migrations, so the "gap" being addressed is real rather than assumed.

---

## 1. Project marketplace / bidding (`przetargi`)

**Current state:** `src/lib/actions/przetargi.ts` only manages email/category/voivodeship subscriptions to an external public-tender feed (table `przetargi_subscriptions`) — the tender listings themselves (`src/app/przetargi/page.tsx`, `src/app/dashboard/contractor/przetargi/page.tsx`) are a hardcoded `SAMPLE_TENDERS` array with no live ingestion yet. Matadora's *actual* internal bidding engine is `src/lib/actions/rfq.ts` (tables `rfqs`/`rfq_items`/`rfq_responses`) and `src/lib/actions/sub-bids.ts` (table `sub_bids`, fields `amount_net`/`amount_gross`, `completion_days`, `bidder_nip`, `file_url`; awarding one bid auto-rejects the others for that RFQ). The UI (`rfq-client.tsx`) renders RFQ responses and sub-bids as two separately sorted lists (ascending by price) — a ranked list, not a true side-by-side comparison grid.

### 1.1 Side-by-side bid comparison matrix
CoConstruct and Buildertrend both structure bid review as an "apples-to-apples" grid: one column per bidder, one row per criterion (price, completion time, terms), rather than a sorted list per bidder. Matadora already has all the underlying fields (`sub_bids.amount_net/gross`, `completion_days`, plus `subcontractors.rating` for reputation) — this would be a new read-only aggregation component on `rfq-client.tsx` transposing existing `sub_bids`/`rfq_responses` rows into a matrix, with the best value per row highlighted.
**Effort: Medium** — no schema change, new query + grid component only.

### 1.2 Auto-push accepted bid into job costing
CoConstruct's bidding flow lets an accepted bid overwrite the corresponding budget line directly, closing the loop between procurement and cost tracking. Today, awarding a `sub_bid` (`sub-bids.ts`) only flips its own status — it doesn't touch `job_cost_items` (`job-costing.ts`). Wiring the award action to also insert/update the matching `job_cost_items` row with the accepted `amount_net` would make job-cost variance reporting reflect real committed costs the moment a bid is accepted, not after manual re-entry.
**Effort: Small–Medium** — extends an existing action; no new tables.

### 1.3 Qualification badge inline with each bid
Prequalification-platform patterns (and Procore's trade-partner vetting) surface a contractor's standing directly at the point of bid review, not as a separate lookup. Matadora already tracks `subcontractors.status` (active/inactive/blacklisted) and `insurance_expiry`/`license_number`, plus `worker_certifications.expiry_date`. Surfacing a small "qualified / insurance expiring / blacklisted" badge next to each row in the bid list (computed from data already queried, no new writes) would flag risk before an investor/contractor picks a bid on price alone.
**Effort: Small** — read-only badge derived from existing columns.

---

## 2. Execution tracking (RFI / punch list / daily logs / submittals)

**Current state:** Matadora's execution modules (`rfis.ts`, `punch.ts`, `daily-reports.ts`, `submittals.ts`, `inspections.ts`, `safety.ts`) are structurally solid — proper status workflows, sequential numbering, Polish-specific enums (BHP, disciplines). But only `punch_items` carries a `photo_url` (plus `plan_x`/`plan_y` pin-on-plan coordinates); RFIs, daily reports, and inspections have no photo linkage at all, and the standalone photo gallery (`photos.ts`, table `project_photos`) only attaches to `project_id`, not to a specific RFI/inspection/report record. The punch-list photo `<input type="file">` has no `capture` attribute, and no offline/service-worker/IndexedDB pattern exists anywhere in the execution UI — confirmed by grep across the field-facing pages.

### 2.1 Universal photo/voice attachment shared across modules
Fieldwire and PlanRadar's core differentiator is that *every* ticket type (defect, RFI-equivalent, inspection) can carry photos, video, and voice notes, not just one module. Matadora could generalize `punch_items.photo_url` into a small polymorphic join (`entity_photos`: `entity_type`, `entity_id`, `photo_url`), reusing the existing `project-photos` storage bucket, and a shared `<PhotoAttach>` component wired into RFI, inspection, and daily-report forms — with `capture="environment"` added to the file input so mobile browsers open the camera directly instead of the file picker.
**Effort: Medium** — one small migration (join table) + one reusable component wired into 3–4 existing forms.

### 2.2 Offline-first field capture queue
Procore and Fieldwire's signature mobile pattern is downloading today's task list while connected, working with zero signal on-site, then syncing on reconnect — a real gap for Matadora today, since it has no offline handling at all. Given Matadora is a Next.js web app rather than a native app, the pragmatic first step is a PWA service worker + IndexedDB queue scoped to just punch-item creation (highest-frequency field action, already has photo + pin-on-plan fields): queue writes locally when `navigator.onLine` is false, auto-flush via `createPunchItem`/`uploadPunchPhoto` on reconnect.
**Effort: Large** — genuine new offline architecture (service worker registration, local queue, conflict/duplicate handling on sync).

### 2.3 One-tap status chips for field lists
Fieldwire's "two-step verification" close and PlanRadar's tap-to-pin flow both favor single-tap state changes over full edit forms while walking a site. Matadora's punch/RFI/inspection status transitions already exist as simple server actions (e.g. `updatePunchItemStatus`) but are reached through the same multi-field forms used for creation/editing. A mobile-optimized list view where tapping a status pill cycles it directly (open → in_progress → resolved) — reserving the full form for desktop review/detail editing — would cut the taps needed for the most common field action.
**Effort: Small–Medium** — new list-view component only; backend status-update actions already exist.

---

## 3. Subcontractor / crew management

**Current state:** `subcontractors.ts` (table `subcontractors`) tracks NIP/REGON, specialty, `insurance_expiry`, `license_number`, `status`, and a **single overwritable `rating` scalar** (confirmed: migration `0017_subcontractors_inspections_equipment_po.sql`, one `rating numeric(3,2)` column — no per-project review history table). `subcontractor_contracts` tracks per-project value/paid-to-date/retention but no completion rating. `worker-certifications.ts` (table `worker_certifications`) is genuinely strong — a rich Polish-specific cert-type enum (BHP, SEP-E/D, UDT, uprawnienia budowlane, scaffold, asbestos, crane, etc.) plus `listExpiringCertifications(daysAhead=60)` — but it's unclear from the code whether that expiry check is ever surfaced at the point of assigning someone to a project.

### 3.1 Per-project performance history instead of one overwritable score
Procore's trade-partner directory and Buildertrend's sub profiles build reputation from a history of per-job ratings, not a single mutable number. Replace/extend `subcontractors.rating` with a `subcontractor_reviews` table (`project_id`, `subcontractor_id`, `score`, `on_time` boolean, `quality_notes`, `created_at`), aggregating to a displayed average + trend on the subcontractor's profile — and feeding directly into the qualification badge proposed in 1.3, so bid review shows real track record, not a single unexplained number.
**Effort: Medium** — new table + migration, aggregate query, small UI addition to the existing subcontractor profile page.

### 3.2 Certification expiry surfaced at assignment time, not just in a list
`listExpiringCertifications(daysAhead=60)` already exists in `worker-certifications.ts` but appears to be a standalone report rather than a gate. Prequalification-platform patterns check credentials at the moment of assignment, not after the fact. Adding a check when assigning a worker to a crew/task (in `workforce.ts`/attendance flows) that warns if a required cert for that task type (e.g. SEP for electrical, UDT for crane operation) is expired or expiring within N days would catch compliance gaps before the shift starts rather than in a monthly report.
**Effort: Small** — reuses the existing query; adds a warning banner at one or two existing assignment call sites.

### 3.3 Subcontractor 360 scorecard
Buildertrend and Procore both roll qualification + financial + schedule signals into one trade-partner profile view. Matadora already has all the pieces spread across separate tables — `worker_certifications` status, the review history from 3.1, `subcontractor_contracts` completion history, and any `safety_observations` tied to their crew — but no single page aggregating them. A read-only subcontractor profile page combining these (no new mutations, just joins across existing tables) would replace manually checking four different screens before re-engaging a sub for a new project.
**Effort: Medium–Large** — pure aggregation/read view, but touches several existing tables.

---

## 4. Finance / cashflow visibility

**Current state:** This is Matadora's strongest hidden asset relative to the competitors reviewed — the *data model* is already comparable to Procore/Buildertrend's financial modules. `evm.ts` (table `evm_snapshots`) computes `sv`/`cv`/`spi`/`cpi` as genuine Postgres `generated always as` columns from manually-entered BAC/PV/EV/AC (migration `0024_pricebook_evm_drawings.sql`), `job-costing.ts` (table `job_cost_items`) tracks planned-vs-actual with a real `variance` column, `cashflow.ts` (table `cashflow_entries`) has planned-vs-actual by category with an `is_confirmed` flag, and `analytics.ts` aggregates portfolio-level budget/progress percentages. The gap is entirely on the *rendering* side: a repo-wide check found zero usage of any charting library — everything above is presented as numbers/cards in tables, never a chart.

### 4.1 EVM S-curve / trend chart
Buildertrend's and Procore's financial dashboards are built around the classic planned-vs-earned-vs-actual value curve over time. Matadora's `evm_snapshots` already stores everything needed (`bac`, `pv`, `ev`, `ac`, `cpi`, `spi` per snapshot date) — this is purely a frontend addition to the existing `evm-client.tsx` page: introduce a lightweight charting library and plot the existing snapshot series as an S-curve, with CPI/SPI as a secondary trend line.
**Effort: Small–Medium** — no schema or server-action change; one chart component consuming data already fetched.

### 4.2 Real-time cash position / forward-runway card
Buildertrend's Cashflow Report combines paid + partially-paid invoices/bills into a net cash position plus a forward-looking projection, rather than requiring the user to mentally net several reports together. Matadora's `cashflow_entries`, `invoices`, and `retention_payments` tables already hold the planned-vs-actual and confirmation-status data needed; a new aggregation server action combining the three into a single "cash on hand today + next 4/8 weeks projected" card at the top of `/dashboard/contractor/finanse` would surface the same insight Buildertrend markets, without any new source-of-truth tables.
**Effort: Medium** — new aggregation action across three existing tables, plus one summary/chart component.

### 4.3 Portfolio-level profitability heatmap
Buildertrend's Profitability Report compares expected/projected/actual profit across a contractor's entire job list in one view, so at-risk jobs surface without opening each one individually. `analytics.ts` already computes per-project `budget_pct`/`progress_pct`, and `finance.ts`'s `ProjectPnL` already computes margin — combining these with `job_cost_items` variance into a single portfolio table (color-coded by margin trend: on-track / watch / at-risk) on the contractor's main dashboard would turn three already-existing per-project data sources into one cross-project early-warning view.
**Effort: Medium** — aggregation across existing per-project functions; new dashboard widget, no new tables.

---

## Licensing / originality confirmation

Procore, Fieldwire (Hilti), PlanRadar, Buildertrend, and CoConstruct are all **closed-source commercial SaaS products** — none are AGPL/GPL/open-source, so there is no license-contamination risk of the kind flagged in the prior OpenConstructionERP research (which covered two AGPL-3.0 repositories). Only public marketing pages, help-center/support articles, and blog posts were consulted — no source code, no logged-in product areas, no gated documentation.

- Every description above is an original restatement of a *general UX pattern* observed across one or more of these products, not quoted or closely paraphrased marketing copy.
- All effort estimates and file/table references describe Matadora's own existing code (verified by reading the actual server actions and migrations listed above), not the competitors' implementations — none of the competitors' actual code or internal architecture was inspected (it isn't public).
- No files, text, or assets from any reviewed vendor were copied into this repository.

**Recommendation:** treat this document as backlog input only, to be read alongside `docs/research/openconstructionerp-analysis.md`. Priority-wise, the finance-visibility ideas (§4) are the cheapest wins given the data already exists — they're chart/aggregation work on top of a data model that's already there, whereas the marketplace and execution-tracking ideas (§1–§2) require new schema or genuinely new subsystems (offline sync in particular is a significant undertaking).
