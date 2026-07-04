"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export type SecurityEventType = 
  | "failed_login" 
  | "suspicious_activity" 
  | "unauthorized_access"
  | "data_export" 
  | "permission_change" 
  | "api_key_leak"
  | "brute_force" 
  | "malicious_request";

export type SecuritySeverity = "low" | "medium" | "high" | "critical";

export type AuditLog = {
  id: string;
  org_id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  metadata: Record<string, any>;
  created_at: string;
};

export type SecurityEvent = {
  id: string;
  org_id: string;
  user_id: string | null;
  event_type: SecurityEventType;
  severity: SecuritySeverity;
  ip_address: string | null;
  user_agent: string | null;
  description: string | null;
  details: Record<string, any>;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
};

export type UserSession = {
  id: string;
  user_id: string;
  org_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  location_country: string | null;
  location_city: string | null;
  last_activity: string;
  ended_at: string | null;
  ended_reason: string | null;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function logAuditAction(input: {
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Не залоговано" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Брак організації" };

  const headersList = headers();
  const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;
  const userAgent = headersList.get("user-agent") || null;

  const { data, error } = await db(supabase).rpc("log_audit_event", {
    p_org_id: member.org_id,
    p_user_id: user.id,
    p_action: input.action,
    p_entity_type: input.entityType ?? null,
    p_entity_id: input.entityId ?? null,
    p_old_values: input.oldValues ?? null,
    p_new_values: input.newValues ?? null,
    p_metadata: input.metadata ?? null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data };
}

export async function listAuditLogs(limit = 100): Promise<AuditLog[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("audit_logs")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as AuditLog[];
}

export async function createSecurityEvent(input: {
  eventType: SecurityEventType;
  severity?: SecuritySeverity;
  description?: string;
  details?: Record<string, any>;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Не залоговано" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Брак організації" };

  const headersList = headers();
  const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;

  const { data, error } = await db(supabase).rpc("create_security_event", {
    p_org_id: member.org_id,
    p_user_id: user.id,
    p_event_type: input.eventType,
    p_severity: input.severity ?? "low",
    p_ip_address: ip,
    p_description: input.description ?? null,
    p_details: input.details ?? null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data };
}

export async function listSecurityEvents(resolved?: boolean): Promise<SecurityEvent[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  let query = db(supabase)
    .from("security_events")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (resolved !== undefined) query = query.eq("resolved", resolved);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as SecurityEvent[];
}

export async function resolveSecurityEvent(
  eventId: string,
  resolutionNotes: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Не залоговано" };

  const { error } = await db(supabase)
    .from("security_events")
    .update({
      resolved: true,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      resolution_notes: resolutionNotes,
    })
    .eq("id", eventId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/security");
  return { ok: true };
}

export async function listUserSessions(): Promise<UserSession[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("user_sessions")
    .select("*")
    .eq("org_id", member.org_id)
    .order("last_activity", { ascending: false });

  if (error) return [];
  return (data ?? []) as UserSession[];
}

export async function revokeSession(sessionId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("user_sessions")
    .update({
      ended_at: new Date().toISOString(),
      ended_reason: reason,
    })
    .eq("id", sessionId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/security");
  return { ok: true };
}

export async function getSecurityStats(): Promise<{
  totalAuditLogs: number;
  unresolvedEvents: number;
  criticalEvents: number;
  activeSessions: number;
}> {
  const auditLogs = await listAuditLogs(1000);
  const securityEvents = await listSecurityEvents();
  const sessions = await listUserSessions();

  return {
    totalAuditLogs: auditLogs.length,
    unresolvedEvents: securityEvents.filter((e) => !e.resolved).length,
    criticalEvents: securityEvents.filter((e) => e.severity === "critical").length,
    activeSessions: sessions.filter((s) => !s.ended_at).length,
  };
}
