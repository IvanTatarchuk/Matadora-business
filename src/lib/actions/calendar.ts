"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type EventType = "task" | "milestone" | "meeting" | "inspection" | "delivery" | "deadline" | "holiday" | "other";
export type EventStatus = "planned" | "in_progress" | "completed" | "cancelled";
export type EventPriority = "low" | "medium" | "high" | "critical";

export type CalendarEvent = {
  id: string; project_id: string; org_id: string; created_by: string | null;
  title: string; description: string | null; type: EventType; color: string | null;
  start_date: string; end_date: string | null; all_day: boolean;
  start_time: string | null; end_time: string | null;
  assignee_name: string | null; location: string | null;
  status: EventStatus; priority: EventPriority;
  recurrence: string | null; notes: string | null;
  created_at: string; updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listCalendarEvents(projectId: string, year: number, month: number): Promise<CalendarEvent[]> {
  const supabase = createClient();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10);
  const { data, error } = await db(supabase)
    .from("calendar_events").select("*").eq("project_id", projectId)
    .gte("start_date", startDate).lte("start_date", endDate)
    .order("start_date").order("priority", { ascending: false });
  if (error) return [];
  return (data ?? []) as CalendarEvent[];
}

export async function createCalendarEvent(input: {
  projectId: string; title: string; type?: EventType;
  startDate: string; endDate?: string; allDay?: boolean;
  startTime?: string; endTime?: string;
  assigneeName?: string; location?: string;
  priority?: EventPriority; color?: string; notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("calendar_events").insert({
    project_id: input.projectId, org_id: member.org_id, created_by: user.id,
    title: input.title, type: input.type ?? "task",
    start_date: input.startDate, end_date: input.endDate ?? null,
    all_day: input.allDay ?? true,
    start_time: input.startTime ?? null, end_time: input.endTime ?? null,
    assignee_name: input.assigneeName ?? null, location: input.location ?? null,
    priority: input.priority ?? "medium",
    color: input.color ?? "#3b82f6", notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/kalendarz`);
  return { ok: true, id: data.id };
}

export async function updateEventStatus(id: string, projectId: string, status: EventStatus): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("calendar_events").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/kalendarz`);
  return { ok: true };
}

export async function deleteCalendarEvent(id: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("calendar_events").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/kalendarz`);
  return { ok: true };
}
