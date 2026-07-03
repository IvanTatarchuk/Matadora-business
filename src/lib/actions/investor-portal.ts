"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "revision_requested";
export type ApprovalDocType = "drawing" | "submittal" | "invoice" | "change_order" | "schedule" | "contract" | "report" | "other";

export type InvestorMessage = {
  id: string; project_id: string; org_id: string; sender_id: string | null;
  direction: "contractor_to_investor" | "investor_to_contractor";
  subject: string; body: string; is_read: boolean; read_at: string | null;
  reply_to: string | null; created_at: string;
};

export type InvestorApproval = {
  id: string; project_id: string; org_id: string; requested_by: string | null;
  title: string; description: string | null; document_type: ApprovalDocType;
  file_url: string | null; deadline: string | null;
  status: ApprovalStatus; reviewer_name: string | null;
  review_notes: string | null; reviewed_at: string | null;
  created_at: string; updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listInvestorMessages(projectId: string): Promise<InvestorMessage[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("investor_messages").select("*").eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as InvestorMessage[];
}

export async function sendInvestorMessage(input: {
  projectId: string; subject: string; body: string;
  direction?: "contractor_to_investor" | "investor_to_contractor";
  replyTo?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("investor_messages").insert({
    project_id: input.projectId, org_id: member.org_id, sender_id: user.id,
    direction: input.direction ?? "contractor_to_investor",
    subject: input.subject, body: input.body,
    reply_to: input.replyTo ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/investor/projects/${input.projectId}/wiadomosci`);
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/portal-inwestora`);
  return { ok: true, id: data.id };
}

export async function listInvestorApprovals(projectId: string): Promise<InvestorApproval[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("investor_approvals").select("*").eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as InvestorApproval[];
}

export async function createApprovalRequest(input: {
  projectId: string; title: string; description?: string;
  documentType?: ApprovalDocType; fileUrl?: string; deadline?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("investor_approvals").insert({
    project_id: input.projectId, org_id: member.org_id, requested_by: user.id,
    title: input.title, description: input.description ?? null,
    document_type: input.documentType ?? "other",
    file_url: input.fileUrl ?? null, deadline: input.deadline ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/portal-inwestora`);
  return { ok: true, id: data.id };
}

export async function updateApprovalStatus(
  id: string, projectId: string, status: ApprovalStatus,
  reviewerName?: string, reviewNotes?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("investor_approvals").update({
    status, reviewer_name: reviewerName ?? null, review_notes: reviewNotes ?? null,
    reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/portal-inwestora`);
  revalidatePath(`/dashboard/investor/projects/${projectId}`);
  return { ok: true };
}
