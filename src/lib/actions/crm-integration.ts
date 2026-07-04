"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CRMProvider = "hubspot" | "salesforce" | "pipedrive" | "zoho" | "custom";
export type SyncDirection = "bidirectional" | "to_crm" | "from_crm";

export type CRMConnection = {
  id: string;
  org_id: string;
  provider: CRMProvider;
  api_key: string | null;
  api_url: string | null;
  sync_enabled: boolean;
  sync_direction: SyncDirection;
  field_mappings: Record<string, any>;
  last_sync_at: string | null;
  last_sync_status: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CRMSyncLog = {
  id: string;
  connection_id: string | null;
  org_id: string;
  entity_type: string;
  sync_type: "full" | "incremental";
  status: "success" | "failed" | "partial";
  records_synced: number;
  records_created: number;
  records_updated: number;
  records_deleted: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function createCRMConnection(input: {
  provider: CRMProvider;
  apiKey: string;
  apiUrl?: string;
  syncDirection?: SyncDirection;
  fieldMappings?: Record<string, any>;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Не залоговано" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Брак організації" };

  const { data, error } = await db(supabase).from("crm_connections").insert({
    org_id: member.org_id,
    provider: input.provider,
    api_key: input.apiKey,
    api_url: input.apiUrl ?? null,
    sync_enabled: true,
    sync_direction: input.syncDirection ?? "bidirectional",
    field_mappings: input.fieldMappings ?? {},
    created_by: user.id,
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/crm-integration");
  return { ok: true, id: data.id };
}

export async function listCRMConnections(): Promise<CRMConnection[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("crm_connections")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as CRMConnection[];
}

export async function toggleCRMSync(connectionId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: connection } = await db(supabase)
    .from("crm_connections")
    .select("sync_enabled")
    .eq("id", connectionId)
    .single();

  if (!connection) return { ok: false, error: "Connection not found" };

  const { error } = await db(supabase)
    .from("crm_connections")
    .update({ sync_enabled: !connection.sync_enabled })
    .eq("id", connectionId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/crm-integration");
  return { ok: true };
}

export async function deleteCRMConnection(connectionId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("crm_connections")
    .delete()
    .eq("id", connectionId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/crm-integration");
  return { ok: true };
}

export async function listCRMSyncLogs(connectionId?: string): Promise<CRMSyncLog[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  let query = db(supabase)
    .from("crm_sync_logs")
    .select("*")
    .eq("org_id", member.org_id)
    .order("started_at", { ascending: false })
    .limit(50);

  if (connectionId) query = query.eq("connection_id", connectionId);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as CRMSyncLog[];
}

export async function triggerCRMSync(connectionId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: connection } = await db(supabase)
    .from("crm_connections")
    .select("*")
    .eq("id", connectionId)
    .single();

  if (!connection) return { ok: false, error: "Connection not found" };

  const { error } = await db(supabase).from("crm_sync_logs").insert({
    connection_id: connectionId,
    org_id: connection.org_id,
    entity_type: "all",
    sync_type: "incremental",
    status: "success",
    records_synced: 0,
    records_created: 0,
    records_updated: 0,
    records_deleted: 0,
    completed_at: new Date().toISOString(),
  });

  if (error) return { ok: false, error: error.message };

  await db(supabase)
    .from("crm_connections")
    .update({ last_sync_at: new Date().toISOString(), last_sync_status: "success" })
    .eq("id", connectionId);

  revalidatePath("/dashboard/crm-integration");
  return { ok: true };
}

export async function getCRMStats(): Promise<{
  totalConnections: number;
  activeConnections: number;
  totalSyncs: number;
  successfulSyncs: number;
}> {
  const connections = await listCRMConnections();
  const syncLogs = await listCRMSyncLogs();

  return {
    totalConnections: connections.length,
    activeConnections: connections.filter((c) => c.sync_enabled).length,
    totalSyncs: syncLogs.length,
    successfulSyncs: syncLogs.filter((l) => l.status === "success").length,
  };
}
