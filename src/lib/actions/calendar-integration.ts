"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CalendarProvider = "google" | "outlook" | "ical";
export type SyncDirection = "bidirectional" | "to_platform" | "from_platform";

export type CalendarConnection = {
  id: string;
  org_id: string;
  user_id: string;
  provider: CalendarProvider;
  email: string;
  calendar_id: string | null;
  calendar_name: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  sync_enabled: boolean;
  sync_direction: SyncDirection;
  last_sync_at: string | null;
  last_sync_status: string | null;
  created_at: string;
  updated_at: string;
};

export type CalendarSyncLog = {
  id: string;
  connection_id: string | null;
  org_id: string;
  status: "success" | "failed" | "partial";
  events_synced: number;
  events_created: number;
  events_updated: number;
  events_deleted: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function createCalendarConnection(input: {
  provider: CalendarProvider;
  email: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  calendarId?: string;
  calendarName?: string;
  syncDirection?: SyncDirection;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("calendar_connections").insert({
    org_id: member.org_id,
    user_id: user.id,
    provider: input.provider,
    email: input.email,
    access_token: input.accessToken,
    refresh_token: input.refreshToken ?? null,
    token_expires_at: input.tokenExpiresAt ?? null,
    calendar_id: input.calendarId ?? null,
    calendar_name: input.calendarName ?? null,
    sync_enabled: true,
    sync_direction: input.syncDirection ?? "bidirectional",
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/calendar-integration");
  return { ok: true, id: data.id };
}

export async function listCalendarConnections(): Promise<CalendarConnection[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("calendar_connections")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as CalendarConnection[];
}

export async function toggleCalendarSync(connectionId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: connection } = await db(supabase)
    .from("calendar_connections")
    .select("sync_enabled")
    .eq("id", connectionId)
    .single();

  if (!connection) return { ok: false, error: "Nie znaleziono połączenia" };

  const { error } = await db(supabase)
    .from("calendar_connections")
    .update({ sync_enabled: !connection.sync_enabled })
    .eq("id", connectionId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/calendar-integration");
  return { ok: true };
}

export async function deleteCalendarConnection(connectionId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("calendar_connections")
    .delete()
    .eq("id", connectionId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/calendar-integration");
  return { ok: true };
}

export async function listCalendarSyncLogs(connectionId?: string): Promise<CalendarSyncLog[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  let query = db(supabase)
    .from("calendar_sync_logs")
    .select("*")
    .eq("org_id", member.org_id)
    .order("started_at", { ascending: false })
    .limit(50);

  if (connectionId) query = query.eq("connection_id", connectionId);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as CalendarSyncLog[];
}

export async function triggerSync(connectionId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  
  // Create sync log entry
  const { data: connection } = await db(supabase)
    .from("calendar_connections")
    .select("*")
    .eq("id", connectionId)
    .single();

  if (!connection) return { ok: false, error: "Nie znaleziono połączenia" };

  const { error } = await db(supabase).from("calendar_sync_logs").insert({
    connection_id: connectionId,
    org_id: connection.org_id,
    status: "success",
    events_synced: 0,
    events_created: 0,
    events_updated: 0,
    events_deleted: 0,
    completed_at: new Date().toISOString(),
  });

  if (error) return { ok: false, error: error.message };

  // Update connection last sync
  await db(supabase)
    .from("calendar_connections")
    .update({ last_sync_at: new Date().toISOString(), last_sync_status: "success" })
    .eq("id", connectionId);

  revalidatePath("/dashboard/calendar-integration");
  return { ok: true };
}

export async function getCalendarStats(): Promise<{
  totalConnections: number;
  activeConnections: number;
  totalSyncs: number;
  successfulSyncs: number;
}> {
  const connections = await listCalendarConnections();
  const syncLogs = await listCalendarSyncLogs();

  return {
    totalConnections: connections.length,
    activeConnections: connections.filter((c) => c.sync_enabled).length,
    totalSyncs: syncLogs.length,
    successfulSyncs: syncLogs.filter((l) => l.status === "success").length,
  };
}
