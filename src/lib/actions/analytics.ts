"use server";

import { createClient } from "@/lib/supabase/server";

export type ProjectAnalytics = {
  project_id: string;
  project_name: string;
  status: string;
  budget: number;
  budget_spent: number;
  budget_pct: number;
  progress_pct: number;
  tasks_total: number;
  tasks_done: number;
  workers_today: number;
  open_rfis: number;
  open_punch: number;
  open_risks: number;
  days_remaining: number | null;
  is_delayed: boolean;
  margin_pct: number | null;
  margin_status: "on-track" | "watch" | "at-risk" | null;
};

export type OrgAnalytics = {
  projects_active: number;
  projects_total: number;
  total_budget: number;
  total_spent: number;
  total_budget_pct: number;
  workers_count: number;
  revenue_ytd: number;
  open_leads_crm: number;
  projects: ProjectAnalytics[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function getOrgAnalytics(): Promise<OrgAnalytics | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return null;
  const orgId = member.org_id;

  const [projectsRes, workersRes, invoicesRes] = await Promise.all([
    db(supabase).from("projects").select(
      "id, name, status, budget, end_date, created_at"
    ).eq("org_id", orgId),
    db(supabase).from("workers").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    db(supabase).from("invoices").select("amount, status").eq("org_id", orgId).eq("status", "paid")
      .gte("created_at", new Date(new Date().getFullYear(), 0, 1).toISOString()),
  ]);

  const projects: Record<string, unknown>[] = projectsRes.data ?? [];
  const activeProjects = projects.filter((p) => ["active", "in_progress"].includes(p.status as string));

  const projectAnalytics: ProjectAnalytics[] = await Promise.all(
    projects.map(async (p) => {
      const pid = p.id as string;

      const [tasksRes, financeRes, rfisRes, punchRes, risksRes, offerRes] = await Promise.all([
        db(supabase).from("execution_tasks").select("id, status, progress").eq("project_id", pid),
        db(supabase).from("project_costs").select("amount").eq("project_id", pid),
        db(supabase).from("rfis").select("id", { count: "exact", head: true }).eq("project_id", pid).in("status", ["open","answered"]),
        db(supabase).from("punch_items").select("id", { count: "exact", head: true }).eq("project_id", pid).in("status", ["open","in_progress"]),
        db(supabase).from("project_risks").select("id", { count: "exact", head: true }).eq("project_id", pid).eq("status", "open"),
        db(supabase).from("offers").select("total_net").eq("project_id", pid).eq("status", "accepted")
          .order("accepted_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      const tasks: Record<string, unknown>[] = tasksRes.data ?? [];
      const costs: Record<string, unknown>[] = financeRes.data ?? [];
      const tasksDone = tasks.filter((t) => t.status === "completed").length;
      const avgProgress = tasks.length > 0 ? tasks.reduce((s, t) => s + Number(t.progress ?? 0), 0) / tasks.length : 0;
      const spent = costs.reduce((s, c) => s + Number(c.amount ?? 0), 0);
      const budget = Number(p.budget ?? 0);
      const endDate = p.end_date ? new Date(p.end_date as string) : null;
      const daysRemaining = endDate ? Math.floor((endDate.getTime() - Date.now()) / 86400000) : null;

      const revenue = offerRes.data?.total_net != null ? Number(offerRes.data.total_net) : null;
      const marginPct = revenue && revenue > 0 ? Math.round(((revenue - spent) / revenue) * 100) : null;
      const marginStatus: ProjectAnalytics["margin_status"] =
        marginPct === null ? null : marginPct >= 15 ? "on-track" : marginPct >= 0 ? "watch" : "at-risk";

      return {
        project_id: pid,
        project_name: p.name as string,
        status: p.status as string,
        budget,
        budget_spent: spent,
        budget_pct: budget > 0 ? Math.round((spent / budget) * 100) : 0,
        progress_pct: Math.round(avgProgress),
        tasks_total: tasks.length,
        tasks_done: tasksDone,
        workers_today: 0,
        open_rfis: rfisRes.count ?? 0,
        open_punch: punchRes.count ?? 0,
        open_risks: risksRes.count ?? 0,
        days_remaining: daysRemaining,
        is_delayed: daysRemaining !== null && daysRemaining < 0 && p.status !== "completed",
        margin_pct: marginPct,
        margin_status: marginStatus,
      };
    })
  );

  const totalBudget = projectAnalytics.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projectAnalytics.reduce((s, p) => s + p.budget_spent, 0);
  const revenue = (invoicesRes.data ?? []).reduce((s: number, i: Record<string, unknown>) => s + Number(i.amount ?? 0), 0);

  return {
    projects_active: activeProjects.length,
    projects_total: projects.length,
    total_budget: totalBudget,
    total_spent: totalSpent,
    total_budget_pct: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
    workers_count: workersRes.count ?? 0,
    revenue_ytd: revenue,
    open_leads_crm: 0,
    projects: projectAnalytics,
  };
}

export async function getProjectTimeline(projectId: string): Promise<{
  month: string; planned: number; actual: number;
}[]> {
  const supabase = createClient();
  const { data } = await db(supabase)
    .from("project_costs")
    .select("amount, created_at")
    .eq("project_id", projectId)
    .order("created_at");
  if (!data) return [];
  const byMonth = new Map<string, number>();
  for (const c of data) {
    const m = (c.created_at as string).slice(0, 7);
    byMonth.set(m, (byMonth.get(m) ?? 0) + Number(c.amount));
  }
  return Array.from(byMonth.entries()).map(([month, actual]) => ({ month, actual, planned: 0 }));
}
