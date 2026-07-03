"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SubmittalType =
  | "shop_drawings" | "product_data" | "samples" | "calculations"
  | "certificates" | "warranties" | "test_reports" | "operation_manuals" | "other";

export type SubmittalStatus =
  | "draft" | "submitted" | "under_review" | "approved"
  | "approved_as_noted" | "revise_resubmit" | "rejected" | "void";

export type Submittal = {
  id: string;
  project_id: string;
  org_id: string;
  created_by: string | null;
  number: number;
  number_display: string;
  title: string;
  spec_section: string | null;
  submittal_type: SubmittalType;
  status: SubmittalStatus;
  submitted_to: string | null;
  submitted_date: string | null;
  required_date: string | null;
  returned_date: string | null;
  revision: number;
  description: string | null;
  review_notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listSubmittals(projectId: string): Promise<Submittal[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("submittals").select("*").eq("project_id", projectId)
    .order("number", { ascending: false });
  if (error) return [];
  return (data ?? []) as Submittal[];
}

export async function createSubmittal(input: {
  projectId: string; title: string; submittalType?: SubmittalType;
  specSection?: string; submittedTo?: string; submittedDate?: string;
  requiredDate?: string; description?: string; internalNotes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data: last } = await db(supabase)
    .from("submittals").select("number").eq("project_id", input.projectId)
    .order("number", { ascending: false }).limit(1).single();

  const { data, error } = await db(supabase).from("submittals").insert({
    project_id: input.projectId, org_id: member.org_id, created_by: user.id,
    number: (last?.number ?? 0) + 1,
    title: input.title, submittal_type: input.submittalType ?? "shop_drawings",
    spec_section: input.specSection ?? null, submitted_to: input.submittedTo ?? null,
    submitted_date: input.submittedDate ?? null, required_date: input.requiredDate ?? null,
    description: input.description ?? null, internal_notes: input.internalNotes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/submittals`);
  return { ok: true, id: data.id };
}

export async function updateSubmittalStatus(
  id: string, projectId: string,
  status: SubmittalStatus, reviewNotes?: string, returnedDate?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("submittals").update({
    status, review_notes: reviewNotes ?? null,
    returned_date: returnedDate ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/submittals`);
  return { ok: true };
}

export async function resubmitSubmittal(id: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: current } = await db(supabase).from("submittals").select("revision").eq("id", id).single();
  const { error } = await db(supabase).from("submittals").update({
    status: "submitted", revision: (current?.revision ?? 1) + 1,
    submitted_date: new Date().toISOString().slice(0, 10),
    returned_date: null, review_notes: null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/submittals`);
  return { ok: true };
}
