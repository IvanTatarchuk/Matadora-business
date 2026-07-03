"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type NotificationType =
  | "info" | "warning" | "error" | "success"
  | "rfi_new" | "rfi_answered" | "punch_opened" | "punch_closed"
  | "inspection_completed" | "risk_high" | "budget_alert"
  | "cert_expiring" | "warranty_expiring" | "document_uploaded"
  | "payment_due" | "daily_report_submitted";

export type Notification = {
  id: string;
  user_id: string;
  org_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listNotifications(limit = 50): Promise<Notification[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await db(supabase)
    .from("notifications").select("*").eq("user_id", user.id)
    .order("created_at", { ascending: false }).limit(limit);
  if (error) return [];
  return (data ?? []) as Notification[];
}

export async function countUnreadNotifications(): Promise<number> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count, error } = await db(supabase)
    .from("notifications").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).eq("is_read", false);
  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = createClient();
  await db(supabase).from("notifications").update({
    is_read: true, read_at: new Date().toISOString(),
  }).eq("id", id);
  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await db(supabase).from("notifications").update({
    is_read: true, read_at: new Date().toISOString(),
  }).eq("user_id", user.id).eq("is_read", false);
  revalidatePath("/dashboard");
}

export async function createNotification(input: {
  userId: string; orgId?: string;
  type: NotificationType; title: string;
  body?: string; href?: string;
  entityType?: string; entityId?: string;
}): Promise<void> {
  const supabase = createClient();
  await db(supabase).from("notifications").insert({
    user_id: input.userId, org_id: input.orgId ?? null,
    type: input.type, title: input.title,
    body: input.body ?? null, href: input.href ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
  });
}
