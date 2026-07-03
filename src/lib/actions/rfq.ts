"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type RfqCategory = "materials" | "subcontract" | "equipment" | "services" | "other";
export type RfqStatus = "draft" | "sent" | "responses_received" | "awarded" | "cancelled";

export type RfqItem = {
  id: string; rfq_id: string; position: number;
  description: string; quantity: number | null; unit: string | null; notes: string | null;
};

export type RfqResponse = {
  id: string; rfq_id: string;
  supplier_name: string; supplier_email: string | null;
  total_amount: number | null; delivery_days: number | null;
  valid_until: string | null; notes: string | null;
  is_selected: boolean; received_at: string;
};

export type Rfq = {
  id: string; project_id: string; org_id: string; created_by: string | null;
  number: number; number_display: string;
  title: string; description: string | null; category: RfqCategory;
  status: RfqStatus; due_date: string | null;
  awarded_to: string | null; awarded_amount: number | null; notes: string | null;
  created_at: string; updated_at: string;
  items?: RfqItem[]; responses?: RfqResponse[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listRfqs(projectId: string): Promise<Rfq[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("rfqs").select("*, rfq_items(*), rfq_responses(*)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as Rfq[]).map((r) => ({
    ...r,
    items: (r.items ?? []).sort((a: RfqItem, b: RfqItem) => a.position - b.position),
  }));
}

export async function createRfq(input: {
  projectId: string; title: string; category?: RfqCategory;
  description?: string; dueDate?: string;
  items?: { description: string; quantity?: number; unit?: string }[];
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data: last } = await db(supabase).from("rfqs").select("number")
    .eq("project_id", input.projectId).order("number", { ascending: false }).limit(1).single();

  const { data, error } = await db(supabase).from("rfqs").insert({
    project_id: input.projectId, org_id: member.org_id, created_by: user.id,
    number: (last?.number ?? 0) + 1,
    title: input.title, category: input.category ?? "materials",
    description: input.description ?? null,
    due_date: input.dueDate ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };

  if (input.items && input.items.length > 0) {
    await db(supabase).from("rfq_items").insert(
      input.items.map((item, i) => ({
        rfq_id: data.id, position: (i + 1) * 10,
        description: item.description,
        quantity: item.quantity ?? null, unit: item.unit ?? null,
      }))
    );
  }
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/rfq`);
  return { ok: true, id: data.id };
}

export async function addRfqResponse(input: {
  rfqId: string; projectId: string;
  supplierName: string; supplierEmail?: string;
  totalAmount?: number; deliveryDays?: number;
  validUntil?: string; notes?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("rfq_responses").insert({
    rfq_id: input.rfqId,
    supplier_name: input.supplierName, supplier_email: input.supplierEmail ?? null,
    total_amount: input.totalAmount ?? null, delivery_days: input.deliveryDays ?? null,
    valid_until: input.validUntil ?? null, notes: input.notes ?? null,
  });
  if (error) return { ok: false, error: error.message };
  await db(supabase).from("rfqs").update({ status: "responses_received", updated_at: new Date().toISOString() }).eq("id", input.rfqId);
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/rfq`);
  return { ok: true };
}

export async function awardRfq(
  rfqId: string, responseId: string, projectId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: resp } = await db(supabase).from("rfq_responses").select("supplier_name, total_amount").eq("id", responseId).single();
  if (!resp) return { ok: false, error: "Brak odpowiedzi" };
  await db(supabase).from("rfq_responses").update({ is_selected: false }).neq("id", responseId).eq("rfq_id", rfqId);
  await db(supabase).from("rfq_responses").update({ is_selected: true }).eq("id", responseId);
  const { error } = await db(supabase).from("rfqs").update({
    status: "awarded", awarded_to: resp.supplier_name,
    awarded_amount: resp.total_amount, updated_at: new Date().toISOString(),
  }).eq("id", rfqId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/rfq`);
  return { ok: true };
}

export async function updateRfqStatus(
  rfqId: string, projectId: string, status: RfqStatus
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("rfqs").update({ status, updated_at: new Date().toISOString() }).eq("id", rfqId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/rfq`);
  return { ok: true };
}
