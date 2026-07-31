"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Must match the `cert_type` check constraint on public.worker_certifications
// (supabase/migrations/0017_subcontractors_inspections_equipment_po.sql).
export type CertificationType =
  | "bhp_general"      // Szkolenie BHP ogólne
  | "bhp_work"          // Szkolenie BHP stanowiskowe
  | "udt_operator"      // Uprawnienia UDT
  | "electrical_e"      // Uprawnienia elektryczne E (eksploatacja)
  | "electrical_d"      // Uprawnienia elektryczne D (dozór)
  | "high_work"         // Praca na wysokości
  | "forklift"          // Wózek widłowy
  | "crane"             // Dźwig
  | "welding"           // Spawanie (np. PREN)
  | "driving_cat_b"     // Prawo jazdy kat. B
  | "driving_cat_c"     // Prawo jazdy kat. C
  | "driving_cat_ce"    // Prawo jazdy kat. CE
  | "first_aid"         // Pierwsza pomoc
  | "asbestos"          // Usuwanie azbestu
  | "scaffolding"       // Rusztowania
  | "blasting"          // Roboty strzałowe
  | "gas_installation"  // Instalacje gazowe
  | "other";

export type WorkerCertification = {
  id: string;
  worker_id: string;
  org_id: string;
  cert_type: CertificationType;
  cert_name: string;
  cert_number: string | null;
  issuing_body: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  is_permanent: boolean;
  file_url: string | null;
  notes: string | null;
  created_at: string;
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
  certType: CertificationType;
  certName: string;
  issuingBody?: string;
  certNumber?: string;
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
    cert_type: input.certType,
    cert_name: input.certName,
    issuing_body: input.issuingBody ?? null,
    cert_number: input.certNumber ?? null,
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

/** Same as listExpiringCertifications, scoped to a specific set of workers (e.g. a crew's members) rather than the whole org. */
export async function listExpiringCertificationsForWorkers(
  workerIds: string[],
  daysAhead = 60
): Promise<WorkerCertification[]> {
  if (workerIds.length === 0) return [];
  const supabase = createClient();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);

  const { data, error } = await db(supabase)
    .from("worker_certifications")
    .select("*, worker:worker_id(full_name, specialty)")
    .in("worker_id", workerIds)
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

