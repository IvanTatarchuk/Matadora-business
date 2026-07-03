"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type EvmSnapshot = {
  id: string; project_id: string; org_id: string; created_by: string | null;
  snapshot_date: string; period_label: string | null;
  bac: number; pv: number; ev: number; ac: number;
  sv: number | null; cv: number | null;
  spi: number | null; cpi: number | null;
  etc: number | null; eac: number | null;
  percent_complete: number | null;
  notes: string | null; created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listEvmSnapshots(projectId: string): Promise<EvmSnapshot[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("evm_snapshots").select("*").eq("project_id", projectId)
    .order("snapshot_date", { ascending: false });
  if (error) return [];
  return (data ?? []) as EvmSnapshot[];
}

export async function createEvmSnapshot(input: {
  projectId: string;
  snapshotDate: string; periodLabel?: string;
  bac: number; pv: number; ev: number; ac: number;
  notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("evm_snapshots").insert({
    project_id: input.projectId, org_id: member.org_id, created_by: user.id,
    snapshot_date: input.snapshotDate, period_label: input.periodLabel ?? null,
    bac: input.bac, pv: input.pv, ev: input.ev, ac: input.ac,
    notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/evm`);
  return { ok: true, id: data.id };
}
