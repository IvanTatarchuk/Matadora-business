"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ForecastCategory = "labor" | "materials" | "equipment" | "subcontract" | "overhead" | "revenue" | "other";

export type BudgetForecastEntry = {
  id: string; project_id: string; org_id: string; created_by: string | null;
  year: number; month: number; category: ForecastCategory;
  planned_cost: number; actual_cost: number | null;
  planned_revenue: number | null; actual_revenue: number | null;
  confidence: number | null; notes: string | null;
  created_at: string; updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listBudgetForecast(projectId: string, year: number): Promise<BudgetForecastEntry[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("budget_forecast_entries").select("*")
    .eq("project_id", projectId).eq("year", year)
    .order("month").order("category");
  if (error) return [];
  return (data ?? []) as BudgetForecastEntry[];
}

export async function upsertForecastEntry(input: {
  projectId: string; year: number; month: number; category: ForecastCategory;
  plannedCost?: number; actualCost?: number;
  plannedRevenue?: number; actualRevenue?: number;
  confidence?: number; notes?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { error } = await db(supabase).from("budget_forecast_entries").upsert({
    project_id: input.projectId, org_id: member.org_id, created_by: user.id,
    year: input.year, month: input.month, category: input.category,
    planned_cost: input.plannedCost ?? 0,
    actual_cost: input.actualCost ?? null,
    planned_revenue: input.plannedRevenue ?? null,
    actual_revenue: input.actualRevenue ?? null,
    confidence: input.confidence ?? null, notes: input.notes ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "project_id,year,month,category" });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/budzet`);
  return { ok: true };
}

export type PortfolioProject = {
  id: string; title: string; status: string;
  address: string | null; surface_area: number | null;
  created_at: string; updated_at: string;
};

export async function listPortfolioProjects(): Promise<PortfolioProject[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("projects")
    .select("id, title, status, address, surface_area, created_at, updated_at")
    .or(`contractor_id.eq.${user.id},investor_id.eq.${user.id}`)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as PortfolioProject[];
}
