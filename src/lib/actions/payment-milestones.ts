"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export type PaymentMilestone = {
  id: string;
  offer_id: string;
  stage_id: string | null;
  name: string;
  description: string | null;
  amount: number;
  due_date: string | null;
  status: "pending" | "ready" | "released" | "cancelled";
  released_at: string | null;
  released_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MilestoneInput = {
  offerId: string;
  stageId?: string;
  name: string;
  description?: string;
  amount: number;
  dueDate?: string;
};

export async function createPaymentMilestone(input: MilestoneInput): Promise<{ ok: boolean; error?: string; milestoneId?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const { data: milestone, error } = await db(supabase)
    .from("payment_milestones")
    .insert({
      offer_id: input.offerId,
      stage_id: input.stageId || null,
      name: input.name,
      description: input.description || null,
      amount: input.amount,
      due_date: input.dueDate || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !milestone) return { ok: false, error: error?.message ?? "Błąd tworzenia etapu płatności" };

  revalidatePath("/dashboard/contractor/offers");
  return { ok: true, milestoneId: milestone.id };
}

export async function listPaymentMilestones(offerId: string): Promise<PaymentMilestone[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("payment_milestones")
    .select("*")
    .eq("offer_id", offerId)
    .order("due_date", { ascending: true, nullsFirst: true });
  if (error) return [];
  return (data ?? []) as PaymentMilestone[];
}

export async function updateMilestoneStatus(
  id: string, status: PaymentMilestone["status"]
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const updateData: any = { status };
  if (status === "released") {
    updateData.released_at = new Date().toISOString();
    updateData.released_by = user.id;
  }

  const { error } = await db(supabase)
    .from("payment_milestones")
    .update(updateData)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/contractor/offers");
  return { ok: true };
}

export async function deletePaymentMilestone(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("payment_milestones")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/contractor/offers");
  return { ok: true };
}
