"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SubBidStatus = "draft" | "submitted" | "shortlisted" | "accepted" | "rejected";

export type SubBid = {
  id: string;
  rfq_id: string;
  project_id: string;
  org_id: string;
  subcontractor_id: string | null;
  bidder_name: string;
  bidder_nip: string | null;
  bidder_email: string | null;
  bidder_phone: string | null;
  amount_net: number;
  vat_rate: number;
  amount_gross: number;
  completion_days: number | null;
  notes: string | null;
  file_url: string | null;
  status: SubBidStatus;
  submitted_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  subcontractor?: { insurance_expiry: string | null; license_number: string | null } | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listSubBids(rfqId: string): Promise<SubBid[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("sub_bids").select("*, subcontractor:subcontractors(insurance_expiry, license_number)").eq("rfq_id", rfqId)
    .order("amount_net", { ascending: true });
  if (error) return [];
  return (data ?? []) as SubBid[];
}

export async function listProjectSubBids(projectId: string): Promise<SubBid[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("sub_bids").select("*, subcontractor:subcontractors(insurance_expiry, license_number)").eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as SubBid[];
}

export async function createSubBid(input: {
  rfqId: string;
  projectId: string;
  bidderName: string;
  bidderNip?: string;
  bidderEmail?: string;
  bidderPhone?: string;
  amountNet: number;
  vatRate?: number;
  completionDays?: number;
  notes?: string;
  fileUrl?: string;
  subcontractorId?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members")
    .select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  if (!input.bidderName.trim()) return { ok: false, error: "Nazwa oferenta jest wymagana" };
  if (input.amountNet <= 0) return { ok: false, error: "Kwota musi być większa od 0" };

  const { data, error } = await db(supabase).from("sub_bids").insert({
    rfq_id: input.rfqId, project_id: input.projectId, org_id: member.org_id,
    subcontractor_id: input.subcontractorId ?? null,
    bidder_name: input.bidderName.trim(),
    bidder_nip: input.bidderNip ?? null,
    bidder_email: input.bidderEmail ?? null,
    bidder_phone: input.bidderPhone ?? null,
    amount_net: input.amountNet, vat_rate: input.vatRate ?? 8,
    completion_days: input.completionDays ?? null,
    notes: input.notes ?? null, file_url: input.fileUrl ?? null,
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/rfq`);
  return { ok: true, id: data.id };
}

export async function updateSubBidStatus(
  id: string, projectId: string, rfqId: string,
  status: SubBidStatus, reviewNotes?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("sub_bids").update({
    status, review_notes: reviewNotes ?? null,
    reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  // If accepting a bid, reject all others for same RFQ
  if (status === "accepted") {
    await db(supabase).from("sub_bids")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("rfq_id", rfqId).neq("id", id).eq("status", "submitted");
  }

  revalidatePath(`/dashboard/contractor/projects/${projectId}/rfq`);
  return { ok: true };
}

export async function deleteSubBid(id: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("sub_bids").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/rfq`);
  return { ok: true };
}
