"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type RiskCategory =
  | "technical" | "financial" | "schedule" | "safety" | "legal"
  | "environmental" | "subcontractor" | "design" | "weather" | "client" | "other";

export type RiskStatus = "identified" | "assessed" | "mitigated" | "realized" | "closed";
export type ResponseStrategy =
  | "avoid" | "transfer" | "mitigate" | "accept" | "monitor"
  | "exploit" | "share" | "enhance";

export type ProjectRisk = {
  id: string;
  project_id: string;
  org_id: string;
  created_by: string | null;
  number: number;
  title: string;
  description: string | null;
  category: RiskCategory;
  probability: number;
  impact: number;
  risk_score: number;
  risk_type: "threat" | "opportunity";
  owner_name: string | null;
  owner_id: string | null;
  response_strategy: ResponseStrategy;
  mitigation_plan: string | null;
  contingency_plan: string | null;
  cost_impact_min: number | null;
  cost_impact_max: number | null;
  schedule_days_min: number;
  schedule_days_max: number;
  status: RiskStatus;
  residual_probability: number | null;
  residual_impact: number | null;
  review_date: string | null;
  closed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const RISK_LEVEL = (score: number) => {
  if (score <= 4) return { label: "Niskie", color: "bg-green-100 text-green-700" };
  if (score <= 9) return { label: "Umiarkowane", color: "bg-yellow-100 text-yellow-700" };
  if (score <= 16) return { label: "Wysokie", color: "bg-orange-100 text-orange-700" };
  return { label: "Krytyczne", color: "bg-red-100 text-red-700" };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listRisks(projectId: string): Promise<ProjectRisk[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("project_risks")
    .select("*")
    .eq("project_id", projectId)
    .order("risk_score", { ascending: false });
  if (error) return [];
  return (data ?? []) as ProjectRisk[];
}

export async function createRisk(input: {
  projectId: string;
  title: string;
  description?: string;
  category?: RiskCategory;
  probability: number;
  impact: number;
  riskType?: "threat" | "opportunity";
  ownerName?: string;
  responseStrategy?: ResponseStrategy;
  mitigationPlan?: string;
  contingencyPlan?: string;
  costImpactMin?: number;
  costImpactMax?: number;
  scheduleDaysMin?: number;
  scheduleDaysMax?: number;
  reviewDate?: string;
  notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const { data: member } = await supabase
    .from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data: last } = await db(supabase)
    .from("project_risks").select("number").eq("project_id", input.projectId)
    .order("number", { ascending: false }).limit(1).single();

  const { data, error } = await db(supabase)
    .from("project_risks")
    .insert({
      project_id: input.projectId,
      org_id: member.org_id,
      created_by: user.id,
      number: (last?.number ?? 0) + 1,
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? "other",
      probability: input.probability,
      impact: input.impact,
      risk_type: input.riskType ?? "threat",
      owner_name: input.ownerName ?? null,
      response_strategy: input.responseStrategy ?? "monitor",
      mitigation_plan: input.mitigationPlan ?? null,
      contingency_plan: input.contingencyPlan ?? null,
      cost_impact_min: input.costImpactMin ?? null,
      cost_impact_max: input.costImpactMax ?? null,
      schedule_days_min: input.scheduleDaysMin ?? 0,
      schedule_days_max: input.scheduleDaysMax ?? 0,
      review_date: input.reviewDate ?? null,
      notes: input.notes ?? null,
    })
    .select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/ryzyka`);
  return { ok: true, id: data.id };
}

export async function updateRiskStatus(
  id: string,
  projectId: string,
  status: RiskStatus
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("project_risks")
    .update({ status, updated_at: new Date().toISOString(), ...(status === "closed" ? { closed_at: new Date().toISOString() } : {}) })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/ryzyka`);
  return { ok: true };
}

export async function updateRiskMitigation(
  id: string,
  projectId: string,
  updates: {
    mitigationPlan?: string;
    residualProbability?: number;
    residualImpact?: number;
    responseStrategy?: ResponseStrategy;
  }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("project_risks")
    .update({
      mitigation_plan: updates.mitigationPlan,
      residual_probability: updates.residualProbability,
      residual_impact: updates.residualImpact,
      response_strategy: updates.responseStrategy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/ryzyka`);
  return { ok: true };
}

export async function deleteRisk(id: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("project_risks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/ryzyka`);
  return { ok: true };
}
