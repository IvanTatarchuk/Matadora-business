"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type EmailTemplate = 
  | "offer_sent" 
  | "offer_accepted" 
  | "project_created" 
  | "task_assigned" 
  | "payment_received" 
  | "invoice_sent" 
  | "notification_summary";

export type EmailConfig = {
  to: string | string[];
  subject: string;
  template: EmailTemplate;
  data: Record<string, any>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function sendEmail(config: EmailConfig): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  // Store email in queue (would be processed by a worker in production)
  const { error } = await db(supabase).from("email_queue").insert({
    to: Array.isArray(config.to) ? config.to : [config.to],
    subject: config.subject,
    template: config.template,
    data: config.data,
    status: "pending",
    created_by: user.id,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function sendNotificationEmail(
  userId: string,
  notificationId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  
  // Get notification details
  const { data: notification } = await db(supabase)
    .from("notifications")
    .select("*")
    .eq("id", notificationId)
    .single();

  if (!notification) return { ok: false, error: "Notification not found" };

  // Get user email
  const { data: profile } = await db(supabase)
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (!profile?.email) return { ok: false, error: "User email not found" };

  const templateMap: Record<string, EmailTemplate> = {
    offer_sent: "offer_sent",
    offer_accepted: "offer_accepted",
    message_received: "notification_summary",
    payment_released: "payment_received",
    task_assigned: "task_assigned",
    project_update: "notification_summary",
    review_received: "notification_summary",
    milestone_ready: "notification_summary",
  };

  const template = templateMap[notification.type] || "notification_summary";

  return await sendEmail({
    to: profile.email,
    subject: notification.title,
    template,
    data: {
      recipientName: profile.full_name,
      notificationTitle: notification.title,
      notificationMessage: notification.message,
      notificationLink: notification.link,
    },
  });
}

export async function sendDailyDigest(userId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  
  // Get unread notifications
  const { data: notifications } = await db(supabase)
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!notifications || notifications.length === 0) {
    return { ok: true }; // No notifications to send
  }

  // Get user email
  const { data: profile } = await db(supabase)
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (!profile?.email) return { ok: false, error: "User email not found" };

  return await sendEmail({
    to: profile.email,
    subject: `Codzienny podsumowanie - ${notifications.length} nowych powiadomień`,
    template: "notification_summary",
    data: {
      recipientName: profile.full_name,
      notificationCount: notifications.length,
      notifications,
    },
  });
}

export async function listEmailQueue(status?: string): Promise<any[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  let query = db(supabase)
    .from("email_queue")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return [];
  return data ?? [];
}

export async function retryEmail(emailId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("email_queue")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("id", emailId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getEmailPreferences(): Promise<any> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await db(supabase)
    .from("email_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!data) {
    // Create default preferences
    const { data: newPrefs } = await db(supabase)
      .from("email_preferences")
      .insert({
        user_id: user.id,
        email_enabled: true,
        daily_digest: true,
        instant_notifications: true,
        offer_updates: true,
        task_assignments: true,
        payment_updates: true,
      })
      .select("*")
      .single();
    return newPrefs;
  }

  return data;
}

export async function updateEmailPreferences(preferences: {
  emailEnabled?: boolean;
  dailyDigest?: boolean;
  instantNotifications?: boolean;
  offerUpdates?: boolean;
  taskAssignments?: boolean;
  paymentUpdates?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const { error } = await db(supabase)
    .from("email_preferences")
    .upsert({
      user_id: user.id,
      email_enabled: preferences.emailEnabled ?? true,
      daily_digest: preferences.dailyDigest ?? true,
      instant_notifications: preferences.instantNotifications ?? true,
      offer_updates: preferences.offerUpdates ?? true,
      task_assignments: preferences.taskAssignments ?? true,
      payment_updates: preferences.paymentUpdates ?? true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
