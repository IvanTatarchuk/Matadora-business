"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CashflowType = "inflow" | "outflow";
export type CashflowCategory =
  | "invoice_income" | "advance_income" | "retention_release"
  | "subcontractor_payment" | "material_payment" | "labor_payment"
  | "equipment_payment" | "overhead" | "tax" | "loan" | "other";

export type CashflowEntry = {
  id: string; project_id: string | null; org_id: string; created_by: string | null;
  period_year: number; period_month: number;
  type: CashflowType; category: CashflowCategory;
  description: string; planned_amount: number; actual_amount: number | null;
  is_confirmed: boolean; notes: string | null;
  created_at: string; updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listCashflow(year: number, projectId?: string): Promise<CashflowEntry[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  let q = db(supabase).from("cashflow_entries").select("*")
    .eq("org_id", member.org_id).eq("period_year", year);
  if (projectId) q = q.eq("project_id", projectId);
  const { data, error } = await q.order("period_month").order("type");
  if (error) return [];
  return (data ?? []) as CashflowEntry[];
}

export async function createCashflowEntry(input: {
  projectId?: string; periodYear: number; periodMonth: number;
  type: CashflowType; category?: CashflowCategory;
  description: string; plannedAmount: number;
  actualAmount?: number; notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("cashflow_entries").insert({
    project_id: input.projectId ?? null, org_id: member.org_id, created_by: user.id,
    period_year: input.periodYear, period_month: input.periodMonth,
    type: input.type, category: input.category ?? "other",
    description: input.description, planned_amount: input.plannedAmount,
    actual_amount: input.actualAmount ?? null,
    notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/finanse/cashflow");
  return { ok: true, id: data.id };
}

export async function updateCashflowActual(id: string, actualAmount: number): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("cashflow_entries").update({
    actual_amount: actualAmount, is_confirmed: true, updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/finanse/cashflow");
  return { ok: true };
}

export async function deleteCashflowEntry(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("cashflow_entries").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/finanse/cashflow");
  return { ok: true };
}
