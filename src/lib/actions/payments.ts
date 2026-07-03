"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type PaymentProvider = "stripe" | "przelewy24" | "bank_transfer" | "cash";
export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "cancelled" | "refunded";

export type PaymentMethod = {
  id: string;
  org_id: string;
  type: PaymentProvider;
  provider: string;
  is_default: boolean;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type PaymentTransaction = {
  id: string;
  org_id: string;
  project_id: string | null;
  offer_id: string | null;
  milestone_id: string | null;
  payment_method_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  provider_transaction_id: string | null;
  provider_status: string | null;
  description: string | null;
  notes: string | null;
  processed_at: string | null;
  failed_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function createPaymentMethod(input: {
  type: PaymentProvider;
  provider: string;
  isDefault?: boolean;
  metadata?: Record<string, any>;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Не залоговано" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Брак організації" };

  // If setting as default, unset other defaults
  if (input.isDefault) {
    await db(supabase)
      .from("payment_methods")
      .update({ is_default: false })
      .eq("org_id", member.org_id);
  }

  const { data, error } = await db(supabase).from("payment_methods").insert({
    org_id: member.org_id,
    type: input.type,
    provider: input.provider,
    is_default: input.isDefault ?? false,
    is_active: true,
    metadata: input.metadata ?? {},
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/payments");
  return { ok: true, id: data.id };
}

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("payment_methods")
    .select("*")
    .eq("org_id", member.org_id)
    .eq("is_active", true)
    .order("is_default", { ascending: false });

  if (error) return [];
  return (data ?? []) as PaymentMethod[];
}

export async function createPaymentTransaction(input: {
  amount: number;
  currency?: string;
  projectId?: string;
  offerId?: string;
  milestoneId?: string;
  paymentMethodId?: string;
  description?: string;
  notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Не залоговано" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Брак організації" };

  // Get payment method to determine provider
  let provider = "bank_transfer";
  if (input.paymentMethodId) {
    const { data: method } = await db(supabase)
      .from("payment_methods")
      .select("provider")
      .eq("id", input.paymentMethodId)
      .single();
    if (method) provider = method.provider;
  }

  const { data, error } = await db(supabase).from("payment_transactions").insert({
    org_id: member.org_id,
    project_id: input.projectId ?? null,
    offer_id: input.offerId ?? null,
    milestone_id: input.milestoneId ?? null,
    payment_method_id: input.paymentMethodId ?? null,
    amount: input.amount,
    currency: input.currency ?? "PLN",
    status: "pending",
    provider,
    description: input.description ?? null,
    notes: input.notes ?? null,
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/payments");
  return { ok: true, id: data.id };
}

export async function listPaymentTransactions(projectId?: string, status?: PaymentStatus): Promise<PaymentTransaction[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  let query = db(supabase)
    .from("payment_transactions")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (projectId) query = query.eq("project_id", projectId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as PaymentTransaction[];
}

export async function updatePaymentStatus(
  transactionId: string,
  status: PaymentStatus,
  providerStatus?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();

  const updateData: any = { status };
  if (status === "completed") updateData.processed_at = new Date().toISOString();
  if (status === "failed") updateData.failed_at = new Date().toISOString();
  if (status === "refunded") updateData.refunded_at = new Date().toISOString();
  if (providerStatus) updateData.provider_status = providerStatus;

  const { error } = await db(supabase)
    .from("payment_transactions")
    .update(updateData)
    .eq("id", transactionId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/payments");
  return { ok: true };
}

export async function getPaymentStats(): Promise<{
  total: number;
  pending: number;
  completed: number;
  failed: number;
}> {
  const transactions = await listPaymentTransactions();
  return {
    total: transactions.length,
    pending: transactions.filter((t) => t.status === "pending").length,
    completed: transactions.filter((t) => t.status === "completed").length,
    failed: transactions.filter((t) => t.status === "failed").length,
  };
}
