"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type AttendanceStatus =
  | "present" | "absent" | "late" | "half_day"
  | "sick_leave" | "annual_leave" | "other_leave"
  | "overtime" | "business_trip";

export type AttendanceRecord = {
  id: string;
  project_id: string;
  org_id: string;
  worker_id: string;
  recorded_by: string | null;
  work_date: string;
  status: AttendanceStatus;
  time_start: string | null;
  time_end: string | null;
  hours_worked: number;
  overtime_hours: number;
  break_minutes: number;
  location_note: string | null;
  hourly_rate_snapshot: number | null;
  labor_cost: number;
  overtime_cost: number;
  notes: string | null;
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  worker_name?: string | null;
  worker_specialty?: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: any) => supabase as any;

export async function listAttendanceByDate(
  projectId: string,
  workDate: string
): Promise<AttendanceRecord[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("attendance_records")
    .select("*, worker:worker_id(full_name, specialty)")
    .eq("project_id", projectId)
    .eq("work_date", workDate)
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []).map((d: Record<string, unknown>) => ({
    ...d,
    worker_name: (d.worker as { full_name?: string } | null)?.full_name ?? null,
    worker_specialty: (d.worker as { specialty?: string } | null)?.specialty ?? null,
  })) as AttendanceRecord[];
}

export async function listAttendanceSummaryByMonth(
  projectId: string,
  year: number,
  month: number
): Promise<{ date: string; count: number; total_hours: number; total_cost: number }[]> {
  const supabase = createClient();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-31`;

  const { data, error } = await db(supabase)
    .from("attendance_records")
    .select("work_date, hours_worked, labor_cost, overtime_cost")
    .eq("project_id", projectId)
    .gte("work_date", from)
    .lte("work_date", to);

  if (error) return [];

  const byDate = new Map<string, { count: number; hours: number; cost: number }>();
  for (const r of (data ?? [])) {
    const existing = byDate.get(r.work_date) ?? { count: 0, hours: 0, cost: 0 };
    byDate.set(r.work_date, {
      count: existing.count + 1,
      hours: existing.hours + Number(r.hours_worked),
      cost: existing.cost + Number(r.labor_cost) + Number(r.overtime_cost),
    });
  }

  return Array.from(byDate.entries())
    .map(([date, v]) => ({ date, count: v.count, total_hours: v.hours, total_cost: v.cost }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function listAttendanceByWorker(
  projectId: string,
  workerId: string,
  from?: string,
  to?: string
): Promise<AttendanceRecord[]> {
  const supabase = createClient();
  let query = db(supabase)
    .from("attendance_records")
    .select("*")
    .eq("project_id", projectId)
    .eq("worker_id", workerId)
    .order("work_date", { ascending: false });

  if (from) query = query.gte("work_date", from);
  if (to) query = query.lte("work_date", to);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as AttendanceRecord[];
}

export async function upsertAttendanceRecord(input: {
  projectId: string;
  workerId: string;
  workDate: string;
  status: AttendanceStatus;
  hoursWorked?: number;
  overtimeHours?: number;
  breakMinutes?: number;
  timeStart?: string;
  timeEnd?: string;
  locationNote?: string;
  notes?: string;
  gpsLat?: number;
  gpsLon?: number;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  // Get worker's current hourly rate for snapshot
  const { data: worker } = await supabase
    .from("workers")
    .select("hourly_rate")
    .eq("id", input.workerId)
    .single();

  const hoursWorked = input.hoursWorked ?? (input.status === "present" ? 8 : input.status === "half_day" ? 4 : 0);
  const overtimeHours = input.overtimeHours ?? (input.status === "overtime" ? 2 : 0);

  const { data, error } = await db(supabase)
    .from("attendance_records")
    .upsert({
      project_id: input.projectId,
      org_id: member.org_id,
      worker_id: input.workerId,
      recorded_by: user.id,
      work_date: input.workDate,
      status: input.status,
      hours_worked: hoursWorked,
      overtime_hours: overtimeHours,
      break_minutes: input.breakMinutes ?? 0,
      time_start: input.timeStart ?? null,
      time_end: input.timeEnd ?? null,
      location_note: input.locationNote ?? null,
      gps_lat: input.gpsLat ?? null,
      gps_lon: input.gpsLon ?? null,
      hourly_rate_snapshot: worker?.hourly_rate ?? null,
      notes: input.notes ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "project_id,worker_id,work_date" })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/obecnosc`);
  return { ok: true, id: data?.id };
}

export async function approveAttendanceDay(
  projectId: string,
  workDate: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const { error } = await db(supabase)
    .from("attendance_records")
    .update({ approved: true, approved_by: user.id, approved_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("work_date", workDate);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/obecnosc`);
  return { ok: true };
}

export async function getAttendanceMonthlySummary(projectId: string, year: number, month: number) {
  const supabase = createClient();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const { data, error } = await db(supabase)
    .from("attendance_records")
    .select("worker_id, hours_worked, overtime_hours, labor_cost, overtime_cost, status, work_date, worker:worker_id(full_name, specialty, hourly_rate)")
    .eq("project_id", projectId)
    .gte("work_date", from)
    .lte("work_date", to);

  if (error) return { workers: [], totalHours: 0, totalCost: 0, daysWorked: 0 };

  const records = data ?? [];
  const totalHours = records.reduce((s: number, r: { hours_worked: number }) => s + Number(r.hours_worked), 0);
  const totalCost = records.reduce((s: number, r: { labor_cost: number; overtime_cost: number }) =>
    s + Number(r.labor_cost) + Number(r.overtime_cost), 0);
  const daysWorked = new Set(records.map((r: { work_date: string }) => r.work_date)).size;

  // Per-worker summary
  const workerMap = new Map<string, {
    worker_id: string; name: string; specialty: string | null;
    hours: number; cost: number; days: number; statusCounts: Record<string, number>
  }>();

  for (const r of records) {
    const wid = r.worker_id as string;
    const existing = workerMap.get(wid) ?? {
      worker_id: wid,
      name: (r.worker as { full_name?: string })?.full_name ?? wid,
      specialty: (r.worker as { specialty?: string })?.specialty ?? null,
      hours: 0, cost: 0, days: 0, statusCounts: {},
    };
    existing.hours += Number(r.hours_worked) + Number(r.overtime_hours);
    existing.cost += Number(r.labor_cost) + Number(r.overtime_cost);
    existing.days += 1;
    existing.statusCounts[r.status as string] = (existing.statusCounts[r.status as string] ?? 0) + 1;
    workerMap.set(wid, existing);
  }

  return {
    workers: Array.from(workerMap.values()),
    totalHours,
    totalCost,
    daysWorked,
  };
}

export async function exportAttendanceCSV(projectId: string, from: string, to: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("attendance_records")
    .select("work_date, status, hours_worked, overtime_hours, labor_cost, overtime_cost, notes, worker:worker_id(full_name, specialty)")
    .eq("project_id", projectId)
    .gte("work_date", from)
    .lte("work_date", to)
    .order("work_date", { ascending: true });

  if (error || !data) return "";

  const STATUS_PL: Record<string, string> = {
    present: "Obecny", absent: "Nieobecny", late: "Spóźniony",
    half_day: "Pół dnia", sick_leave: "L4", annual_leave: "Urlop",
    other_leave: "Inne", overtime: "Nadgodziny", business_trip: "Delegacja",
  };

  const rows = [
    ["Data", "Imię i nazwisko", "Specjalizacja", "Status", "Godziny", "Nadgodziny", "Koszt (PLN)", "Uwagi"].join(";"),
    ...data.map((r: Record<string, unknown>) => [
      r.work_date,
      (r.worker as { full_name?: string })?.full_name ?? "",
      (r.worker as { specialty?: string })?.specialty ?? "",
      STATUS_PL[r.status as string] ?? r.status,
      r.hours_worked,
      r.overtime_hours,
      (Number(r.labor_cost) + Number(r.overtime_cost)).toFixed(2),
      (r.notes ?? ""),
    ].join(";")),
  ];

  return "\uFEFF" + rows.join("\n"); // BOM for Excel UTF-8
}
