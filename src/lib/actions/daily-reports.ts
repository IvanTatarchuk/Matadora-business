"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type WeatherCondition =
  | "sunny" | "cloudy" | "overcast" | "rain" | "heavy_rain"
  | "snow" | "fog" | "windy" | "storm";

export type DailyReportStatus = "draft" | "submitted" | "approved";

export type DailyReport = {
  id: string;
  project_id: string;
  org_id: string;
  created_by: string | null;
  report_date: string;
  weather_condition: WeatherCondition | null;
  temperature_c: number | null;
  weather_notes: string | null;
  work_performed: string | null;
  work_delayed: boolean;
  delay_reason: string | null;
  delay_hours: number;
  visitors: Visitor[];
  inspections_on_site: SiteInspectionEntry[];
  materials_delivered: string | null;
  equipment_notes: string | null;
  safety_incidents: number;
  safety_notes: string | null;
  status: DailyReportStatus;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  workers_count?: number;
  total_hours?: number;
};

export type Visitor = {
  name: string;
  company: string;
  purpose: string;
  time?: string;
};

export type SiteInspectionEntry = {
  type: string;
  inspector: string;
  result: "passed" | "failed" | "pending";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listDailyReports(projectId: string, limit = 30): Promise<DailyReport[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("daily_site_reports")
    .select("*")
    .eq("project_id", projectId)
    .order("report_date", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    visitors: Array.isArray(r.visitors) ? r.visitors : [],
    inspections_on_site: Array.isArray(r.inspections) ? r.inspections : [],
  })) as DailyReport[];
}

export async function getDailyReport(projectId: string, date: string): Promise<DailyReport | null> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("daily_site_reports").select("*")
    .eq("project_id", projectId).eq("report_date", date).single();
  if (error || !data) return null;
  return {
    ...data,
    visitors: Array.isArray(data.visitors) ? data.visitors : [],
    inspections_on_site: Array.isArray(data.inspections) ? data.inspections : [],
  } as DailyReport;
}

export async function upsertDailyReport(input: {
  projectId: string;
  reportDate: string;
  weatherCondition?: WeatherCondition;
  temperatureC?: number;
  weatherNotes?: string;
  workPerformed?: string;
  workDelayed?: boolean;
  delayReason?: string;
  delayHours?: number;
  visitors?: Visitor[];
  inspectionsOnSite?: SiteInspectionEntry[];
  materialsDelivered?: string;
  equipmentNotes?: string;
  safetyIncidents?: number;
  safetyNotes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const payload = {
    project_id: input.projectId, org_id: member.org_id, created_by: user.id,
    report_date: input.reportDate,
    weather_condition: input.weatherCondition ?? null,
    temperature_c: input.temperatureC ?? null,
    weather_notes: input.weatherNotes ?? null,
    work_performed: input.workPerformed ?? null,
    work_delayed: input.workDelayed ?? false,
    delay_reason: input.delayReason ?? null,
    delay_hours: input.delayHours ?? 0,
    visitors: input.visitors ?? [],
    inspections: input.inspectionsOnSite ?? [],
    materials_delivered: input.materialsDelivered ?? null,
    equipment_notes: input.equipmentNotes ?? null,
    safety_incidents: input.safetyIncidents ?? 0,
    safety_notes: input.safetyNotes ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db(supabase)
    .from("daily_site_reports")
    .upsert(payload, { onConflict: "project_id,report_date" })
    .select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/raporty`);
  return { ok: true, id: data.id };
}

export async function submitDailyReport(id: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("daily_site_reports").update({
    status: "submitted", submitted_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/raporty`);
  return { ok: true };
}

export async function approveDailyReport(id: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("daily_site_reports").update({
    status: "approved", approved_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/raporty`);
  return { ok: true };
}
