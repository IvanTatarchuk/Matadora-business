"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type PricebookCategory = "labor" | "materials" | "equipment" | "subcontract" | "service" | "other";

export type PricebookItem = {
  id: string; org_id: string; created_by: string | null;
  code: string | null; name: string; description: string | null;
  category: PricebookCategory; unit: string; unit_price: number;
  currency: string; vat_rate: number;
  knr_code: string | null; knr_description: string | null;
  is_active: boolean; tags: string[]; notes: string | null;
  created_at: string; updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listPricebookItems(search?: string, category?: PricebookCategory): Promise<PricebookItem[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  let q = db(supabase).from("pricebook_items").select("*")
    .eq("org_id", member.org_id).eq("is_active", true);
  if (category) q = q.eq("category", category);
  if (search) q = q.ilike("name", `%${search}%`);
  const { data, error } = await q.order("category").order("name");
  if (error) return [];
  return (data ?? []) as PricebookItem[];
}

export async function createPricebookItem(input: {
  code?: string; name: string; description?: string;
  category?: PricebookCategory; unit?: string; unitPrice: number;
  vatRate?: number; knrCode?: string; knrDescription?: string;
  tags?: string[]; notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("pricebook_items").insert({
    org_id: member.org_id, created_by: user.id,
    code: input.code ?? null, name: input.name,
    description: input.description ?? null,
    category: input.category ?? "labor", unit: input.unit ?? "szt.",
    unit_price: input.unitPrice, vat_rate: input.vatRate ?? 23,
    knr_code: input.knrCode ?? null, knr_description: input.knrDescription ?? null,
    tags: input.tags ?? [], notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/cennik");
  return { ok: true, id: data.id };
}

export async function updatePricebookItem(
  id: string, updates: Partial<{ name: string; unitPrice: number; unit: string; description: string; isActive: boolean }>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.unitPrice !== undefined) payload.unit_price = updates.unitPrice;
  if (updates.unit !== undefined) payload.unit = updates.unit;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;
  const { error } = await db(supabase).from("pricebook_items").update(payload).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/cennik");
  return { ok: true };
}

export async function deletePricebookItem(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("pricebook_items").update({ is_active: false }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/cennik");
  return { ok: true };
}
