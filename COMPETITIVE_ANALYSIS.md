# BuildMate — Competitive Analysis & Differentiators

*Last updated: May 2025*

---

## 1. Landscape Overview

| Product | Region | Core Focus | Funding | Key Gap |
|---|---|---|---|---|
| **Procore** | Global (US-led) | Project mgmt, documentation, quality | $1.9 B raised | $500+/mo; no marketplace; no wholesaler network |
| **Autodesk Build** | Global | BIM-centric, docs, RFIs | Enterprise | Pure docs tool; no payments/payroll |
| **CoConstruct** | US/CA | Residential builders | Acq. by Buildertrend | No marketplace; no material import |
| **Buildertrend** | US | Residential contractors | $1.6 B IPO track | US-only; no ERP finance layer |
| **Tradify** | ANZ/UK | Trades job mgmt | Series A | No investor view; no marketplace |
| **PlanRadar** | EU/CEE | Defect & punch-list | $69 M raised | No marketplace; no payroll/P&L |
| **e-Constructor** | PL/CEE | Construction ERP | Bootstrap | Legacy UX; no marketplace; no crews |
| **Asana / Monday** | Global | Generic PM | Huge | Not ConTech-specific |

---

## 2. Feature Matrix

| Feature | BuildMate | Procore | PlanRadar | e-Constructor |
|---|:---:|:---:|:---:|:---:|
| Investor ↔ Contractor marketplace | ✅ | ❌ | ❌ | ❌ |
| Branded PDF offers with VAT | ✅ | ❌ | ❌ | ⚠️ |
| Wholesaler catalog & CSV import | ✅ | ❌ | ❌ | ⚠️ |
| Trust & rating system | ✅ | ❌ | ❌ | ❌ |
| Organization multi-user (RLS) | ✅ | ✅ | ✅ | ⚠️ |
| Workforce (workers, crews) | ✅ | ⚠️ | ❌ | ✅ |
| Field execution board (kanban) | ✅ | ✅ | ✅ | ⚠️ |
| Photo progress updates | ✅ | ✅ | ✅ | ❌ |
| Time tracking + payroll P&L | ✅ | ⚠️ | ❌ | ✅ |
| Investor read-only execution view | ✅ | ❌ | ❌ | ❌ |
| Profit & Loss dashboard | ✅ | ⚠️ | ❌ | ⚠️ |
| Row-level security per role | ✅ | ✅ | ⚠️ | ❌ |
| Self-hosted / open stack | ✅ | ❌ | ❌ | ❌ |
| CEE market pricing | ✅ | ❌ | ⚠️ | ✅ |

---

## 3. BuildMate Unique Differentiators

### 3.1 Four-sided Marketplace Network
Procore and PlanRadar serve contractors only. BuildMate connects **investors, contractors, wholesalers, and crews** in one authenticated, role-gated network. This creates network effects: more investors attract contractors, more contractors attract wholesalers.

### 3.2 End-to-end Deal Flow
From investor project creation → marketplace discovery → contractor bidding → branded PDF offer with materials → one-click acceptance → order generation for wholesalers → execution board → investor real-time progress view → P&L close. No other CEE product covers this full loop.

### 3.3 Transparency for Capital
Investors get a live read-only progress portal showing tasks, photo diary, and financial P&L vs. contract value. This is a key selling point for developer-led projects where accountability to stakeholders is mandatory.

### 3.4 Built-in Supply Chain
Native wholesaler catalog with CSV import and price-history logging means a contractor can embed live material costs in their offer and generate purchase orders automatically on acceptance. Competitors require external ERP integration.

### 3.5 Trust Economy
Rating aggregation triggers, verified badges, and public firm profiles let the market self-regulate quality. This is absent from every CEE ConTech product surveyed.

### 3.6 Modern Stack at SME Price
Next.js 14 + Supabase enables startup-cost deployment (<$50/mo) while providing enterprise-grade RLS, real-time, and storage. The major players charge $500–5000/mo per project.

---

## 4. Implemented Differentiators Checklist

- [x] Marketplace with role-based discovery
- [x] Branded PDF export for offers
- [x] Wholesaler CSV import with price history
- [x] Trust system (ratings, verified badge, public profiles)
- [x] Organization multi-tenancy with invitations
- [x] Workforce management (workers, crews, assignments)
- [x] Field execution kanban with photo updates
- [x] Time tracking + project expenses
- [x] P&L dashboard (budget vs. actual, margin %)
- [x] Investor read-only execution + financial view
- [ ] Native mobile PWA (roadmap)
- [ ] Milestone-linked payment schedule (roadmap)
- [ ] BIM file viewer (roadmap)
- [ ] E-signature on offers (roadmap)

---

## 5. Go-to-Market Positioning

> **"BuildMate is the only ConTech platform in CEE that connects all four parties — investors, contractors, wholesalers, and crews — in one transparent, real-time execution network."**

**Target beachhead:** Mid-market residential developers in Poland, Ukraine, and Baltic states who manage 5–50 projects/year and need contractor accountability without €5 000/mo software budgets.

**Land-and-expand:** Start with the contractor (high ROI on offer creation and trusted profile) → pull in their investor clients (transparency pull) → add wholesalers (supply savings pull).
