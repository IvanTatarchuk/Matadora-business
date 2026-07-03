"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { OrderStatus, StockStatus } from "@/types/database";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface MaterialInput {
  product_name: string;
  sku?: string;
  price_net: number;
  unit: string;
  stock_status: StockStatus;
}

/** Wholesaler creates a catalog product (RLS scopes it to the current user). */
export async function createMaterial(
  input: MaterialInput
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (!input.product_name.trim()) {
    return { ok: false, error: "Product name is required" };
  }

  const { error } = await supabase.from("materials_catalog").insert({
    wholesaler_id: user.id,
    product_name: input.product_name.trim(),
    sku: input.sku?.trim() || null,
    price_net: Number(input.price_net) || 0,
    unit: input.unit?.trim() || "szt",
    stock_status: input.stock_status,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/wholesaler/catalog");
  return { ok: true };
}

/** Wholesaler updates one of their catalog products. */
export async function updateMaterial(
  id: string,
  input: MaterialInput
): Promise<ActionResult> {
  const supabase = createClient();

  const { error } = await supabase
    .from("materials_catalog")
    .update({
      product_name: input.product_name.trim(),
      sku: input.sku?.trim() || null,
      price_net: Number(input.price_net) || 0,
      unit: input.unit?.trim() || "szt",
      stock_status: input.stock_status,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/wholesaler/catalog");
  return { ok: true };
}

/** Wholesaler deletes one of their catalog products. */
export async function deleteMaterial(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("materials_catalog")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/wholesaler/catalog");
  return { ok: true };
}

/** Wholesaler advances the status of an incoming order. */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/wholesaler/orders");
  revalidatePath("/dashboard/wholesaler");
  return { ok: true };
}
