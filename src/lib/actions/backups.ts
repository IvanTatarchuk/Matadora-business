"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type BackupType = "full" | "incremental" | "differential";
export type BackupStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type BackupJob = {
  id: string;
  org_id: string;
  name: string;
  type: BackupType;
  status: BackupStatus;
  tables: string[];
  include_storage: boolean;
  file_path: string | null;
  file_size_bytes: number | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
};

export type BackupSchedule = {
  id: string;
  org_id: string;
  name: string;
  type: BackupType;
  schedule: string;
  timezone: string;
  tables: string[];
  include_storage: boolean;
  retention_days: number;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RestoreJob = {
  id: string;
  org_id: string;
  backup_job_id: string | null;
  status: BackupStatus;
  target_tables: string[];
  restore_storage: boolean;
  preview_only: boolean;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function createBackupJob(input: {
  name: string;
  type: BackupType;
  tables?: string[];
  includeStorage?: boolean;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("backup_jobs").insert({
    org_id: member.org_id,
    name: input.name,
    type: input.type,
    tables: input.tables ?? [],
    include_storage: input.includeStorage ?? true,
    status: "pending",
    created_by: user.id,
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/backups");
  return { ok: true, id: data.id };
}

export async function listBackupJobs(): Promise<BackupJob[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("backup_jobs")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as BackupJob[];
}

export async function createBackupSchedule(input: {
  name: string;
  type: BackupType;
  schedule: string;
  timezone?: string;
  tables?: string[];
  includeStorage?: boolean;
  retentionDays?: number;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("backup_schedules").insert({
    org_id: member.org_id,
    name: input.name,
    type: input.type,
    schedule: input.schedule,
    timezone: input.timezone ?? "UTC",
    tables: input.tables ?? [],
    include_storage: input.includeStorage ?? true,
    retention_days: input.retentionDays ?? 30,
    is_active: true,
    created_by: user.id,
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/backups");
  return { ok: true, id: data.id };
}

export async function listBackupSchedules(): Promise<BackupSchedule[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("backup_schedules")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as BackupSchedule[];
}

export async function toggleBackupSchedule(scheduleId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  
  const { data: schedule } = await db(supabase)
    .from("backup_schedules")
    .select("is_active")
    .eq("id", scheduleId)
    .single();

  if (!schedule) return { ok: false, error: "Schedule not found" };

  const { error } = await db(supabase)
    .from("backup_schedules")
    .update({ is_active: !schedule.is_active })
    .eq("id", scheduleId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/backups");
  return { ok: true };
}

export async function createRestoreJob(input: {
  backupJobId: string;
  targetTables?: string[];
  restoreStorage?: boolean;
  previewOnly?: boolean;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("restore_jobs").insert({
    org_id: member.org_id,
    backup_job_id: input.backupJobId,
    target_tables: input.targetTables ?? [],
    restore_storage: input.restoreStorage ?? true,
    preview_only: input.previewOnly ?? false,
    status: "pending",
    created_by: user.id,
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/backups");
  return { ok: true, id: data.id };
}

export async function listRestoreJobs(): Promise<RestoreJob[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("restore_jobs")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as RestoreJob[];
}

export async function getBackupStats(): Promise<{
  totalBackups: number;
  successfulBackups: number;
  failedBackups: number;
  activeSchedules: number;
  totalStorageUsed: number;
}> {
  const backups = await listBackupJobs();
  const schedules = await listBackupSchedules();

  const totalStorageUsed = backups
    .filter((b) => b.file_size_bytes)
    .reduce((sum, b) => sum + (b.file_size_bytes || 0), 0);

  return {
    totalBackups: backups.length,
    successfulBackups: backups.filter((b) => b.status === "completed").length,
    failedBackups: backups.filter((b) => b.status === "failed").length,
    activeSchedules: schedules.filter((s) => s.is_active).length,
    totalStorageUsed,
  };
}
