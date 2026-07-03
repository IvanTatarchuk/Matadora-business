"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type InspectionCategory =
  | "quality" | "safety" | "handover" | "maintenance" | "environment" | "regulatory" | "custom";

export type InspectionStatus =
  | "draft" | "in_progress" | "passed" | "failed" | "conditional";

export type InspectionItemResult = "pass" | "fail" | "observation" | "na";

export type InspectionItem = {
  id: string;
  question: string;
  required: boolean;
  type: "pass_fail" | "yes_no" | "text" | "number";
  result?: InspectionItemResult;
  value?: string;
  notes?: string;
};

export type Inspection = {
  id: string;
  project_id: string;
  org_id: string;
  template_id: string | null;
  created_by: string | null;
  number: number;
  number_display: string;
  title: string;
  category: InspectionCategory;
  inspection_date: string;
  inspector_name: string | null;
  location_note: string | null;
  status: InspectionStatus;
  items: InspectionItem[];
  overall_result: "pass" | "fail" | "conditional" | "na" | null;
  defects_count: number;
  observations_count: number;
  notes: string | null;
  corrective_actions: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listInspections(projectId: string): Promise<Inspection[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("inspections")
    .select("*")
    .eq("project_id", projectId)
    .order("number", { ascending: false });
  if (error) return [];
  return (data ?? []) as Inspection[];
}

export async function createInspection(input: {
  projectId: string;
  title: string;
  category?: InspectionCategory;
  inspectorName?: string;
  inspectionDate?: string;
  locationNote?: string;
  items?: InspectionItem[];
  notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data: last } = await db(supabase)
    .from("inspections").select("number").eq("project_id", input.projectId)
    .order("number", { ascending: false }).limit(1).single();

  const { data, error } = await db(supabase).from("inspections").insert({
    project_id: input.projectId, org_id: member.org_id, created_by: user.id,
    number: (last?.number ?? 0) + 1,
    title: input.title, category: input.category ?? "quality",
    inspector_name: input.inspectorName ?? null,
    inspection_date: input.inspectionDate ?? new Date().toISOString().slice(0, 10),
    location_note: input.locationNote ?? null,
    items: input.items ?? [],
    notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/inspekcje`);
  return { ok: true, id: data.id };
}

export async function submitInspectionResults(
  id: string,
  projectId: string,
  items: InspectionItem[],
  notes?: string,
  correctiveActions?: string,
  followUpDate?: string,
): Promise<{ ok: boolean; error?: string }> {
  const defects = items.filter((i) => i.result === "fail").length;
  const observations = items.filter((i) => i.result === "observation").length;
  const answered = items.filter((i) => i.result);
  const allPassed = answered.every((i) => i.result === "pass" || i.result === "na");
  const anyFailed = answered.some((i) => i.result === "fail");
  const overall = anyFailed ? "fail" : defects === 0 && observations === 0 ? "pass" : "conditional";

  const supabase = createClient();
  const { error } = await db(supabase).from("inspections").update({
    items, defects_count: defects, observations_count: observations,
    overall_result: overall, status: allPassed && !anyFailed ? "passed" : anyFailed ? "failed" : "conditional",
    notes: notes ?? null, corrective_actions: correctiveActions ?? null,
    follow_up_date: followUpDate ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/inspekcje`);
  return { ok: true };
}

export async function deleteInspection(id: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("inspections").delete().eq("id", id).eq("status", "draft");
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/inspekcje`);
  return { ok: true };
}
