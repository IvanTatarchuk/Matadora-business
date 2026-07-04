"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type NotificationType =
  | "offer_sent" | "offer_accepted" | "offer_rejected"
  | "message_received" | "payment_released" | "task_assigned"
  | "project_update" | "review_received" | "milestone_ready"
  | "info" | "warning" | "error" | "success"
  | "ad_response_received" | "ad_response_accepted" | "ad_response_rejected"
  | "ad_review_received" | "ad_created";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  metadata: any;
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
    .eq("user_id", user.id).is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = createClient();
  await db(supabase).from("notifications").update({
    read_at: new Date().toISOString(),
  }).eq("id", id);
  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await db(supabase).from("notifications").update({
    read_at: new Date().toISOString(),
  }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/dashboard");
}

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  metadata?: any;
}): Promise<void> {
  const supabase = createClient();
  await db(supabase).from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message ?? null,
    link: input.link ?? null,
    metadata: input.metadata ?? null,
  });
}
