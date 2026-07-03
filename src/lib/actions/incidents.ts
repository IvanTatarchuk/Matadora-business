"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type IncidentType = "near_miss" | "first_aid" | "medical_treatment" | "lost_time" | "fatality" | "property_damage" | "environmental" | "other";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "open" | "investigating" | "closed" | "reported";

export type Incident = {
  id: string; project_id: string; org_id: string; created_by: string | null;
  incident_number: number; number_display: string;
  incident_date: string; incident_time: string | null; location: string;
  type: IncidentType; severity: IncidentSeverity;
  title: string; description: string;
  immediate_cause: string | null; root_cause: string | null;
  injured_person: string | null; injury_type: string | null;
  body_part_affected: string | null; days_lost: number;
  witnesses: string[]; corrective_actions: string | null; preventive_actions: string | null;
  reported_to_pip: boolean; pip_report_date: string | null; pip_case_number: string | null;
  status: IncidentStatus;
  closed_at: string | null; investigation_completed: boolean; notes: string | null;
  created_at: string; updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listIncidents(projectId: string): Promise<Incident[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("incidents").select("*").eq("project_id", projectId)
    .order("incident_date", { ascending: false });
  if (error) return [];
  return (data ?? []) as Incident[];
}

export async function createIncident(input: {
  projectId: string; title: string; description: string; location: string;
  type?: IncidentType; severity?: IncidentSeverity;
  incidentDate: string; incidentTime?: string;
  injuredPerson?: string; injuryType?: string; bodyPartAffected?: string;
  daysLost?: number; witnesses?: string[];
  immediateCause?: string; correctiveActions?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data: last } = await db(supabase).from("incidents").select("incident_number")
    .eq("project_id", input.projectId).order("incident_number", { ascending: false }).limit(1).single();

  const { data, error } = await db(supabase).from("incidents").insert({
    project_id: input.projectId, org_id: member.org_id, created_by: user.id,
    incident_number: (last?.incident_number ?? 0) + 1,
    title: input.title, description: input.description, location: input.location,
    type: input.type ?? "near_miss", severity: input.severity ?? "low",
    incident_date: input.incidentDate, incident_time: input.incidentTime ?? null,
    injured_person: input.injuredPerson ?? null, injury_type: input.injuryType ?? null,
    body_part_affected: input.bodyPartAffected ?? null,
    days_lost: input.daysLost ?? 0, witnesses: input.witnesses ?? [],
    immediate_cause: input.immediateCause ?? null,
    corrective_actions: input.correctiveActions ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/wypadki`);
  return { ok: true, id: data.id };
}

export async function updateIncidentStatus(
  id: string, projectId: string, status: IncidentStatus
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "closed") updates.closed_at = new Date().toISOString();
  const { error } = await db(supabase).from("incidents").update(updates).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/wypadki`);
  return { ok: true };
}
