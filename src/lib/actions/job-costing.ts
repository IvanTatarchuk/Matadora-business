"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CostCategory = "labor" | "materials" | "equipment" | "subcontract" | "overhead" | "contingency" | "other";

export type JobCostItem = {
  id: string; project_id: string; org_id: string; created_by: string | null;
  wbs_code: string | null; name: string; description: string | null;
  category: CostCategory; unit: string | null;
  quantity_planned: number | null; unit_cost_planned: number | null; planned_total: number | null;
  quantity_actual: number | null; unit_cost_actual: number | null; actual_total: number | null;
  percent_complete: number; variance: number | null;
  parent_id: string | null; position: number; notes: string | null;
  created_at: string; updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listJobCostItems(projectId: string): Promise<JobCostItem[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("job_cost_items").select("*").eq("project_id", projectId)
    .order("wbs_code", { nullsFirst: false }).order("position");
  if (error) return [];
  return (data ?? []) as JobCostItem[];
}

export async function createJobCostItem(input: {
  projectId: string; name: string; category?: CostCategory;
  wbsCode?: string; description?: string; unit?: string;
  quantityPlanned?: number; unitCostPlanned?: number;
  notes?: string; parentId?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data: last } = await db(supabase).from("job_cost_items").select("position")
    .eq("project_id", input.projectId).order("position", { ascending: false }).limit(1).single();

  const { data, error } = await db(supabase).from("job_cost_items").insert({
    project_id: input.projectId, org_id: member.org_id, created_by: user.id,
    wbs_code: input.wbsCode ?? null, name: input.name,
    category: input.category ?? "labor",
    description: input.description ?? null, unit: input.unit ?? null,
    quantity_planned: input.quantityPlanned ?? null,
    unit_cost_planned: input.unitCostPlanned ?? null,
    notes: input.notes ?? null, parent_id: input.parentId ?? null,
    position: (last?.position ?? 0) + 10,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/koszty`);
  return { ok: true, id: data.id };
}

export async function updateJobCostActuals(
  id: string, projectId: string,
  updates: { quantityActual?: number; unitCostActual?: number; percentComplete?: number }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("job_cost_items").update({
    quantity_actual: updates.quantityActual,
    unit_cost_actual: updates.unitCostActual,
    percent_complete: updates.percentComplete,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/koszty`);
  return { ok: true };
}

export async function deleteJobCostItem(id: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("job_cost_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/koszty`);
  return { ok: true };
}
