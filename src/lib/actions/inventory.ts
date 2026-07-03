"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type InventoryItem = {
  id: string;
  org_id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  max_stock_level: number | null;
  unit_cost: number | null;
  total_value: number;
  location: string | null;
  supplier_id: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryTransaction = {
  id: string;
  item_id: string;
  org_id: string;
  type: "purchase" | "sale" | "transfer" | "adjustment" | "consumption" | "return";
  quantity: number;
  unit_cost: number | null;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type InventoryReservation = {
  id: string;
  item_id: string;
  project_id: string | null;
  offer_id: string | null;
  quantity: number;
  reserved_at: string;
  expires_at: string | null;
  status: "reserved" | "allocated" | "released" | "expired";
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listInventoryItems(): Promise<InventoryItem[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("inventory_items")
    .select("*")
    .eq("org_id", member.org_id)
    .order("name", { ascending: true });

  if (error) return [];
  return (data ?? []) as InventoryItem[];
}

export async function createInventoryItem(input: {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  minStockLevel?: number;
  maxStockLevel?: number;
  unitCost?: number;
  location?: string;
  supplierId?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("inventory_items").insert({
    org_id: member.org_id,
    sku: input.sku,
    name: input.name,
    description: input.description ?? null,
    category: input.category ?? null,
    unit: input.unit ?? "szt",
    min_stock_level: input.minStockLevel ?? 0,
    max_stock_level: input.maxStockLevel ?? null,
    unit_cost: input.unitCost ?? null,
    location: input.location ?? null,
    supplier_id: input.supplierId ?? null,
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/inventory");
  return { ok: true, id: data.id };
}

export async function createInventoryTransaction(input: {
  itemId: string;
  type: "purchase" | "sale" | "transfer" | "adjustment" | "consumption" | "return";
  quantity: number;
  unitCost?: number;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { error } = await db(supabase).from("inventory_transactions").insert({
    item_id: input.itemId,
    org_id: member.org_id,
    type: input.type,
    quantity: input.quantity,
    unit_cost: input.unitCost ?? null,
    reference_id: input.referenceId ?? null,
    reference_type: input.referenceType ?? null,
    notes: input.notes ?? null,
    created_by: user.id,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/inventory");
  return { ok: true };
}

export async function listInventoryTransactions(itemId?: string): Promise<InventoryTransaction[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  let query = db(supabase)
    .from("inventory_transactions")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (itemId) {
    query = query.eq("item_id", itemId);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as InventoryTransaction[];
}

export async function reserveInventory(input: {
  itemId: string;
  projectId?: string;
  offerId?: string;
  quantity: number;
  expiresAt?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowано" };

  const { error } = await db(supabase).from("inventory_reservations").insert({
    item_id: input.itemId,
    project_id: input.projectId ?? null,
    offer_id: input.offerId ?? null,
    quantity: input.quantity,
    expires_at: input.expiresAt ?? null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/inventory");
  return { ok: true };
}

export async function updateInventoryItem(
  id: string,
  updates: Partial<{
    name: string;
    description: string;
    category: string;
    unit: string;
    min_stock_level: number;
    max_stock_level: number;
    unit_cost: number;
    location: string;
  }>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("inventory_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/inventory");
  return { ok: true };
}

export async function getLowStockItems(): Promise<InventoryItem[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("inventory_items")
    .select("*")
    .eq("org_id", member.org_id)
    .lte("current_stock", db(supabase).raw("min_stock_level"))
    .order("current_stock", { ascending: true });

  if (error) return [];
  return (data ?? []) as InventoryItem[];
}
