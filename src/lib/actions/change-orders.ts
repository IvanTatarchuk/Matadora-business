"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ChangeOrderReason =
  | "client_request" | "scope_change" | "design_change" | "unforeseen_conditions"
  | "material_price_change" | "force_majeure" | "site_conditions"
  | "regulatory_change" | "other";

export type ChangeOrderStatus =
  | "draft" | "pending_approval" | "approved" | "rejected" | "withdrawn";

export type ChangeOrder = {
  id: string;
  project_id: string;
  contractor_id: string;
  number: number;
  number_display: string;
  title: string;
  description: string | null;
  reason: ChangeOrderReason;
  change_type: "additive" | "deductive" | "neutral";
  amount_net: number;
  vat_rate: number;
  amount_gross: number;
  schedule_days: number;
  status: ChangeOrderStatus;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
  legal_basis: string | null;
  previous_contract_value: number | null;
  new_contract_value: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  approver_name?: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: any) => supabase as any;

export async function listChangeOrders(projectId: string): Promise<ChangeOrder[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("change_orders")
    .select("*, approver:approved_by(full_name)")
    .eq("project_id", projectId)
    .order("number", { ascending: true });

  if (error) return [];
  return (data ?? []).map((d: Record<string, unknown>) => ({
    ...d,
    approver_name: (d.approver as { full_name?: string } | null)?.full_name ?? null,
  })) as ChangeOrder[];
}

export async function createChangeOrder(input: {
  projectId: string;
  title: string;
  description?: string;
  reason: ChangeOrderReason;
  changeType?: "additive" | "deductive" | "neutral";
  amountNet: number;
  vatRate?: number;
  scheduleDays?: number;
  legalBasis?: string;
  notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  // Get next number for this project
  const { data: last } = await db(supabase)
    .from("change_orders")
    .select("number")
    .eq("project_id", input.projectId)
    .order("number", { ascending: false })
    .limit(1)
    .single();

  const nextNumber = (last?.number ?? 0) + 1;

  // Get current contract value (sum of approved COs + original budget)
  const { data: project } = await supabase
    .from("projects")
    .select("budget_min, budget_max")
    .eq("id", input.projectId)
    .single();

  const baseValue = Number(project?.budget_max ?? project?.budget_min ?? 0);

  const { data: approvedCOs } = await db(supabase)
    .from("change_orders")
    .select("amount_net, vat_rate, change_type")
    .eq("project_id", input.projectId)
    .eq("status", "approved");

  const approvedTotal = (approvedCOs ?? []).reduce((sum: number, co: { amount_net: number; vat_rate: number; change_type: string }) => {
    const gross = Number(co.amount_net) * (1 + Number(co.vat_rate) / 100);
    return co.change_type === "deductive" ? sum - gross : sum + gross;
  }, 0);

  const previousValue = baseValue + approvedTotal;
  const newGross = input.amountNet * (1 + (input.vatRate ?? 23) / 100);
  const newValue = (input.changeType ?? "additive") === "deductive"
    ? previousValue - newGross
    : previousValue + newGross;

  const { data, error } = await db(supabase)
    .from("change_orders")
    .insert({
      project_id: input.projectId,
      contractor_id: user.id,
      number: nextNumber,
      title: input.title,
      description: input.description ?? null,
      reason: input.reason,
      change_type: input.changeType ?? "additive",
      amount_net: input.amountNet,
      vat_rate: input.vatRate ?? 23,
      schedule_days: input.scheduleDays ?? 0,
      legal_basis: input.legalBasis ?? "art_630_kc",
      previous_contract_value: previousValue,
      new_contract_value: newValue,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/aneksy`);
  return { ok: true, id: data.id };
}

export async function submitChangeOrder(
  id: string,
  projectId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("change_orders")
    .update({ status: "pending_approval", submitted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/aneksy`);
  return { ok: true };
}

export async function approveChangeOrder(
  id: string,
  projectId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const { error } = await db(supabase)
    .from("change_orders")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/aneksy`);
  return { ok: true };
}

export async function rejectChangeOrder(
  id: string,
  projectId: string,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("change_orders")
    .update({ status: "rejected", rejection_reason: reason })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/aneksy`);
  return { ok: true };
}

export async function withdrawChangeOrder(
  id: string,
  projectId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("change_orders")
    .update({ status: "withdrawn" })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/aneksy`);
  return { ok: true };
}

export async function deleteChangeOrder(
  id: string,
  projectId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("change_orders")
    .delete()
    .eq("id", id)
    .eq("status", "draft"); // Only drafts can be deleted

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/aneksy`);
  return { ok: true };
}
