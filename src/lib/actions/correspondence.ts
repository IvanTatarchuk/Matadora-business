"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CorrespondenceCategory =
  | "general" | "rfi_response" | "claim" | "notice" | "instruction"
  | "approval" | "rejection" | "payment" | "contract" | "legal" | "other";

export type CorrespondenceStatus = "open" | "responded" | "closed" | "escalated";

export type Correspondence = {
  id: string;
  project_id: string;
  org_id: string;
  created_by: string | null;
  number: number;
  number_display: string;
  subject: string;
  direction: "outgoing" | "incoming";
  correspondent: string;
  correspondent_email: string | null;
  sent_date: string;
  received_date: string | null;
  category: CorrespondenceCategory;
  body: string | null;
  reference_number: string | null;
  requires_response: boolean;
  response_due_date: string | null;
  responded_at: string | null;
  status: CorrespondenceStatus;
  created_at: string;
  updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listCorrespondence(projectId: string): Promise<Correspondence[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("project_correspondence").select("*").eq("project_id", projectId)
    .order("sent_date", { ascending: false });
  if (error) return [];
  return (data ?? []) as Correspondence[];
}

export async function createCorrespondence(input: {
  projectId: string; subject: string;
  direction: "outgoing" | "incoming"; correspondent: string;
  correspondentEmail?: string; sentDate: string; receivedDate?: string;
  category?: CorrespondenceCategory; body?: string;
  referenceNumber?: string; requiresResponse?: boolean;
  responseDueDate?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data: last } = await db(supabase)
    .from("project_correspondence").select("number").eq("project_id", input.projectId)
    .order("number", { ascending: false }).limit(1).single();

  const { data, error } = await db(supabase).from("project_correspondence").insert({
    project_id: input.projectId, org_id: member.org_id, created_by: user.id,
    number: (last?.number ?? 0) + 1,
    subject: input.subject, direction: input.direction,
    correspondent: input.correspondent,
    correspondent_email: input.correspondentEmail ?? null,
    sent_date: input.sentDate, received_date: input.receivedDate ?? null,
    category: input.category ?? "general", body: input.body ?? null,
    reference_number: input.referenceNumber ?? null,
    requires_response: input.requiresResponse ?? false,
    response_due_date: input.responseDueDate ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/korespondencja`);
  return { ok: true, id: data.id };
}

export async function updateCorrespondenceStatus(
  id: string, projectId: string,
  status: CorrespondenceStatus, respondedAt?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("project_correspondence").update({
    status, responded_at: respondedAt ?? null, updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/korespondencja`);
  return { ok: true };
}
