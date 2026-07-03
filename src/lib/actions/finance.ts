"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export interface WorkerPayrollRow {
  workerId: string;
  name: string;
  specialty: string | null;
  hours: number;
  hourlyRate: number | null;
  laborCost: number | null; // null when rate unknown
}

export interface ProjectPnL {
  budget: number | null;       // accepted offer total_net
  laborCost: number;           // sum hours * hourly_rate
  expensesCost: number;        // sum project_expenses.amount
  totalCost: number;
  profit: number | null;       // budget - totalCost (null if no budget)
  margin: number | null;       // profit/budget*100 (null if no budget)
  workerBreakdown: WorkerPayrollRow[];
}

// ─── Time entries ─────────────────────────────────────────────────────────

export async function logTimeEntry(input: {
  projectId: string;
  workerId: string;
  crewId?: string | null;
  hours: number;
  entryDate?: string;
  note?: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const hours = Number(input.hours);
  if (!(hours > 0)) return { ok: false, error: "Hours must be positive" };

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      project_id: input.projectId,
      worker_id: input.workerId,
      crew_id: input.crewId || null,
      hours,
      entry_date: input.entryDate || new Date().toISOString().slice(0, 10),
      note: input.note?.trim() || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/finance`);
  return { ok: true, id: data.id };
}

export async function deleteTimeEntry(
  id: string,
  projectId: string
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("time_entries")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/finance`);
  return { ok: true };
}

// ─── Expenses ─────────────────────────────────────────────────────────────

export async function addExpense(input: {
  projectId: string;
  category: string;
  amount: number;
  note?: string;
  expenseDate?: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const amount = Number(input.amount);
  if (!(amount >= 0)) return { ok: false, error: "Amount must be ≥ 0" };

  const { data, error } = await supabase
    .from("project_expenses")
    .insert({
      project_id: input.projectId,
      category: input.category || "other",
      amount,
      note: input.note?.trim() || null,
      expense_date: input.expenseDate || new Date().toISOString().slice(0, 10),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/finance`);
  return { ok: true, id: data.id };
}

export async function deleteExpense(
  id: string,
  projectId: string
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("project_expenses")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/finance`);
  return { ok: true };
}

// ─── P&L aggregation ──────────────────────────────────────────────────────

export async function getProjectPnL(
  projectId: string
): Promise<ProjectPnL> {
  const supabase = createClient();

  const [
    { data: timeRows },
    { data: expenseRows },
    { data: offer },
  ] = await Promise.all([
    supabase
      .from("time_entries")
      .select("worker_id, hours")
      .eq("project_id", projectId),
    supabase
      .from("project_expenses")
      .select("amount")
      .eq("project_id", projectId),
    supabase
      .from("offers")
      .select("total_net")
      .eq("project_id", projectId)
      .eq("status", "accepted")
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Fetch worker rates for the time entries.
  const workerIds = [
    ...new Set((timeRows ?? []).map((t) => t.worker_id)),
  ];
  const { data: workers } = workerIds.length
    ? await supabase
        .from("workers")
        .select("id, full_name, specialty, hourly_rate")
        .in("id", workerIds)
    : { data: [] as { id: string; full_name: string; specialty: string | null; hourly_rate: number | null }[] };

  const workerMap = new Map(
    (workers ?? []).map((w) => [w.id, w])
  );

  // Aggregate hours per worker.
  const byWorker = new Map<string, number>();
  for (const t of timeRows ?? []) {
    byWorker.set(t.worker_id, (byWorker.get(t.worker_id) ?? 0) + Number(t.hours));
  }

  const workerBreakdown: WorkerPayrollRow[] = [];
  let laborCost = 0;

  for (const [wid, hours] of byWorker) {
    const w = workerMap.get(wid);
    const rate = w?.hourly_rate != null ? Number(w.hourly_rate) : null;
    const cost = rate != null ? hours * rate : null;
    if (cost != null) laborCost += cost;
    workerBreakdown.push({
      workerId: wid,
      name: w?.full_name ?? "Unknown",
      specialty: w?.specialty ?? null,
      hours,
      hourlyRate: rate,
      laborCost: cost,
    });
  }

  const expensesCost = (expenseRows ?? []).reduce(
    (s, e) => s + Number(e.amount),
    0
  );
  const totalCost = laborCost + expensesCost;
  const budget = offer?.total_net != null ? Number(offer.total_net) : null;
  const profit = budget != null ? budget - totalCost : null;
  const margin =
    profit != null && budget && budget > 0
      ? (profit / budget) * 100
      : null;

  return {
    budget,
    laborCost,
    expensesCost,
    totalCost,
    profit,
    margin,
    workerBreakdown,
  };
}

export async function getTimeEntries(projectId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("time_entries")
    .select("*")
    .eq("project_id", projectId)
    .order("entry_date", { ascending: false });
  return data ?? [];
}

export async function getExpenses(projectId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("project_expenses")
    .select("*")
    .eq("project_id", projectId)
    .order("expense_date", { ascending: false });
  return data ?? [];
}
