# Research: OpenConstructionERP feature analysis

**Date:** 2026-07-03
**Author:** Automated research (Claude Code)
**Purpose:** Survey two AGPL-3.0 open-source construction-estimation projects for UX/feature *ideas* to inform Matadora's `/kosztorys` roadmap. This document contains **no copied code and no copied text** — see the licensing note at the end.

Sources reviewed (README, docs, and repo/module structure only — no source code was read line-by-line):
- https://github.com/datadrivenconstruction/OpenConstructionERP
- https://github.com/ptak82/OpenConstructionERPPL (Polish-focused fork)

---

## 1. What each project does (plain-language summary)

**OpenConstructionERP** is a broad, self-hosted construction-project-management suite (Python/FastAPI backend, React/TypeScript frontend). Its estimating module lets a user build a cost estimate either by hand, by importing a CAD/BIM model (Revit, IFC, AutoCAD, MicroStation), or by uploading PDFs/photos and having an AI assistant draft line items. Estimates are organized as a hierarchical bill of quantities (sections → positions → sub-positions) backed by a large shared catalog of reusable cost items and material/labor rates, tagged to ~30 different national/regional costing standards (UK NRM, German DIN 276, US CSI MasterFormat, etc.). Beyond estimating, it covers scheduling, tendering, change orders, site diaries, and other full-ERP construction-management functions — i.e. it's a much larger product surface than Matadora's estimate builder alone.

**OpenConstructionERPPL** is a fork of the same codebase repositioned around a very large (55,000+ item) multi-regional cost-item database and adds Poland as one of the ~20 recognized regional standards (referencing the Polish KNR/KNNR classification system, though the fork's public materials don't go deep into Polish-specific pricing or KSeF/VAT handling — that appears to be a thin addition rather than a fully localized Polish product). Its core differentiators over the parent project are the scale of the pre-loaded cost database and a "semantic search" layer for finding cost items by meaning rather than exact keyword, plus a tendering module built around comparing multiple contractor bids side by side.

Both projects are aimed at professional quantity surveyors / cost estimators managing large multi-trade projects — a heavier, more BIM-centric workflow than Matadora's lightweight browser-based kosztorys tool, which targets fast estimate creation for small-to-mid renovation/construction jobs without requiring CAD files.

## 2. Feature/UX ideas for Matadora's kosztorys module

Each idea below is my own restatement of a *concept* observed in the two products, adapted to fit Matadora's existing Next.js + Supabase architecture and its `computeOfferTotals()` / stage-based offer model — not a description of their implementation.

### 2.1 Hierarchical grouping of line items (sections)
Today `/kosztorys` (`src/app/kosztorys/page.tsx`) holds a flat array of `LineItem`s with no grouping, and `computeOfferTotals()` sums a flat `stages` list. Both reference projects present a BOQ as nested sections (e.g. "Bathroom → Demolition → Tiling") so large estimates stay scannable and sub-totals are visible per trade/room. Matadora could add an optional `group` field to line items (client-side, rendered as collapsible headers with a section subtotal) and carry that grouping into `offer_stages` as a `parent_stage_id` or `group_label` column.
**Effort: Medium** — UI regrouping/collapse logic is straightforward, but requires a small schema addition (nullable grouping column) and a migration, plus updates to PDF/offer rendering.

### 2.2 Larger, searchable cost-item catalog with fuzzy/semantic search
The current `KNR_ITEMS` catalog is a 12-entry hardcoded array with plain substring search. The competitor products emphasize large (thousands+) catalogs with search that matches by meaning, not just exact text (e.g. finding "tile floor" results when searching "posadzka ceramiczna"). Matadora could move the KNR catalog into a proper `cost_items` Supabase table (still just labor/material reference rates, curated independently — not copied from either project's database) and add either Postgres full-text search (`tsvector`, quick win) or pgvector embeddings for true semantic matching over time.
**Effort: Small (full-text search on a DB table) to Large (if adding vector/embedding-based semantic search).**

### 2.3 "Price mirror" bid comparison view for `/przetargi`
Matadora already runs a tender/marketplace flow where an investor collects contractor bids. Neither product's exact UI was inspected, but the general pattern — laying multiple bids for the same scope side-by-side in a single comparison table (same stages as rows, one column per contractor, cost delta highlighted) — is a well-known technique that would help investors evaluate competing offers on `/przetargi` faster than reviewing them one at a time.
**Effort: Medium** — mostly a new read-only aggregation view/query joining existing `offers`/`offer_stages` rows per project; no new write paths needed.

### 2.4 Scale-calibrated PDF markup/measurement, building on the existing AI PDF analysis
Matadora's kosztorys already has an AI PDF-to-line-items feature (`/api/kosztorys/analyze-pdf`) that extracts a summary and suggested items from an uploaded PDF. The reference products go a step further by rendering the PDF in-browser with drawing tools that let a user calibrate a known scale (e.g. click two points and enter "this is 5m") and then measure areas/lengths directly on the drawing, feeding quantities straight into line items. Adding a lightweight canvas-based measurement layer on top of the existing PDF upload would let users get quantities without relying solely on the AI extraction, and would help validate/adjust AI-suggested quantities visually.
**Effort: Large** — needs a PDF-to-canvas rendering pipeline (e.g. pdf.js), scale-calibration UX, and persistence of markup annotations; a genuinely new subsystem.

### 2.5 Estimate sanity/validation checks before submission
The reference products run a bank of built-in validation rules against a BOQ (e.g. flagging a zero quantity, a rate far outside typical range, or a missing VAT rate) before an estimate is finalized. Matadora's `computeOfferTotals()` currently does no validation beyond `Number(s.cost) || 0`. A small rule set — warn on qty = 0, rate = 0, outlier rate vs. the `cost_items` catalog average for that KNR code, or missing project/client name — surfaced as inline warnings before "Utwórz ofertę" would catch mistakes early and reduce disputed offers downstream.
**Effort: Small** — pure client-side/server-action logic against data Matadora already has; no schema changes required.

### 2.6 Rate-catalog versioning by quarter/region (SEKOCENBUD-style freshness)
Matadora's info banner already warns that KNR rates shown are "orientacyjne… region centralny, Q1 2026" and static in code. Both reference projects tie their catalogs to versioned, dated regional pricing sets. Matadora could formalize this by storing `cost_items` with a `region` and `valid_from`/`quarter` column, letting an admin (or scheduled job) publish a new rate set each quarter without a code deploy, and showing users which pricing period their estimate was built against — turning today's static disclaimer into an actual data-freshness feature.
**Effort: Medium** — requires the `cost_items` table from 2.2 plus a simple admin update flow; can ship incrementally after 2.2.

## 3. Licensing / originality confirmation

Both `datadrivenconstruction/OpenConstructionERP` and `ptak82/OpenConstructionERPPL` are licensed **AGPL-3.0**. AGPL requires that any service built using their source code (even as a network-accessible SaaS, not just distributed binaries) must have its own complete source made available under AGPL-3.0 — copying their code or verbatim documentation into Matadora would create an obligation to open-source the entire Matadora codebase, which is not acceptable for this proprietary product.

To avoid any such risk:
- This document was produced by reading only the public README/documentation and high-level repo/module structure of both projects (via web fetch), **not** their source code.
- Every description above is my own paraphrase of concepts and product behavior, written independently, with no verbatim sentences, code snippets, file contents, or database entries copied from either repository.
- All effort estimates and adaptation notes describe how a similar *concept* could be built independently on Matadora's existing Next.js + Supabase stack — none of the proposed implementations reuse or reference the other projects' actual code, schemas, or datasets.
- No files from either repository were copied into this repository at any point.

**Recommendation:** treat this document as backlog input only. Any future implementation of these ideas should be built from scratch against Matadora's own requirements, without consulting the AGPL-licensed source further than the public README-level material already summarized here.
