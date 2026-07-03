"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type RFIDiscipline =
  | "general" | "architektura" | "konstrukcja" | "instalacje_elektryczne"
  | "instalacje_sanitarne" | "instalacje_hvac" | "geotechnika"
  | "drogi" | "kosztorys" | "bhp" | "inne";

export type RFIPriority = "low" | "normal" | "high" | "urgent";
export type RFIStatus = "draft" | "open" | "answered" | "closed" | "void";

export type RFI = {
  id: string;
  project_id: string;
  org_id: string;
  number: number;
  number_display: string;
  title: string;
  question: string;
  discipline: RFIDiscipline;
  priority: RFIPriority;
  status: RFIStatus;
  created_by: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  date_initiated: string;
  due_date: string | null;
  answered_at: string | null;
  closed_at: string | null;
  cost_impact: boolean;
  schedule_impact: boolean;
  schedule_days: number;
  answer: string | null;
  answered_by: string | null;
  answered_by_name: string | null;
  drawing_ref: string | null;
  spec_section: string | null;
  location_note: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  creator_name?: string | null;
  days_open?: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listRFIs(projectId: string): Promise<RFI[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("rfis")
    .select("*, creator:created_by(full_name)")
    .eq("project_id", projectId)
    .order("number", { ascending: true });

  if (error) return [];
  const today = new Date().getTime();
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    creator_name: (r.creator as { full_name?: string } | null)?.full_name ?? null,
    days_open: r.date_initiated
      ? Math.floor((today - new Date(r.date_initiated as string).getTime()) / 86400000)
      : 0,
  })) as RFI[];
}

export async function createRFI(input: {
  projectId: string;
  title: string;
  question: string;
  discipline?: RFIDiscipline;
  priority?: RFIPriority;
  assignedToName?: string;
  dueDate?: string;
  costImpact?: boolean;
  scheduleImpact?: boolean;
  scheduleDays?: number;
  drawingRef?: string;
  specSection?: string;
  locationNote?: string;
  notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const { data: member } = await supabase
    .from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data: last } = await db(supabase)
    .from("rfis").select("number").eq("project_id", input.projectId)
    .order("number", { ascending: false }).limit(1).single();

  const { data, error } = await db(supabase)
    .from("rfis")
    .insert({
      project_id: input.projectId,
      org_id: member.org_id,
      created_by: user.id,
      number: (last?.number ?? 0) + 1,
      title: input.title,
      question: input.question,
      discipline: input.discipline ?? "general",
      priority: input.priority ?? "normal",
      status: "draft",
      assigned_to_name: input.assignedToName ?? null,
      due_date: input.dueDate ?? null,
      date_initiated: new Date().toISOString().slice(0, 10),
      cost_impact: input.costImpact ?? false,
      schedule_impact: input.scheduleImpact ?? false,
      schedule_days: input.scheduleDays ?? 0,
      drawing_ref: input.drawingRef ?? null,
      spec_section: input.specSection ?? null,
      location_note: input.locationNote ?? null,
      notes: input.notes ?? null,
    })
    .select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/rfi`);
  return { ok: true, id: data.id };
}

export async function openRFI(id: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("rfis").update({ status: "open", updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/rfi`);
  return { ok: true };
}

export async function answerRFI(
  id: string,
  projectId: string,
  answer: string,
  answeredByName?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await db(supabase)
    .from("rfis")
    .update({
      status: "answered",
      answer,
      answered_by: user?.id ?? null,
      answered_by_name: answeredByName ?? null,
      answered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/rfi`);
  return { ok: true };
}

export async function closeRFI(id: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("rfis")
    .update({ status: "closed", closed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/rfi`);
  return { ok: true };
}

export async function voidRFI(id: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("rfis").update({ status: "void", updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/rfi`);
  return { ok: true };
}

export async function deleteRFI(id: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("rfis").delete().eq("id", id).eq("status", "draft");
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/rfi`);
  return { ok: true };
}
