"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SignatureMethod = "click_to_sign" | "draw" | "type" | "upload";
export type SignatureStatus = "pending" | "signed" | "declined" | "expired" | "cancelled";

export type DocumentSignature = {
  id: string;
  document_id: string;
  document_type: string;
  project_id: string | null;
  org_id: string;
  signer_id: string | null;
  signer_name: string;
  signer_role: string;
  signature_data: string;
  signature_method: SignatureMethod;
  ip_address: string | null;
  user_agent: string | null;
  signed_at: string;
  expires_at: string | null;
  is_valid: boolean;
  metadata: Record<string, any>;
  created_at: string;
};

export type SignatureRequest = {
  id: string;
  document_id: string;
  document_type: string;
  project_id: string | null;
  org_id: string;
  requested_by: string | null;
  requested_to: string | null;
  requested_to_email: string | null;
  status: SignatureStatus;
  message: string | null;
  expires_at: string;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function createSignature(input: {
  documentId: string;
  documentType: string;
  projectId?: string;
  signerName: string;
  signerRole: string;
  signatureData: string;
  signatureMethod?: SignatureMethod;
  metadata?: Record<string, any>;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("document_signatures").insert({
    document_id: input.documentId,
    document_type: input.documentType,
    project_id: input.projectId ?? null,
    org_id: member.org_id,
    signer_id: user.id,
    signer_name: input.signerName,
    signer_role: input.signerRole,
    signature_data: input.signatureData,
    signature_method: input.signatureMethod ?? "click_to_sign",
    metadata: input.metadata ?? {},
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/esignatures");
  return { ok: true, id: data.id };
}

export async function listSignatures(documentId: string, documentType: string): Promise<DocumentSignature[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("document_signatures")
    .select("*")
    .eq("document_id", documentId)
    .eq("document_type", documentType)
    .eq("org_id", member.org_id)
    .order("signed_at", { ascending: true });

  if (error) return [];
  return (data ?? []) as DocumentSignature[];
}

export async function createSignatureRequest(input: {
  documentId: string;
  documentType: string;
  projectId?: string;
  requestedToEmail: string;
  message?: string;
  expiresAt?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brак організації" };

  const { data, error } = await db(supabase).from("signature_requests").insert({
    document_id: input.documentId,
    document_type: input.documentType,
    project_id: input.projectId ?? null,
    org_id: member.org_id,
    requested_by: user.id,
    requested_to_email: input.requestedToEmail,
    message: input.message ?? null,
    expires_at: input.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/esignatures");
  return { ok: true, id: data.id };
}

export async function listSignatureRequests(documentId?: string): Promise<SignatureRequest[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  let query = db(supabase)
    .from("signature_requests")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (documentId) {
    query = query.eq("document_id", documentId);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as SignatureRequest[];
}

export async function declineSignatureRequest(requestId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("signature_requests")
    .update({ status: "declined", updated_at: new Date().toISOString() })
    .eq("id", requestId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/esignatures");
  return { ok: true };
}

export async function cancelSignatureRequest(requestId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("signature_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", requestId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/esignatures");
  return { ok: true };
}

export async function isDocumentFullySigned(documentId: string, documentType: string): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return false;

  const { data } = await db(supabase)
    .from("signature_requests")
    .select("id")
    .eq("document_id", documentId)
    .eq("document_type", documentType)
    .eq("org_id", member.org_id)
    .eq("status", "pending");

  return (data ?? []).length === 0;
}
