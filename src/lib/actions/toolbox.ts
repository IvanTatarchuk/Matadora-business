"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ToolboxTopic =
  | "general_safety" | "fall_protection" | "electrical" | "ppe"
  | "manual_handling" | "fire_safety" | "chemical" | "machinery"
  | "excavation" | "scaffolding" | "confined_space" | "first_aid" | "other";

export type ToolboxTalk = {
  id: string; project_id: string | null; org_id: string; created_by: string | null;
  title: string; topic: ToolboxTopic;
  conducted_by: string; conducted_date: string;
  duration_min: number | null; location: string | null;
  content: string | null; attendees: string[];
  attendee_count: number | null; has_signatures: boolean;
  notes: string | null; created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listToolboxTalks(projectId?: string): Promise<ToolboxTalk[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  let q = db(supabase).from("toolbox_talks").select("*").eq("org_id", member.org_id);
  if (projectId) q = q.eq("project_id", projectId);
  const { data, error } = await q.order("conducted_date", { ascending: false });
  if (error) return [];
  return (data ?? []) as ToolboxTalk[];
}

export async function createToolboxTalk(input: {
  projectId?: string; title: string; topic?: ToolboxTopic;
  conductedBy: string; conductedDate: string;
  durationMin?: number; location?: string; content?: string;
  attendees?: string[]; hasSignatures?: boolean; notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("toolbox_talks").insert({
    project_id: input.projectId ?? null, org_id: member.org_id, created_by: user.id,
    title: input.title, topic: input.topic ?? "general_safety",
    conducted_by: input.conductedBy, conducted_date: input.conductedDate,
    duration_min: input.durationMin ?? null, location: input.location ?? null,
    content: input.content ?? null, attendees: input.attendees ?? [],
    has_signatures: input.hasSignatures ?? false, notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  if (input.projectId) revalidatePath(`/dashboard/contractor/projects/${input.projectId}/bhp`);
  revalidatePath(`/dashboard/contractor/bhp`);
  return { ok: true, id: data.id };
}
