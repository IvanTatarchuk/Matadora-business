"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { StockStatus } from "@/types/database";

export interface ImportItem {
  product_name: string;
  sku?: string | null;
  external_id?: string | null;
  price_net: number;
  unit?: string | null;
  stock_status?: StockStatus | null;
}

export interface CommitImportPayload {
  supplierId?: string;
  supplierName?: string;
  filename?: string;
  items: ImportItem[];
}

export interface ImportResult {
  ok: boolean;
  error?: string;
  created?: number;
  updated?: number;
  skipped?: number;
}

const DEFAULT_UNIT = "szt";
const DEFAULT_STOCK: StockStatus = "in_stock";
const MAX_ROWS = 5000;

/** Returns the current wholesaler's saved suppliers. */
export async function listSuppliers() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("name");
  return data ?? [];
}

/**
 * Upserts catalog rows from an uploaded price list. Matching is by SKU (then
 * external_id) scoped to the wholesaler; existing rows are price-updated and a
 * price_history entry is recorded when the price changes. The whole run is
 * logged as an import_job.
 */
export async function commitImport(
  payload: CommitImportPayload
): Promise<ImportResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const items = (payload.items ?? [])
    .map((it) => ({
      product_name: (it.product_name ?? "").trim(),
      sku: (it.sku ?? "").toString().trim() || null,
      external_id: (it.external_id ?? "").toString().trim() || null,
      price_net: Number(it.price_net) || 0,
      unit: (it.unit ?? "").toString().trim() || DEFAULT_UNIT,
      stock_status: (it.stock_status ?? DEFAULT_STOCK) as StockStatus,
    }))
    .filter((it) => it.product_name.length > 0);

  if (items.length === 0) {
    return { ok: false, error: "Brak poprawnych wierszy do zaimportowania" };
  }
  if (items.length > MAX_ROWS) {
    return { ok: false, error: `Zbyt wiele wierszy (maks. ${MAX_ROWS})` };
  }

  // Resolve / create the supplier.
  let supplierId = payload.supplierId ?? null;
  if (!supplierId && payload.supplierName?.trim()) {
    const { data: sup, error: supErr } = await supabase
      .from("suppliers")
      .insert({ owner_id: user.id, name: payload.supplierName.trim() })
      .select("id")
      .single();
    if (supErr) return { ok: false, error: supErr.message };
    supplierId = sup.id;
  }

  // Load existing catalog rows for matching.
  const { data: existing, error: exErr } = await supabase
    .from("materials_catalog")
    .select("id, sku, external_id, price_net")
    .eq("wholesaler_id", user.id);
  if (exErr) return { ok: false, error: exErr.message };

  const bySku = new Map<string, { id: string; price_net: number }>();
  const byExt = new Map<string, { id: string; price_net: number }>();
  for (const row of existing ?? []) {
    if (row.sku) bySku.set(row.sku, { id: row.id, price_net: Number(row.price_net) });
    if (row.external_id)
      byExt.set(row.external_id, { id: row.id, price_net: Number(row.price_net) });
  }

  const now = new Date().toISOString();
  const inserts: Record<string, unknown>[] = [];
  const updates: { id: string; price_net: number; prev: number }[] = [];

  for (const it of items) {
    const match =
      (it.sku && bySku.get(it.sku)) ||
      (it.external_id && byExt.get(it.external_id)) ||
      null;

    if (match) {
      updates.push({ id: match.id, price_net: it.price_net, prev: match.price_net });
      // Update descriptive fields too (price + meta).
      await supabase
        .from("materials_catalog")
        .update({
          product_name: it.product_name,
          unit: it.unit,
          stock_status: it.stock_status,
          price_net: it.price_net,
          external_id: it.external_id,
          supplier_id: supplierId,
          source: "csv",
          price_updated_at: now,
        })
        .eq("id", match.id);
    } else {
      inserts.push({
        wholesaler_id: user.id,
        product_name: it.product_name,
        sku: it.sku,
        external_id: it.external_id,
        price_net: it.price_net,
        unit: it.unit,
        stock_status: it.stock_status,
        supplier_id: supplierId,
        source: "csv",
        price_updated_at: now,
      });
    }
  }

  let createdIds: { id: string; price_net: number }[] = [];
  if (inserts.length > 0) {
    const { data: insData, error: insErr } = await supabase
      .from("materials_catalog")
      .insert(inserts as never)
      .select("id, price_net");
    if (insErr) return { ok: false, error: insErr.message };
    createdIds = (insData ?? []).map((r) => ({
      id: r.id,
      price_net: Number(r.price_net),
    }));
  }

  // Record price history for new rows and for changed prices.
  const history = [
    ...createdIds.map((r) => ({
      material_id: r.id,
      wholesaler_id: user.id,
      price_net: r.price_net,
      recorded_at: now,
    })),
    ...updates
      .filter((u) => u.price_net !== u.prev)
      .map((u) => ({
        material_id: u.id,
        wholesaler_id: user.id,
        price_net: u.price_net,
        recorded_at: now,
      })),
  ];
  if (history.length > 0) {
    await supabase.from("price_history").insert(history as never);
  }

  // Log the import job.
  await supabase.from("import_jobs").insert({
    wholesaler_id: user.id,
    supplier_id: supplierId,
    filename: payload.filename ?? null,
    total_rows: items.length,
    created_count: inserts.length,
    updated_count: updates.length,
    skipped_count: 0,
    status: "completed",
  });

  revalidatePath("/dashboard/wholesaler/catalog");
  revalidatePath("/dashboard/wholesaler/import");

  return {
    ok: true,
    created: inserts.length,
    updated: updates.length,
    skipped: 0,
  };
}
