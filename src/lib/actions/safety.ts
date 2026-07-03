"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SafetyObservationType =
  | "unsafe_act" | "unsafe_condition" | "near_miss" | "incident"
  | "positive_observation" | "toolbox_talk" | "ppe_violation";

export type SafetySeverity = "low" | "medium" | "high" | "critical";
export type SafetyStatus = "open" | "in_progress" | "resolved" | "closed";

export type SafetyObservation = {
  id: string;
  project_id: string;
  org_id: string;
  created_by: string | null;
  observation_type: SafetyObservationType;
  severity: SafetySeverity;
  status: SafetyStatus;
  title: string;
  description: string | null;
  location_note: string | null;
  observed_date: string;
  reported_by_name: string | null;
  workers_involved: string | null;
  immediate_action: string | null;
  corrective_action: string | null;
  due_date: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listSafetyObservations(projectId: string): Promise<SafetyObservation[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("safety_observations").select("*")
    .eq("project_id", projectId)
    .order("observed_date", { ascending: false });
  if (error) return [];
  return (data ?? []) as SafetyObservation[];
}

export async function createSafetyObservation(input: {
  projectId: string;
  observationType: SafetyObservationType;
  severity: SafetySeverity;
  title: string;
  description?: string;
  locationNote?: string;
  observedDate: string;
  reportedByName?: string;
  workersInvolved?: string;
  immediateAction?: string;
  correctiveAction?: string;
  dueDate?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("safety_observations").insert({
    project_id: input.projectId, org_id: member.org_id, created_by: user.id,
    observation_type: input.observationType, severity: input.severity,
    title: input.title, description: input.description ?? null,
    location_note: input.locationNote ?? null,
    observed_date: input.observedDate,
    reported_by_name: input.reportedByName ?? null,
    workers_involved: input.workersInvolved ?? null,
    immediate_action: input.immediateAction ?? null,
    corrective_action: input.correctiveAction ?? null,
    due_date: input.dueDate ?? null,
    status: "open",
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/bhp`);
  return { ok: true, id: data.id };
}

export async function resolveSafetyObservation(
  id: string, projectId: string, resolvedBy: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("safety_observations").update({
    status: "resolved", resolved_at: new Date().toISOString().slice(0, 10),
    resolved_by: resolvedBy, updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/bhp`);
  return { ok: true };
}

export async function updateSafetyStatus(
  id: string, projectId: string, status: SafetyStatus
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "resolved") updates.resolved_at = new Date().toISOString().slice(0, 10);
  const { error } = await db(supabase).from("safety_observations").update(updates).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/bhp`);
  return { ok: true };
}
