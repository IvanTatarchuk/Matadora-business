"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type LeadStage =
  | "prospect" | "contact" | "site_visit" | "offer_sent" | "negotiation"
  | "won" | "lost" | "on_hold";

export type LeadSource =
  | "referral" | "przetarg" | "website" | "social" | "cold_call" | "repeat_client" | "other";

export type Lead = {
  id: string;
  org_id: string;
  created_by: string | null;
  client_name: string;
  client_company: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_nip: string | null;
  title: string;
  description: string | null;
  address: string | null;
  city: string | null;
  stage: LeadStage;
  estimated_value: number | null;
  win_probability: number;
  source: LeadSource;
  first_contact_date: string;
  expected_start_date: string | null;
  expected_close_date: string | null;
  won_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  project_id: string | null;
  priority: "low" | "medium" | "high";
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  activities?: LeadActivity[];
};

export type LeadActivity = {
  id: string;
  lead_id: string;
  created_by: string | null;
  activity_type: "note" | "call" | "email" | "meeting" | "site_visit" | "offer" | "follow_up" | "stage_change";
  title: string;
  description: string | null;
  activity_date: string;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listLeads(): Promise<Lead[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("leads")
    .select("*, activities:lead_activities(*)")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as Lead[];
}

export async function getLeadWithActivities(leadId: string): Promise<Lead | null> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("leads").select("*, activities:lead_activities(*)").eq("id", leadId).single();
  if (error) return null;
  return data as Lead;
}

export async function createLead(input: {
  clientName: string; clientCompany?: string; clientEmail?: string;
  clientPhone?: string; clientNip?: string; title: string; description?: string;
  address?: string; city?: string; estimatedValue?: number;
  winProbability?: number; source?: LeadSource; priority?: "low" | "medium" | "high";
  expectedStartDate?: string; expectedCloseDate?: string; notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("leads").insert({
    org_id: member.org_id, created_by: user.id,
    client_name: input.clientName, client_company: input.clientCompany ?? null,
    client_email: input.clientEmail ?? null, client_phone: input.clientPhone ?? null,
    client_nip: input.clientNip ?? null, title: input.title,
    description: input.description ?? null, address: input.address ?? null,
    city: input.city ?? null, estimated_value: input.estimatedValue ?? null,
    win_probability: input.winProbability ?? 50, source: input.source ?? "referral",
    priority: input.priority ?? "medium",
    expected_start_date: input.expectedStartDate ?? null,
    expected_close_date: input.expectedCloseDate ?? null,
    notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/crm");
  return { ok: true, id: data.id };
}

export async function updateLeadStage(
  id: string, stage: LeadStage, lostReason?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const extraFields: Record<string, unknown> = {};
  if (stage === "won") extraFields.won_at = new Date().toISOString();
  if (stage === "lost") { extraFields.lost_at = new Date().toISOString(); extraFields.lost_reason = lostReason ?? null; }

  const { error } = await db(supabase)
    .from("leads")
    .update({ stage, updated_at: new Date().toISOString(), ...extraFields })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/crm");
  return { ok: true };
}

export async function addLeadActivity(input: {
  leadId: string;
  activityType: LeadActivity["activity_type"];
  title: string;
  description?: string;
  activityDate?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await db(supabase).from("lead_activities").insert({
    lead_id: input.leadId, created_by: user?.id ?? null,
    activity_type: input.activityType, title: input.title,
    description: input.description ?? null,
    activity_date: input.activityDate ?? new Date().toISOString(),
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/crm");
  return { ok: true, id: data.id };
}

export async function deleteLead(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("leads").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/crm");
  return { ok: true };
}
