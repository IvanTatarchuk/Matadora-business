"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type BoqStatus = "draft" | "approved" | "locked" | "superseded";
export type BoqCategory = "labor" | "materials" | "equipment" | "subcontract" | "other";

export type BoqDocument = {
  id: string; project_id: string; org_id: string; created_by: string | null;
  title: string; description: string | null; version: string;
  status: BoqStatus; currency: string; notes: string | null;
  created_at: string; updated_at: string;
};

export type BoqItem = {
  id: string; document_id: string; project_id: string; org_id: string;
  pricebook_item_id: string | null;
  position_no: string; section: string | null; subsection: string | null;
  description: string; knr_code: string | null;
  category: BoqCategory; unit: string;
  quantity: number; unit_price: number; vat_rate: number;
  total_net: number; total_vat: number; total_gross: number;
  quantity_formula: string | null; sort_order: number; notes: string | null;
  created_at: string; updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listBoqDocuments(projectId: string): Promise<BoqDocument[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("boq_documents").select("*").eq("project_id", projectId)
    .neq("status", "superseded").order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as BoqDocument[];
}

export async function getBoqItems(documentId: string): Promise<BoqItem[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("boq_items").select("*").eq("document_id", documentId)
    .order("sort_order").order("position_no");
  if (error) return [];
  return (data ?? []) as BoqItem[];
}

export async function createBoqDocument(input: {
  projectId: string; title: string; description?: string; version?: string; notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("boq_documents").insert({
    project_id: input.projectId, org_id: member.org_id, created_by: user.id,
    title: input.title, description: input.description ?? null,
    version: input.version ?? "1.0", notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/przedmiar`);
  return { ok: true, id: data.id };
}

export async function addBoqItem(input: {
  documentId: string; projectId: string;
  positionNo: string; section?: string; subsection?: string;
  description: string; knrCode?: string; category?: BoqCategory;
  unit: string; quantity: number; unitPrice: number; vatRate?: number;
  quantityFormula?: string; notes?: string; sortOrder?: number;
  pricebookItemId?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("boq_items").insert({
    document_id: input.documentId, project_id: input.projectId,
    org_id: member.org_id, pricebook_item_id: input.pricebookItemId ?? null,
    position_no: input.positionNo, section: input.section ?? null,
    subsection: input.subsection ?? null, description: input.description,
    knr_code: input.knrCode ?? null, category: input.category ?? "labor",
    unit: input.unit, quantity: input.quantity, unit_price: input.unitPrice,
    vat_rate: input.vatRate ?? 23,
    quantity_formula: input.quantityFormula ?? null,
    sort_order: input.sortOrder ?? 0, notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/przedmiar`);
  return { ok: true, id: data.id };
}

export async function updateBoqItem(
  id: string, projectId: string,
  updates: Partial<{ quantity: number; unitPrice: number; description: string; notes: string }>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.quantity !== undefined) payload.quantity = updates.quantity;
  if (updates.unitPrice !== undefined) payload.unit_price = updates.unitPrice;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  const { error } = await db(supabase).from("boq_items").update(payload).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/przedmiar`);
  return { ok: true };
}

export async function deleteBoqItem(id: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("boq_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/przedmiar`);
  return { ok: true };
}

export async function updateBoqStatus(
  id: string, projectId: string, status: BoqStatus
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("boq_documents").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/przedmiar`);
  return { ok: true };
}
