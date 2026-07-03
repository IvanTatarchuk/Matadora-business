"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type InvoiceDirection = "incoming" | "outgoing";
export type InvoiceType = "vat" | "proforma" | "advance" | "correction" | "note" | "other";
export type InvoiceStatus = "draft" | "sent" | "unpaid" | "partially_paid" | "paid" | "overdue" | "cancelled";

export type Invoice = {
  id: string; project_id: string | null; org_id: string; created_by: string | null;
  invoice_number: string; direction: InvoiceDirection; type: InvoiceType;
  counterparty: string; nip: string | null;
  issue_date: string; sale_date: string | null; due_date: string | null; paid_date: string | null;
  net_amount: number; vat_rate: number;
  vat_amount: number | null; gross_amount: number | null;
  currency: string; status: InvoiceStatus;
  ksef_reference: string | null; payment_method: string | null;
  bank_account: string | null; description: string | null; notes: string | null;
  created_at: string; updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listInvoices(projectId?: string): Promise<Invoice[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  let q = db(supabase).from("invoices").select("*").eq("org_id", member.org_id);
  if (projectId) q = q.eq("project_id", projectId);
  const { data, error } = await q.order("issue_date", { ascending: false });
  if (error) return [];
  return (data ?? []) as Invoice[];
}

export async function createInvoice(input: {
  projectId?: string; invoiceNumber: string; direction?: InvoiceDirection; type?: InvoiceType;
  counterparty: string; nip?: string;
  issueDate: string; saleDate?: string; dueDate?: string;
  netAmount: number; vatRate?: number; currency?: string;
  paymentMethod?: string; bankAccount?: string;
  description?: string; notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("invoices").insert({
    project_id: input.projectId ?? null, org_id: member.org_id, created_by: user.id,
    invoice_number: input.invoiceNumber, direction: input.direction ?? "outgoing",
    type: input.type ?? "vat", counterparty: input.counterparty, nip: input.nip ?? null,
    issue_date: input.issueDate, sale_date: input.saleDate ?? null, due_date: input.dueDate ?? null,
    net_amount: input.netAmount, vat_rate: input.vatRate ?? 23, currency: input.currency ?? "PLN",
    payment_method: input.paymentMethod ?? "transfer",
    bank_account: input.bankAccount ?? null,
    description: input.description ?? null, notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/finanse/faktury");
  if (input.projectId) revalidatePath(`/dashboard/contractor/projects/${input.projectId}/faktury`);
  return { ok: true, id: data.id };
}

export async function markInvoicePaid(id: string, paidDate?: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("invoices").update({
    status: "paid", paid_date: paidDate ?? new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/finanse/faktury");
  return { ok: true };
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("invoices").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/finanse/faktury");
  return { ok: true };
}
