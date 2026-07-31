"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupportAdmin } from "@/lib/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export type SupportTicketStatus =
  | "open"
  | "triaging"
  | "fix_drafted"
  | "waiting_on_user"
  | "resolved"
  | "wont_fix";

export type SupportTicket = {
  id: string;
  reporter_id: string | null;
  reporter_role: string | null;
  reporter_email: string | null;
  page_url: string | null;
  message: string;
  status: SupportTicketStatus;
  triage_notes: string | null;
  fix_branch: string | null;
  fix_summary: string | null;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
};

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function createSupportTicket(input: {
  message: string;
  pageUrl?: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const message = input.message.trim();
  if (!message) return { ok: false, error: "Opisz problem przed wysłaniem." };
  if (message.length > 4000) return { ok: false, error: "Opis jest za długi (max 4000 znaków)." };

  const { data: profile } = await db(supabase)
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const { data, error } = await db(supabase)
    .from("support_tickets")
    .insert({
      reporter_id: user.id,
      reporter_role: profile?.role ?? null,
      reporter_email: user.email ?? null,
      page_url: input.pageUrl ?? null,
      message,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  try {
    const { emailNewSupportTicket } = await import("@/lib/email");
    await emailNewSupportTicket({
      ticketId: data.id,
      reporterEmail: user.email ?? "unknown",
      reporterRole: profile?.role ?? "unknown",
      pageUrl: input.pageUrl ?? null,
      message,
    });
  } catch {
    // Non-blocking — the ticket is already saved
  }

  revalidatePath("/dashboard/support-inbox");
  return { ok: true, id: data.id };
}

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isSupportAdmin(user.email)) return null;
  return user;
}

export async function listSupportTickets(): Promise<SupportTicket[]> {
  const admin = await requireAdmin();
  if (!admin) return [];

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data } = await db(supabase)
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function updateTicketStatus(
  id: string,
  status: SupportTicketStatus
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Brak uprawnień" };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { error } = await db(supabase)
    .from("support_tickets")
    .update({ status })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/support-inbox");
  return { ok: true };
}

export async function replyToTicket(id: string, reply: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Brak uprawnień" };

  const trimmed = reply.trim();
  if (!trimmed) return { ok: false, error: "Odpowiedź nie może być pusta." };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const { data: ticket } = await db(supabase)
    .from("support_tickets")
    .select("reporter_email")
    .eq("id", id)
    .maybeSingle();

  const { error } = await db(supabase)
    .from("support_tickets")
    .update({ admin_reply: trimmed, status: "waiting_on_user" })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  if (ticket?.reporter_email) {
    try {
      const { emailTicketReply } = await import("@/lib/email");
      await emailTicketReply({ reporterEmail: ticket.reporter_email, reply: trimmed });
    } catch {
      // Non-blocking
    }
  }

  revalidatePath("/dashboard/support-inbox");
  return { ok: true };
}
