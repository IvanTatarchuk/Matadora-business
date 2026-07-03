"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SubSpecialty =
  | "general" | "electrical" | "plumbing" | "hvac" | "roofing" | "flooring"
  | "painting" | "insulation" | "concrete" | "steel" | "windows"
  | "landscaping" | "demolition" | "excavation" | "other";

export type Subcontractor = {
  id: string;
  org_id: string;
  name: string;
  nip: string | null;
  regon: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  specialty: SubSpecialty;
  rating: number | null;
  status: "active" | "inactive" | "blacklisted";
  notes: string | null;
  insurance_expiry: string | null;
  license_number: string | null;
  created_at: string;
  updated_at: string;
  contracts_count?: number;
};

export type SubcontractorContract = {
  id: string;
  project_id: string;
  subcontractor_id: string;
  org_id: string;
  contract_number: string | null;
  scope_description: string;
  start_date: string | null;
  end_date: string | null;
  contract_value: number;
  paid_to_date: number;
  retention_percent: number;
  status: "draft" | "active" | "completed" | "terminated";
  notes: string | null;
  created_at: string;
  subcontractor_name?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listSubcontractors(): Promise<Subcontractor[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("subcontractors")
    .select("*, contracts:subcontractor_contracts(count)")
    .eq("org_id", member.org_id)
    .order("name");
  if (error) return [];
  return (data ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    contracts_count: (s.contracts as { count: number }[] | null)?.[0]?.count ?? 0,
  })) as Subcontractor[];
}

export async function listProjectContracts(projectId: string): Promise<SubcontractorContract[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("subcontractor_contracts")
    .select("*, subcontractor:subcontractors(name)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((c: Record<string, unknown>) => ({
    ...c,
    subcontractor_name: (c.subcontractor as { name: string } | null)?.name ?? null,
  })) as SubcontractorContract[];
}

export async function createSubcontractor(input: {
  name: string; nip?: string; regon?: string;
  address?: string; city?: string; postalCode?: string;
  contactName?: string; contactEmail?: string; contactPhone?: string;
  website?: string; specialty?: SubSpecialty;
  insuranceExpiry?: string; licenseNumber?: string; notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("subcontractors").insert({
    org_id: member.org_id, name: input.name, nip: input.nip ?? null,
    regon: input.regon ?? null, address: input.address ?? null,
    city: input.city ?? null, postal_code: input.postalCode ?? null,
    contact_name: input.contactName ?? null, contact_email: input.contactEmail ?? null,
    contact_phone: input.contactPhone ?? null, website: input.website ?? null,
    specialty: input.specialty ?? "general",
    insurance_expiry: input.insuranceExpiry ?? null,
    license_number: input.licenseNumber ?? null, notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/podwykonawcy");
  return { ok: true, id: data.id };
}

export async function createSubcontractorContract(input: {
  projectId: string; subcontractorId: string;
  scopeDescription: string; contractNumber?: string;
  startDate?: string; endDate?: string; contractValue: number;
  retentionPercent?: number; paymentTerms?: string; notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("subcontractor_contracts").insert({
    project_id: input.projectId, subcontractor_id: input.subcontractorId,
    org_id: member.org_id, contract_number: input.contractNumber ?? null,
    scope_description: input.scopeDescription, start_date: input.startDate ?? null,
    end_date: input.endDate ?? null, contract_value: input.contractValue,
    retention_percent: input.retentionPercent ?? 10, notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/podwykonawcy`);
  return { ok: true, id: data.id };
}

export async function updateContractPayment(
  id: string, projectId: string, paidToDate: number
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("subcontractor_contracts").update({ paid_to_date: paidToDate }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/podwykonawcy`);
  return { ok: true };
}

export async function updateContractStatus(
  id: string, projectId: string, status: SubcontractorContract["status"]
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("subcontractor_contracts").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/podwykonawcy`);
  return { ok: true };
}

export async function rateSubcontractor(
  id: string, rating: number
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("subcontractors").update({ rating }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/podwykonawcy");
  return { ok: true };
}
