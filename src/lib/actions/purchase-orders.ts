"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type POStatus =
  | "draft" | "sent" | "confirmed" | "partial" | "delivered" | "invoiced" | "cancelled";

export type POItem = {
  id: string;
  po_id: string;
  sort_order: number;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  net_amount: number;
  gross_amount: number;
  delivered_qty: number;
  notes: string | null;
};

export type PurchaseOrder = {
  id: string;
  project_id: string;
  org_id: string;
  created_by: string | null;
  number: number;
  number_display: string;
  supplier_name: string;
  supplier_nip: string | null;
  supplier_contact: string | null;
  order_date: string;
  expected_delivery: string | null;
  actual_delivery: string | null;
  status: POStatus;
  net_total: number;
  vat_total: number;
  gross_total: number;
  paid_amount: number;
  payment_terms: string | null;
  delivery_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: POItem[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listPurchaseOrders(projectId: string): Promise<PurchaseOrder[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("purchase_orders")
    .select("*, items:purchase_order_items(*)")
    .eq("project_id", projectId)
    .order("number", { ascending: false });
  if (error) return [];
  return (data ?? []) as PurchaseOrder[];
}

export async function createPurchaseOrder(input: {
  projectId: string;
  supplierName: string;
  supplierNip?: string;
  supplierContact?: string;
  orderDate?: string;
  expectedDelivery?: string;
  paymentTerms?: string;
  deliveryAddress?: string;
  notes?: string;
  items: Array<{
    description: string;
    unit?: string;
    quantity: number;
    unitPrice: number;
    vatRate?: number;
    notes?: string;
  }>;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data: last } = await db(supabase)
    .from("purchase_orders").select("number").eq("project_id", input.projectId)
    .order("number", { ascending: false }).limit(1).single();

  const netTotal = input.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const vatTotal = input.items.reduce((s, i) => s + i.quantity * i.unitPrice * ((i.vatRate ?? 23) / 100), 0);
  const grossTotal = netTotal + vatTotal;

  const { data, error } = await db(supabase).from("purchase_orders").insert({
    project_id: input.projectId, org_id: member.org_id, created_by: user.id,
    number: (last?.number ?? 0) + 1,
    supplier_name: input.supplierName, supplier_nip: input.supplierNip ?? null,
    supplier_contact: input.supplierContact ?? null,
    order_date: input.orderDate ?? new Date().toISOString().slice(0, 10),
    expected_delivery: input.expectedDelivery ?? null,
    payment_terms: input.paymentTerms ?? null,
    delivery_address: input.deliveryAddress ?? null,
    notes: input.notes ?? null,
    net_total: netTotal, vat_total: vatTotal, gross_total: grossTotal,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };

  if (input.items.length > 0) {
    const itemRows = input.items.map((it, idx) => ({
      po_id: data.id, sort_order: idx,
      description: it.description, unit: it.unit ?? "szt",
      quantity: it.quantity, unit_price: it.unitPrice,
      vat_rate: it.vatRate ?? 23, notes: it.notes ?? null,
    }));
    await db(supabase).from("purchase_order_items").insert(itemRows);
  }

  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/zamowienia`);
  return { ok: true, id: data.id };
}

export async function updatePOStatus(
  id: string, projectId: string, status: POStatus
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const extraFields = status === "delivered" ? { actual_delivery: new Date().toISOString().slice(0, 10) } : {};
  const { error } = await db(supabase)
    .from("purchase_orders")
    .update({ status, updated_at: new Date().toISOString(), ...extraFields })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/zamowienia`);
  return { ok: true };
}

export async function deletePO(id: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("purchase_orders").delete().eq("id", id).eq("status", "draft");
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/zamowienia`);
  return { ok: true };
}
