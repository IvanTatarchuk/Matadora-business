"use server";

import { createClient } from "@/lib/supabase/server";

export type ReportType = 
  | "project_summary" 
  | "financial_report" 
  | "labor_report" 
  | "material_report" 
  | "attendance_report" 
  | "inventory_report" 
  | "progress_report";

export type ReportFormat = "json" | "csv" | "pdf";

export type ReportConfig = {
  type: ReportType;
  projectId?: string;
  orgId?: string;
  startDate?: string;
  endDate?: string;
  format?: ReportFormat;
};

export type ReportData = {
  type: ReportType;
  title: string;
  generatedAt: string;
  data: Record<string, any>;
  summary: Record<string, any>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function generateReport(config: ReportConfig): Promise<ReportData> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) throw new Error("No organization");

  const orgId = config.orgId || member.org_id;

  switch (config.type) {
    case "project_summary":
      return await generateProjectSummaryReport(orgId, config.projectId);
    case "financial_report":
      return await generateFinancialReport(orgId, config.projectId, config.startDate, config.endDate);
    case "labor_report":
      return await generateLaborReport(orgId, config.projectId, config.startDate, config.endDate);
    case "material_report":
      return await generateMaterialReport(orgId, config.projectId, config.startDate, config.endDate);
    case "attendance_report":
      return await generateAttendanceReport(orgId, config.projectId, config.startDate, config.endDate);
    case "inventory_report":
      return await generateInventoryReport(orgId);
    case "progress_report":
      return await generateProgressReport(orgId, config.projectId);
    default:
      throw new Error("Unknown report type");
  }
}

async function generateProjectSummaryReport(orgId: string, projectId?: string): Promise<ReportData> {
  const supabase = createClient();
  
  let query = db(supabase).from("projects").select("*").eq("org_id", orgId);
  if (projectId) query = query.eq("id", projectId);
  const { data: projects } = await query;

  const summary = {
    totalProjects: projects?.length || 0,
    activeProjects: projects?.filter((p: any) => p.status === "active" || p.status === "in_progress").length || 0,
    totalBudget: projects?.reduce((sum: number, p: any) => sum + Number(p.budget_max || 0), 0) || 0,
  };

  return {
    type: "project_summary",
    title: "Podsumowanie projektów",
    generatedAt: new Date().toISOString(),
    data: { projects },
    summary,
  };
}

async function generateFinancialReport(orgId: string, projectId?: string, startDate?: string, endDate?: string): Promise<ReportData> {
  const supabase = createClient();
  
  const { data: expenses } = await db(supabase)
    .from("project_expenses")
    .select("*, project_id")
    .eq("org_id", orgId)
    .gte("expense_date", startDate || "2000-01-01")
    .lte("expense_date", endDate || "2099-12-31");

  const { data: timeEntries } = await db(supabase)
    .from("time_entries")
    .select("*, project_id")
    .eq("org_id", orgId)
    .gte("entry_date", startDate || "2000-01-01")
    .lte("entry_date", endDate || "2099-12-31");

  const totalExpenses = expenses?.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0) || 0;
  const totalHours = timeEntries?.reduce((sum: number, t: any) => sum + Number(t.hours || 0), 0) || 0;

  const summary = {
    totalExpenses,
    totalHours,
    expenseCount: expenses?.length || 0,
    timeEntryCount: timeEntries?.length || 0,
  };

  return {
    type: "financial_report",
    title: "Raport finansowy",
    generatedAt: new Date().toISOString(),
    data: { expenses, timeEntries },
    summary,
  };
}

async function generateLaborReport(orgId: string, projectId?: string, startDate?: string, endDate?: string): Promise<ReportData> {
  const supabase = createClient();
  
  const { data: attendance } = await db(supabase)
    .from("attendance_records")
    .select("*, worker:worker_id(full_name, specialty, hourly_rate)")
    .eq("org_id", orgId)
    .gte("work_date", startDate || "2000-01-01")
    .lte("work_date", endDate || "2099-12-31");

  const { data: timeEntries } = await db(supabase)
    .from("time_entries")
    .select("*, worker:worker_id(full_name, specialty, hourly_rate)")
    .eq("org_id", orgId)
    .gte("entry_date", startDate || "2000-01-01")
    .lte("entry_date", endDate || "2099-12-31");

  const totalHours = attendance?.reduce((sum: number, a: any) => sum + Number(a.hours_worked || 0), 0) || 0;
  const totalCost = attendance?.reduce((sum: number, a: any) => sum + Number(a.labor_cost || 0), 0) || 0;

  const summary = {
    totalHours,
    totalCost,
    attendanceCount: attendance?.length || 0,
    timeEntryCount: timeEntries?.length || 0,
  };

  return {
    type: "labor_report",
    title: "Raport pracy",
    generatedAt: new Date().toISOString(),
    data: { attendance, timeEntries },
    summary,
  };
}

async function generateMaterialReport(orgId: string, projectId?: string, startDate?: string, endDate?: string): Promise<ReportData> {
  const supabase = createClient();
  
  const { data: inventoryTransactions } = await db(supabase)
    .from("inventory_transactions")
    .select("*, item:inventory_id(name, sku, unit)")
    .eq("org_id", orgId)
    .gte("created_at", startDate || "2000-01-01")
    .lte("created_at", endDate || "2099-12-31");

  const { data: inventoryItems } = await db(supabase)
    .from("inventory_items")
    .select("*")
    .eq("org_id", orgId);

  const totalValue = inventoryItems?.reduce((sum: number, i: any) => sum + Number(i.total_value || 0), 0) || 0;
  const transactionCount = inventoryTransactions?.length || 0;

  const summary = {
    totalValue,
    transactionCount,
    itemCount: inventoryItems?.length || 0,
  };

  return {
    type: "material_report",
    title: "Raport materiałów",
    generatedAt: new Date().toISOString(),
    data: { inventoryTransactions, inventoryItems },
    summary,
  };
}

async function generateAttendanceReport(orgId: string, projectId?: string, startDate?: string, endDate?: string): Promise<ReportData> {
  const supabase = createClient();
  
  const { data: attendance } = await db(supabase)
    .from("attendance_records")
    .select("*, worker:worker_id(full_name, specialty)")
    .eq("org_id", orgId)
    .gte("work_date", startDate || "2000-01-01")
    .lte("work_date", endDate || "2099-12-31");

  const byStatus = attendance?.reduce((acc: Record<string, number>, a: any) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {}) || {};

  const summary = {
    totalRecords: attendance?.length || 0,
    byStatus,
  };

  return {
    type: "attendance_report",
    title: "Raport obecności",
    generatedAt: new Date().toISOString(),
    data: { attendance },
    summary,
  };
}

async function generateInventoryReport(orgId: string): Promise<ReportData> {
  const supabase = createClient();
  
  const { data: items } = await db(supabase)
    .from("inventory_items")
    .select("*")
    .eq("org_id", orgId);

  const totalValue = items?.reduce((sum: number, i: any) => sum + Number(i.total_value || 0), 0) || 0;
  const lowStockCount = items?.filter((i: any) => i.current_stock <= i.min_stock_level).length || 0;

  const summary = {
    totalValue,
    itemCount: items?.length || 0,
    lowStockCount,
  };

  return {
    type: "inventory_report",
    title: "Raport stanu magazynu",
    generatedAt: new Date().toISOString(),
    data: { items },
    summary,
  };
}

async function generateProgressReport(orgId: string, projectId?: string): Promise<ReportData> {
  const supabase = createClient();
  
  let projectQuery = db(supabase).from("projects").select("*").eq("org_id", orgId);
  if (projectId) projectQuery = projectQuery.eq("id", projectId);
  const { data: projects } = await projectQuery;

  const projectIds = projects?.map((p: any) => p.id) || [];
  
  const { data: tasks } = await db(supabase)
    .from("execution_tasks")
    .select("*")
    .in("project_id", projectIds);

  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter((t: any) => t.status === "completed").length || 0;
  const avgProgress = tasks?.reduce((sum: number, t: any) => sum + Number(t.progress || 0), 0) / (totalTasks || 1) || 0;

  const summary = {
    totalTasks,
    completedTasks,
    completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    avgProgress,
  };

  return {
    type: "progress_report",
    title: "Raport postępu",
    generatedAt: new Date().toISOString(),
    data: { projects, tasks },
    summary,
  };
}

export async function exportToCSV(data: any[], filename: string): Promise<string> {
  if (data.length === 0) return "";
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(";"),
    ...data.map((row) => headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      if (typeof val === "number") return val.toString();
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(";")),
  ];
  
  return "\uFEFF" + csvRows.join("\n"); // BOM for Excel UTF-8
}

export async function exportReportAsCSV(config: ReportConfig): Promise<{ ok: boolean; csv?: string; filename?: string; error?: string }> {
  try {
    const report = await generateReport({ ...config, format: "csv" });
    const csv = await exportToCSV(Array.isArray(report.data) ? report.data : [report.data], report.title);
    const filename = `${report.title}_${new Date().toISOString().slice(0, 10)}.csv`;
    return { ok: true, csv, filename };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Export failed" };
  }
}
