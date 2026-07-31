"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type WidgetType = "kpi_card" | "chart" | "table" | "gauge" | "funnel" | "heatmap" | "treemap" | "pivot_table";
export type ReportType = "financial" | "operational" | "sales" | "project" | "resource" | "custom";
export type SourceType = "database" | "api" | "file" | "external";

export type BIDashboard = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  layout: Record<string, any>;
  is_public: boolean;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BIWidget = {
  id: string;
  dashboard_id: string;
  org_id: string;
  widget_type: WidgetType;
  title: string;
  config: Record<string, any>;
  query_config: Record<string, any>;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
};

export type BIReport = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  report_type: ReportType;
  query: string;
  parameters: Record<string, any>;
  schedule: string | null;
  last_run_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BIDataSource = {
  id: string;
  org_id: string;
  name: string;
  source_type: SourceType;
  connection_config: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function createBIDashboard(input: {
  name: string;
  description?: string;
  layout?: Record<string, any>;
  isPublic?: boolean;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("bi_dashboards").insert({
    org_id: member.org_id,
    name: input.name,
    description: input.description ?? null,
    layout: input.layout ?? {},
    is_public: input.isPublic ?? false,
    is_default: false,
    created_by: user.id,
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/business-intelligence");
  return { ok: true, id: data.id };
}

export async function listBIDashboards(): Promise<BIDashboard[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("bi_dashboards")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as BIDashboard[];
}

export async function createBIWidget(input: {
  dashboardId: string;
  widgetType: WidgetType;
  title: string;
  config: Record<string, any>;
  queryConfig: Record<string, any>;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("bi_widgets").insert({
    dashboard_id: input.dashboardId,
    org_id: member.org_id,
    widget_type: input.widgetType,
    title: input.title,
    config: input.config,
    query_config: input.queryConfig,
    position_x: input.positionX ?? 0,
    position_y: input.positionY ?? 0,
    width: input.width ?? 4,
    height: input.height ?? 3,
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/business-intelligence");
  return { ok: true, id: data.id };
}

export async function listBIWidgets(dashboardId: string): Promise<BIWidget[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("bi_widgets")
    .select("*")
    .eq("dashboard_id", dashboardId)
    .order("position_y", { ascending: true })
    .order("position_x", { ascending: true });

  if (error) return [];
  return (data ?? []) as BIWidget[];
}

export async function createBIReport(input: {
  name: string;
  description?: string;
  reportType: ReportType;
  query: string;
  parameters?: Record<string, any>;
  schedule?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("bi_reports").insert({
    org_id: member.org_id,
    name: input.name,
    description: input.description ?? null,
    report_type: input.reportType,
    query: input.query,
    parameters: input.parameters ?? {},
    schedule: input.schedule ?? null,
    created_by: user.id,
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/business-intelligence");
  return { ok: true, id: data.id };
}

export async function listBIReports(): Promise<BIReport[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("bi_reports")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as BIReport[];
}

export async function createBIDataSource(input: {
  name: string;
  sourceType: SourceType;
  connectionConfig: Record<string, any>;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("bi_data_sources").insert({
    org_id: member.org_id,
    name: input.name,
    source_type: input.sourceType,
    connection_config: input.connectionConfig,
    is_active: true,
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/business-intelligence");
  return { ok: true, id: data.id };
}

export async function listBIDataSources(): Promise<BIDataSource[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("bi_data_sources")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as BIDataSource[];
}

export async function getBIStats(): Promise<{
  totalDashboards: number;
  totalWidgets: number;
  totalReports: number;
  totalDataSources: number;
}> {
  const dashboards = await listBIDashboards();
  const reports = await listBIReports();
  const dataSources = await listBIDataSources();

  let totalWidgets = 0;
  for (const dashboard of dashboards) {
    const widgets = await listBIWidgets(dashboard.id);
    totalWidgets += widgets.length;
  }

  return {
    totalDashboards: dashboards.length,
    totalWidgets,
    totalReports: reports.length,
    totalDataSources: dataSources.length,
  };
}
