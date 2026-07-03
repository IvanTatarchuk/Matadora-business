"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type DispatchStatus = "planned" | "confirmed" | "completed" | "absent" | "cancelled";

export type DispatchAssignment = {
  id: string; org_id: string; project_id: string; created_by: string | null;
  worker_id: string | null; worker_name: string | null;
  work_date: string; start_time: string | null; end_time: string | null;
  task_description: string | null; location_note: string | null;
  status: DispatchStatus; notes: string | null;
  created_at: string; updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listDispatchForWeek(
  startDate: string, endDate: string
): Promise<DispatchAssignment[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("dispatch_assignments").select("*").eq("org_id", member.org_id)
    .gte("work_date", startDate).lte("work_date", endDate)
    .order("work_date").order("worker_name");
  if (error) return [];
  return (data ?? []) as DispatchAssignment[];
}

export async function createDispatchAssignment(input: {
  projectId: string; workerId?: string; workerName: string;
  workDate: string; startTime?: string; endTime?: string;
  taskDescription?: string; locationNote?: string; notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("dispatch_assignments").insert({
    org_id: member.org_id, project_id: input.projectId, created_by: user.id,
    worker_id: input.workerId ?? null, worker_name: input.workerName,
    work_date: input.workDate, start_time: input.startTime ?? null,
    end_time: input.endTime ?? null,
    task_description: input.taskDescription ?? null,
    location_note: input.locationNote ?? null,
    notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/brygady/planowanie");
  return { ok: true, id: data.id };
}

export async function updateDispatchStatus(
  id: string, status: DispatchStatus
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("dispatch_assignments").update({
    status, updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/brygady/planowanie");
  return { ok: true };
}

export async function deleteDispatchAssignment(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("dispatch_assignments").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/brygady/planowanie");
  return { ok: true };
}
