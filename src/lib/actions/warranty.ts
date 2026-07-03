"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type WarrantyCategory =
  | "workmanship" | "materials" | "equipment" | "structural"
  | "waterproofing" | "electrical" | "plumbing" | "hvac" | "other";

export type WarrantyStatus = "active" | "claimed" | "resolved" | "expired" | "void";

export type WarrantyRecord = {
  id: string;
  project_id: string;
  org_id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  category: WarrantyCategory;
  responsible_party: string | null;
  start_date: string;
  end_date: string;
  warranty_months: number | null;
  status: WarrantyStatus;
  claim_date: string | null;
  claim_description: string | null;
  resolution_date: string | null;
  resolution_notes: string | null;
  document_ref: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listWarranties(projectId: string): Promise<WarrantyRecord[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("warranty_records").select("*").eq("project_id", projectId)
    .order("end_date", { ascending: true });
  if (error) return [];
  return (data ?? []) as WarrantyRecord[];
}

export async function listAllOrgWarranties(): Promise<WarrantyRecord[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];
  const { data, error } = await db(supabase)
    .from("warranty_records").select("*").eq("org_id", member.org_id)
    .in("status", ["active", "claimed"])
    .order("end_date", { ascending: true });
  if (error) return [];
  return (data ?? []) as WarrantyRecord[];
}

export async function createWarranty(input: {
  projectId: string; title: string; category?: WarrantyCategory;
  description?: string; responsibleParty?: string;
  startDate: string; endDate: string;
  documentRef?: string; notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("warranty_records").insert({
    project_id: input.projectId, org_id: member.org_id, created_by: user.id,
    title: input.title, category: input.category ?? "workmanship",
    description: input.description ?? null,
    responsible_party: input.responsibleParty ?? null,
    start_date: input.startDate, end_date: input.endDate,
    document_ref: input.documentRef ?? null, notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/gwarancje`);
  return { ok: true, id: data.id };
}

export async function claimWarranty(
  id: string, projectId: string, claimDescription: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("warranty_records").update({
    status: "claimed", claim_date: new Date().toISOString().slice(0, 10),
    claim_description: claimDescription, updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/gwarancje`);
  return { ok: true };
}

export async function resolveWarranty(
  id: string, projectId: string, resolutionNotes: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("warranty_records").update({
    status: "resolved", resolution_date: new Date().toISOString().slice(0, 10),
    resolution_notes: resolutionNotes, updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/gwarancje`);
  return { ok: true };
}
