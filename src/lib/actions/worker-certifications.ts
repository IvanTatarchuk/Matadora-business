"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CertificationType =
  | "bhp_general"      // Karta szkolenia BHP ogólnego
  | "bhp_instruction"  // Instruktaż stanowiskowy
  | "upe"              // Uprawnienia budowlane
  | "sep_e"            // SEP — eksploatacja do 1kV
  | "sep_d"            // SEP — dozór
  | "udt"              // Uprawnienia UDT (wózki, dźwigi)
  | "first_aid"        // Kurs pierwszej pomocy
  | "scaffold"         // Uprawnienia do rusztowań
  | "asbestos"         // Praca z azbestem
  | "welding"          // Uprawnienia spawalnicze
  | "crane_operator"   // Operator dźwigu
  | "forklift"         // Wózek widłowy
  | "explosives"       // Materiały wybuchowe
  | "driving_cat_c"    // Prawo jazdy kat. C
  | "driving_cat_ce"   // Prawo jazdy kat. CE
  | "work_at_height"   // Praca na wysokości
  | "confined_space"   // Przestrzenie ograniczone
  | "custom";

export type WorkerCertification = {
  id: string;
  worker_id: string;
  org_id: string;
  certification_type: CertificationType;
  custom_name: string | null;
  issuing_authority: string | null;
  certificate_number: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  is_permanent: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  worker_name?: string | null;
  worker_specialty?: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listOrgCertifications(): Promise<WorkerCertification[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("worker_certifications")
    .select("*, worker:worker_id(full_name, specialty)")
    .eq("org_id", member.org_id)
    .order("expiry_date", { ascending: true, nullsFirst: false });
  if (error) return [];
  return (data ?? []).map((c: Record<string, unknown>) => ({
    ...c,
    worker_name: (c.worker as { full_name?: string } | null)?.full_name ?? null,
    worker_specialty: (c.worker as { specialty?: string } | null)?.specialty ?? null,
  })) as WorkerCertification[];
}

export async function listWorkerCertifications(workerId: string): Promise<WorkerCertification[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("worker_certifications")
    .select("*")
    .eq("worker_id", workerId)
    .order("expiry_date", { ascending: true, nullsFirst: false });
  if (error) return [];
  return (data ?? []) as WorkerCertification[];
}

export async function createCertification(input: {
  workerId: string;
  certificationType: CertificationType;
  customName?: string;
  issuingAuthority?: string;
  certificateNumber?: string;
  issuedDate?: string;
  expiryDate?: string;
  isPermanent?: boolean;
  notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("worker_certifications").insert({
    worker_id: input.workerId, org_id: member.org_id,
    certification_type: input.certificationType,
    custom_name: input.customName ?? null,
    issuing_authority: input.issuingAuthority ?? null,
    certificate_number: input.certificateNumber ?? null,
    issued_date: input.issuedDate ?? null,
    expiry_date: input.expiryDate ?? null,
    is_permanent: input.isPermanent ?? false,
    notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/kwalifikacje");
  return { ok: true, id: data.id };
}

export async function deleteCertification(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("worker_certifications").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/kwalifikacje");
  return { ok: true };
}

export async function listExpiringCertifications(daysAhead = 60): Promise<WorkerCertification[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);

  const { data, error } = await db(supabase)
    .from("worker_certifications")
    .select("*, worker:worker_id(full_name, specialty)")
    .eq("org_id", member.org_id)
    .eq("is_permanent", false)
    .lte("expiry_date", cutoff.toISOString().slice(0, 10))
    .order("expiry_date", { ascending: true });
  if (error) return [];
  return (data ?? []).map((c: Record<string, unknown>) => ({
    ...c,
    worker_name: (c.worker as { full_name?: string } | null)?.full_name ?? null,
    worker_specialty: (c.worker as { specialty?: string } | null)?.specialty ?? null,
  })) as WorkerCertification[];
}
