"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Worker, Crew } from "@/types/database";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const WORKERS_PATH = "/dashboard/workers";
const CREWS_PATH = "/dashboard/crews";

// ----------------------------------------------------------------------------
// Workers
// ----------------------------------------------------------------------------
export async function listWorkers(orgId: string): Promise<Worker[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("workers")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function createWorker(input: {
  orgId: string;
  fullName: string;
  specialty?: string;
  hourlyRate?: number | null;
  phone?: string;
  email?: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  if (!input.fullName.trim()) return { ok: false, error: "Name is required" };
  const { data, error } = await supabase
    .from("workers")
    .insert({
      org_id: input.orgId,
      full_name: input.fullName.trim(),
      specialty: input.specialty?.trim() || null,
      hourly_rate: input.hourlyRate ?? null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(WORKERS_PATH);
  return { ok: true, id: data.id };
}

export async function updateWorker(
  id: string,
  patch: {
    full_name?: string;
    specialty?: string | null;
    hourly_rate?: number | null;
    phone?: string | null;
    email?: string | null;
    is_active?: boolean;
  }
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("workers").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(WORKERS_PATH);
  return { ok: true };
}

export async function deleteWorker(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("workers").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(WORKERS_PATH);
  return { ok: true };
}

// ----------------------------------------------------------------------------
// Crews
// ----------------------------------------------------------------------------
export interface CrewWithMembers extends Crew {
  memberIds: string[];
}

export async function listCrews(orgId: string): Promise<CrewWithMembers[]> {
  const supabase = createClient();
  const { data: crews } = await supabase
    .from("crews")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (!crews || crews.length === 0) return [];

  const { data: members } = await supabase
    .from("crew_members")
    .select("crew_id, worker_id")
    .in(
      "crew_id",
      crews.map((c) => c.id)
    );

  const byCrew = new Map<string, string[]>();
  for (const m of members ?? []) {
    byCrew.set(m.crew_id, [...(byCrew.get(m.crew_id) ?? []), m.worker_id]);
  }
  return crews.map((c) => ({ ...c, memberIds: byCrew.get(c.id) ?? [] }));
}

export async function createCrew(
  orgId: string,
  name: string,
  foremanWorkerId?: string | null
): Promise<ActionResult> {
  const supabase = createClient();
  if (!name.trim()) return { ok: false, error: "Crew name is required" };
  const { data, error } = await supabase
    .from("crews")
    .insert({
      org_id: orgId,
      name: name.trim(),
      foreman_worker_id: foremanWorkerId || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(CREWS_PATH);
  return { ok: true, id: data.id };
}

export async function updateCrew(
  id: string,
  patch: { name?: string; foreman_worker_id?: string | null }
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("crews").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(CREWS_PATH);
  return { ok: true };
}

export async function deleteCrew(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("crews").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(CREWS_PATH);
  return { ok: true };
}

export async function setCrewMembers(
  crewId: string,
  workerIds: string[]
): Promise<ActionResult> {
  const supabase = createClient();
  // Replace the full membership set for simplicity.
  const { error: delError } = await supabase
    .from("crew_members")
    .delete()
    .eq("crew_id", crewId);
  if (delError) return { ok: false, error: delError.message };

  if (workerIds.length > 0) {
    const { error } = await supabase
      .from("crew_members")
      .insert(workerIds.map((worker_id) => ({ crew_id: crewId, worker_id })));
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath(CREWS_PATH);
  return { ok: true };
}

export async function getCrewById(crewId: string): Promise<CrewWithMembers | null> {
  const supabase = createClient();
  const { data: crew } = await supabase
    .from("crews")
    .select("*")
    .eq("id", crewId)
    .single();
  if (!crew) return null;

  const { data: members } = await supabase
    .from("crew_members")
    .select("worker_id")
    .eq("crew_id", crewId);

  return {
    ...crew,
    memberIds: members?.map((m) => m.worker_id) ?? [],
  };
}

export async function assignCrewToProject(input: {
  crewId: string;
  projectId: string;
  startDate?: string | null;
  endDate?: string | null;
  note?: string | null;
}): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("crew_assignments").insert({
    crew_id: input.crewId,
    project_id: input.projectId,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    note: input.note?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(CREWS_PATH);
  return { ok: true };
}

export async function listCrewAssignments(crewId: string): Promise<any[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("crew_assignments")
    .select(`
      *,
      projects (id, name, status)
    `)
    .eq("crew_id", crewId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function deleteCrewAssignment(assignmentId: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("crew_assignments").delete().eq("id", assignmentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(CREWS_PATH);
  return { ok: true };
}

// ----------------------------------------------------------------------------
// Crew Schedules
// ----------------------------------------------------------------------------

export type ShiftType = "morning" | "afternoon" | "evening" | "night" | "full_day";

export async function createCrewSchedule(input: {
  crewId: string;
  orgId: string;
  shiftDate: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  breakDuration?: number;
  location?: string;
  notes?: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("crew_schedules") as any).insert({
    crew_id: input.crewId,
    org_id: input.orgId,
    shift_date: input.shiftDate,
    shift_type: input.shiftType,
    start_time: input.startTime,
    end_time: input.endTime,
    break_duration: input.breakDuration ?? 0,
    location: input.location ?? null,
    notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(CREWS_PATH);
  return { ok: true, id: data.id };
}

export async function listCrewSchedules(crewId: string): Promise<any[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("crew_schedules")
    .select("*")
    .eq("crew_id", crewId)
    .order("shift_date", { ascending: true });
  return data ?? [];
}

export async function updateCrewSchedule(
  id: string,
  patch: {
    shift_type?: ShiftType;
    start_time?: string;
    end_time?: string;
    break_duration?: number;
    location?: string | null;
    notes?: string | null;
    is_active?: boolean;
  }
): Promise<ActionResult> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("crew_schedules") as any).update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(CREWS_PATH);
  return { ok: true };
}

export async function deleteCrewSchedule(id: string): Promise<ActionResult> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("crew_schedules") as any).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(CREWS_PATH);
  return { ok: true };
}

// ----------------------------------------------------------------------------
// Crew Productivity
// ----------------------------------------------------------------------------

export async function createCrewProductivity(input: {
  crewId: string;
  orgId: string;
  periodStart: string;
  periodEnd: string;
  totalHoursWorked?: number;
  tasksCompleted?: number;
  tasksTotal?: number;
  efficiencyScore?: number;
  qualityScore?: number;
  notes?: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("crew_productivity") as any).insert({
    crew_id: input.crewId,
    org_id: input.orgId,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    total_hours_worked: input.totalHoursWorked ?? 0,
    tasks_completed: input.tasksCompleted ?? 0,
    tasks_total: input.tasksTotal ?? 0,
    efficiency_score: input.efficiencyScore ?? null,
    quality_score: input.qualityScore ?? null,
    notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(CREWS_PATH);
  return { ok: true, id: data.id };
}

export async function listCrewProductivity(crewId: string): Promise<any[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("crew_productivity")
    .select("*")
    .eq("crew_id", crewId)
    .order("period_start", { ascending: false });
  return data ?? [];
}

export async function getCrewProductivityStats(crewId: string): Promise<{
  totalHoursWorked: number;
  totalTasksCompleted: number;
  totalTasksTotal: number;
  averageEfficiency: number;
  averageQuality: number;
}> {
  const productivity = await listCrewProductivity(crewId);
  const totalHoursWorked = productivity.reduce((sum, p) => sum + (p.total_hours_worked || 0), 0);
  const totalTasksCompleted = productivity.reduce((sum, p) => sum + (p.tasks_completed || 0), 0);
  const totalTasksTotal = productivity.reduce((sum, p) => sum + (p.tasks_total || 0), 0);
  
  const efficiencyScores = productivity.filter(p => p.efficiency_score !== null).map(p => p.efficiency_score);
  const averageEfficiency = efficiencyScores.length > 0 
    ? efficiencyScores.reduce((sum, s) => sum + s, 0) / efficiencyScores.length 
    : 0;
  
  const qualityScores = productivity.filter(p => p.quality_score !== null).map(p => p.quality_score);
  const averageQuality = qualityScores.length > 0 
    ? qualityScores.reduce((sum, s) => sum + s, 0) / qualityScores.length 
    : 0;

  return {
    totalHoursWorked,
    totalTasksCompleted,
    totalTasksTotal,
    averageEfficiency,
    averageQuality,
  };
}
