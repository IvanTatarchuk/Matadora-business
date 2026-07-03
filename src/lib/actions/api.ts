"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

export type ApiScope = "projects:read" | "projects:write" | "offers:read" | "offers:write" | "inventory:read" | "inventory:write" | "reports:read";

export type ApiKey = {
  id: string;
  org_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: ApiScope[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  revoked_at: string | null;
};

export type ApiWebhook = {
  id: string;
  org_id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  last_triggered_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  failure_count: number;
  created_at: string;
  updated_at: string;
};

export type ApiLog = {
  id: string;
  api_key_id: string | null;
  org_id: string;
  method: string;
  path: string;
  status_code: number | null;
  response_time_ms: number | null;
  ip_address: string | null;
  user_agent: string | null;
  request_body: Record<string, any> | null;
  response_body: Record<string, any> | null;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `bm_${randomBytes(32).toString('hex')}`;
  const hash = Buffer.from(key).toString('base64');
  const prefix = key.slice(0, 8);
  return { key, hash, prefix };
}

export async function createApiKey(input: {
  name: string;
  scopes: ApiScope[];
  expiresAt?: string;
}): Promise<{ ok: boolean; key?: string; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Не залоговано" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Брак організації" };

  const { key, hash, prefix } = generateApiKey();

  const { data, error } = await db(supabase).from("api_keys").insert({
    org_id: member.org_id,
    name: input.name,
    key_hash: hash,
    key_prefix: prefix,
    scopes: input.scopes,
    is_active: true,
    expires_at: input.expiresAt ?? null,
    created_by: user.id,
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/api");
  return { ok: true, key, id: data.id };
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("api_keys")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as ApiKey[];
}

export async function revokeApiKey(keyId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("api_keys")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("id", keyId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/api");
  return { ok: true };
}

export async function createApiWebhook(input: {
  name: string;
  url: string;
  events: string[];
}): Promise<{ ok: boolean; secret?: string; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Не залоговано" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Брак організації" };

  const secret = randomBytes(32).toString('hex');

  const { data, error } = await db(supabase).from("api_webhooks").insert({
    org_id: member.org_id,
    name: input.name,
    url: input.url,
    events: input.events,
    secret,
    is_active: true,
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/api");
  return { ok: true, secret, id: data.id };
}

export async function listApiWebhooks(): Promise<ApiWebhook[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("api_webhooks")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as ApiWebhook[];
}

export async function toggleApiWebhook(webhookId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: webhook } = await db(supabase)
    .from("api_webhooks")
    .select("is_active")
    .eq("id", webhookId)
    .single();

  if (!webhook) return { ok: false, error: "Webhook not found" };

  const { error } = await db(supabase)
    .from("api_webhooks")
    .update({ is_active: !webhook.is_active })
    .eq("id", webhookId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/api");
  return { ok: true };
}

export async function listApiLogs(limit = 100): Promise<ApiLog[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("api_logs")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as ApiLog[];
}

export async function getApiStats(): Promise<{
  totalKeys: number;
  activeKeys: number;
  totalWebhooks: number;
  activeWebhooks: number;
  totalRequests: number;
  avgResponseTime: number;
}> {
  const keys = await listApiKeys();
  const webhooks = await listApiWebhooks();
  const logs = await listApiLogs(1000);

  const totalRequests = logs.length;
  const avgResponseTime = totalRequests > 0
    ? logs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / totalRequests
    : 0;

  return {
    totalKeys: keys.length,
    activeKeys: keys.filter((k) => k.is_active).length,
    totalWebhooks: webhooks.length,
    activeWebhooks: webhooks.filter((w) => w.is_active).length,
    totalRequests,
    avgResponseTime,
  };
}
