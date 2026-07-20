"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ObservationType =
  | "safety" | "quality" | "environmental" | "commissioning" | "work" | "other";

export type ObservationPriority = "low" | "medium" | "high" | "urgent";

export type ObservationStatus =
  | "initiated" | "in_progress" | "ready_review" | "closed" | "void";

export type ProjectObservation = {
  id: string;
  project_id: string;
  org_id: string;
  created_by: string | null;
  number: number;
  title: string;
  description: string | null;
  type: ObservationType;
  priority: ObservationPriority;
  status: ObservationStatus;
  assignee_name: string | null;
  assignee_id: string | null;
  location: string | null;
  trade: string | null;
  observed_by: string | null;
  due_date: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listObservations(projectId: string): Promise<ProjectObservation[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("project_observations")
    .select("*")
    .eq("project_id", projectId)
    .order("number", { ascending: false });
  if (error) return [];
  return (data ?? []) as ProjectObservation[];
}

export async function createObservation(input: {
  projectId: string;
  title: string;
  description?: string;
  type?: ObservationType;
  priority?: ObservationPriority;
  assigneeName?: string;
  location?: string;
  trade?: string;
  observedBy?: string;
  dueDate?: string;
}): Promise<{ ok: boolean; id?: string; number?: number; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data: last } = await db(supabase)
    .from("project_observations")
    .select("number")
    .eq("project_id", input.projectId)
    .order("number", { ascending: false })
    .limit(1)
    .single();

  const nextNumber = (last?.number ?? 0) + 1;

  const { data, error } = await db(supabase)
    .from("project_observations")
    .insert({
      project_id: input.projectId,
      org_id: member.org_id,
      created_by: user.id,
      number: nextNumber,
      title: input.title,
      description: input.description ?? null,
      type: input.type ?? "safety",
      priority: input.priority ?? "medium",
      assignee_name: input.assigneeName ?? null,
      location: input.location ?? null,
      trade: input.trade ?? null,
      observed_by: input.observedBy ?? null,
      due_date: input.dueDate ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/obserwacje`);
  return { ok: true, id: data.id, number: nextNumber };
}

export async function updateObservationStatus(
  id: string,
  projectId: string,
  status: ObservationStatus,
  resolutionNote?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status, updated_at: now };
  if (status === "ready_review") patch.resolved_at = now;
  if (status === "closed") patch.closed_at = now;
  if (resolutionNote !== undefined) patch.resolution_note = resolutionNote;

  const { error } = await db(supabase)
    .from("project_observations")
    .update(patch)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/obserwacje`);
  return { ok: true };
}

export async function deleteObservation(
  id: string,
  projectId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("project_observations")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/obserwacje`);
  return { ok: true };
}
