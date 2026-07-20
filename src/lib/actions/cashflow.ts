"use server";

import { createClient } from "@/lib/supabase/server";
import { round2 } from "@/lib/utils";
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

// ─── Cash position (Pozycja gotówkowa) ──────────────────────────────────────
// Aggregates existing data only — cashflow_entries (realized + planned),
// job_cost_items (remaining committed cost) and evm_snapshots (ETC).
// No new tables/migrations.

export type CashProjectionWeek = {
  label: string;      // "21.07–27.07"
  startISO: string;   // ISO date of the week start
  inflow: number;     // planned inflow allocated to the week
  outflow: number;    // planned outflow allocated to the week
  net: number;        // inflow - outflow
  cumulative: number; // projected cash position at the end of the week
};

export type CashPosition = {
  realizedInflows: number;    // confirmed actual inflows to date
  realizedOutflows: number;   // confirmed actual outflows to date
  currentPosition: number;    // realizedInflows - realizedOutflows
  committedCosts: number;     // job_cost_items: remaining planned cost (planned - actual)
  estimateToComplete: number; // evm_snapshots: sum of ETC from latest snapshot per project
  weeks: CashProjectionWeek[];
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export async function getCashPosition(weeksAhead = 8): Promise<CashPosition | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return null;

  const [{ data: cf }, { data: jci }, { data: evm }] = await Promise.all([
    db(supabase).from("cashflow_entries")
      .select("period_year, period_month, type, planned_amount, actual_amount")
      .eq("org_id", member.org_id),
    db(supabase).from("job_cost_items")
      .select("planned_total, actual_total")
      .eq("org_id", member.org_id),
    db(supabase).from("evm_snapshots")
      .select("project_id, snapshot_date, etc")
      .eq("org_id", member.org_id)
      .order("snapshot_date", { ascending: false }),
  ]);

  const entries = (cf ?? []) as Array<Pick<CashflowEntry,
    "period_year" | "period_month" | "type" | "planned_amount" | "actual_amount">>;

  // Current cash position — from confirmed actuals only.
  let realizedInflows = 0, realizedOutflows = 0;
  for (const e of entries) {
    if (e.actual_amount == null) continue;
    if (e.type === "inflow") realizedInflows += e.actual_amount;
    else realizedOutflows += e.actual_amount;
  }
  const currentPosition = realizedInflows - realizedOutflows;

  // Remaining committed cost from job cost items (planned not yet incurred).
  let plannedCost = 0, actualCost = 0;
  for (const j of (jci ?? []) as Array<{ planned_total: number | null; actual_total: number | null }>) {
    plannedCost += j.planned_total ?? 0;
    actualCost += j.actual_total ?? 0;
  }
  const committedCosts = Math.max(0, plannedCost - actualCost);

  // Estimate to complete — latest EVM snapshot per project (rows are ordered desc).
  const seenProjects = new Set<string>();
  let estimateToComplete = 0;
  for (const s of (evm ?? []) as Array<{ project_id: string; etc: number | null }>) {
    if (seenProjects.has(s.project_id)) continue;
    seenProjects.add(s.project_id);
    estimateToComplete += s.etc ?? 0;
  }

  // Monthly planned totals, keyed by "year-month", used to spread across weeks.
  const monthly = new Map<string, { inflow: number; outflow: number }>();
  for (const e of entries) {
    const key = `${e.period_year}-${e.period_month}`;
    const m = monthly.get(key) ?? { inflow: 0, outflow: 0 };
    if (e.type === "inflow") m.inflow += e.planned_amount;
    else m.outflow += e.planned_amount;
    monthly.set(key, m);
  }

  // Forward projection: spread each month's planned amounts evenly across its
  // days, then bucket the days into forward weeks starting today.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weeks: CashProjectionWeek[] = [];
  let cumulative = currentPosition;
  for (let w = 0; w < weeksAhead; w++) {
    const start = new Date(today);
    start.setDate(today.getDate() + w * 7);
    let inflow = 0, outflow = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + d);
      const y = day.getFullYear();
      const mo = day.getMonth() + 1;
      const m = monthly.get(`${y}-${mo}`);
      if (!m) continue;
      const daysInMonth = new Date(y, mo, 0).getDate();
      inflow += m.inflow / daysInMonth;
      outflow += m.outflow / daysInMonth;
    }
    inflow = round2(inflow);
    outflow = round2(outflow);
    const net = round2(inflow - outflow);
    cumulative = round2(cumulative + net);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    weeks.push({
      label: `${pad2(start.getDate())}.${pad2(start.getMonth() + 1)}–${pad2(end.getDate())}.${pad2(end.getMonth() + 1)}`,
      startISO: start.toISOString().slice(0, 10),
      inflow, outflow, net, cumulative,
    });
  }

  return {
    realizedInflows: round2(realizedInflows),
    realizedOutflows: round2(realizedOutflows),
    currentPosition: round2(currentPosition),
    committedCosts: round2(committedCosts),
    estimateToComplete: round2(estimateToComplete),
    weeks,
  };
}
