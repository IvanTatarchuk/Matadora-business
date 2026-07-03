"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type RetentionStatus = "held" | "partially_released" | "released" | "disputed";
export type RetentionDirection = "held" | "paid_out";

export type RetentionPayment = {
  id: string; project_id: string; org_id: string; created_by: string | null;
  title: string; description: string | null;
  party_name: string; direction: RetentionDirection;
  contract_value: number; retention_pct: number;
  retention_amount: number | null;
  release_condition: string | null; release_date: string | null;
  released_at: string | null; released_amount: number | null;
  status: RetentionStatus; notes: string | null;
  created_at: string; updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listRetentions(projectId: string): Promise<RetentionPayment[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("retention_payments").select("*").eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as RetentionPayment[];
}

export async function createRetention(input: {
  projectId: string; title: string; description?: string;
  partyName: string; direction?: RetentionDirection;
  contractValue: number; retentionPct?: number;
  releaseCondition?: string; releaseDate?: string; notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("retention_payments").insert({
    project_id: input.projectId, org_id: member.org_id, created_by: user.id,
    title: input.title, description: input.description ?? null,
    party_name: input.partyName, direction: input.direction ?? "held",
    contract_value: input.contractValue, retention_pct: input.retentionPct ?? 5,
    release_condition: input.releaseCondition ?? null,
    release_date: input.releaseDate ?? null,
    notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/kaucja`);
  return { ok: true, id: data.id };
}

export async function releaseRetention(
  id: string, projectId: string, releasedAmount: number, notes?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: ret } = await db(supabase).from("retention_payments").select("retention_amount").eq("id", id).single();
  const isFullRelease = ret && releasedAmount >= (ret.retention_amount ?? 0);
  const { error } = await db(supabase).from("retention_payments").update({
    status: isFullRelease ? "released" : "partially_released",
    released_at: new Date().toISOString().slice(0, 10),
    released_amount: releasedAmount,
    notes: notes ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/kaucja`);
  return { ok: true };
}
