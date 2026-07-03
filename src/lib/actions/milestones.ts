"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type MilestoneStatus = "planned" | "in_progress" | "pending_approval" | "approved" | "invoiced";

export type Milestone = {
  id: string;
  project_id: string;
  org_id: string;
  title: string;
  description: string | null;
  order_index: number;
  amount_net: number;
  vat_rate: number;
  amount_gross: number;
  planned_date: string | null;
  completed_date: string | null;
  status: MilestoneStatus;
  approved_by: string | null;
  approved_at: string | null;
  invoice_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

function revalidate(projectId: string) {
  revalidatePath(`/dashboard/contractor/projects/${projectId}/milestones`);
  revalidatePath(`/dashboard/investor/projects/${projectId}`);
}

export async function listMilestones(projectId: string): Promise<Milestone[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("project_milestones").select("*").eq("project_id", projectId)
    .order("order_index", { ascending: true });
  if (error) return [];
  return (data ?? []) as Milestone[];
}

export async function createMilestone(input: {
  projectId: string;
  title: string;
  description?: string;
  amountNet: number;
  vatRate?: number;
  plannedDate?: string;
  notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members")
    .select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data: last } = await db(supabase)
    .from("project_milestones").select("order_index")
    .eq("project_id", input.projectId).order("order_index", { ascending: false }).limit(1).single();

  const { data, error } = await db(supabase).from("project_milestones").insert({
    project_id: input.projectId, org_id: member.org_id,
    title: input.title, description: input.description ?? null,
    order_index: (last?.order_index ?? 0) + 1,
    amount_net: input.amountNet, vat_rate: input.vatRate ?? 23,
    planned_date: input.plannedDate ?? null, notes: input.notes ?? null,
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidate(input.projectId);
  return { ok: true, id: data.id };
}

export async function updateMilestoneStatus(
  id: string, projectId: string, status: MilestoneStatus,
  completedDate?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "approved") {
    updates.approved_by = user.id;
    updates.approved_at = new Date().toISOString();
  }
  if (completedDate) updates.completed_date = completedDate;

  const { error } = await db(supabase).from("project_milestones").update(updates).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate(projectId);
  return { ok: true };
}

export async function deleteMilestone(id: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("project_milestones").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate(projectId);
  return { ok: true };
}

export async function createInvoiceFromMilestone(
  milestoneId: string, projectId: string, counterparty: string, nip?: string
): Promise<{ ok: boolean; invoiceId?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members")
    .select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data: ms } = await db(supabase)
    .from("project_milestones").select("*").eq("id", milestoneId).single();
  if (!ms) return { ok: false, error: "Kamień milowy nie znaleziony" };
  if (ms.status !== "approved") return { ok: false, error: "Kamień milowy musi być zatwierdzony przez inwestora" };
  if (ms.invoice_id) return { ok: false, error: "Faktura już istnieje dla tego kamienia milowego" };

  // Auto-generate invoice number
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7).replace("-", "/");
  const { data: last } = await db(supabase).from("invoices").select("invoice_number")
    .eq("org_id", member.org_id).ilike("invoice_number", `FV/${month}/%`)
    .order("created_at", { ascending: false }).limit(1).single();
  const seq = last
    ? (parseInt((last.invoice_number as string).split("/").pop() ?? "0") + 1)
    : 1;
  const invoiceNumber = `FV/${month}/${String(seq).padStart(3, "0")}`;

  const { data: inv, error: invErr } = await db(supabase).from("invoices").insert({
    project_id: projectId, org_id: member.org_id, created_by: user.id,
    invoice_number: invoiceNumber, direction: "outgoing", type: "vat",
    counterparty, nip: nip ?? null,
    issue_date: today, due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    net_amount: ms.amount_net, vat_rate: ms.vat_rate, currency: "PLN",
    payment_method: "transfer",
    description: `Kamień milowy: ${ms.title}`,
  }).select("id").single();

  if (invErr) return { ok: false, error: invErr.message };

  // Link invoice to milestone
  await db(supabase).from("project_milestones")
    .update({ status: "invoiced", invoice_id: inv.id, updated_at: new Date().toISOString() })
    .eq("id", milestoneId);

  revalidate(projectId);
  revalidatePath("/dashboard/finanse/faktury");
  return { ok: true, invoiceId: inv.id };
}
