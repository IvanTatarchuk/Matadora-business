"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type MeetingType =
  | "site" | "progress" | "design" | "safety" | "kickoff"
  | "closeout" | "client" | "subcontractor" | "other";

export type MeetingItemType = "topic" | "decision" | "action" | "issue" | "information";
export type MeetingItemStatus = "open" | "in_progress" | "done" | "cancelled";

export type MeetingAttendee = {
  name: string;
  company: string;
  role: string;
  present: boolean;
};

export type MeetingItem = {
  id: string;
  meeting_id: string;
  sort_order: number;
  item_type: MeetingItemType;
  title: string;
  description: string | null;
  assigned_to_name: string | null;
  due_date: string | null;
  status: MeetingItemStatus;
  carried_over_from: string | null;
  created_at: string;
};

export type Meeting = {
  id: string;
  project_id: string;
  org_id: string;
  created_by: string | null;
  number: number;
  number_display: string;
  title: string;
  meeting_type: MeetingType;
  meeting_date: string;
  meeting_time: string | null;
  location: string | null;
  duration_min: number;
  attendees: MeetingAttendee[];
  absent: MeetingAttendee[];
  agenda: string | null;
  summary: string | null;
  status: "draft" | "published" | "approved";
  published_at: string | null;
  next_meeting_date: string | null;
  next_meeting_location: string | null;
  created_at: string;
  updated_at: string;
  items?: MeetingItem[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listMeetings(projectId: string): Promise<Meeting[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("meetings")
    .select("*")
    .eq("project_id", projectId)
    .order("meeting_date", { ascending: false });
  if (error) return [];
  return (data ?? []) as Meeting[];
}

export async function getMeetingWithItems(meetingId: string): Promise<(Meeting & { items: MeetingItem[] }) | null> {
  const supabase = createClient();
  const { data: meeting, error } = await db(supabase)
    .from("meetings").select("*").eq("id", meetingId).single();
  if (error || !meeting) return null;

  const { data: items } = await db(supabase)
    .from("meeting_items").select("*").eq("meeting_id", meetingId)
    .order("sort_order", { ascending: true });

  return { ...meeting, items: items ?? [] };
}

export async function createMeeting(input: {
  projectId: string;
  title: string;
  meetingType?: MeetingType;
  meetingDate: string;
  meetingTime?: string;
  location?: string;
  durationMin?: number;
  attendees?: MeetingAttendee[];
  agenda?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const { data: member } = await supabase
    .from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data: last } = await db(supabase)
    .from("meetings").select("number").eq("project_id", input.projectId)
    .order("number", { ascending: false }).limit(1).single();

  const { data, error } = await db(supabase)
    .from("meetings")
    .insert({
      project_id: input.projectId,
      org_id: member.org_id,
      created_by: user.id,
      number: (last?.number ?? 0) + 1,
      title: input.title,
      meeting_type: input.meetingType ?? "site",
      meeting_date: input.meetingDate,
      meeting_time: input.meetingTime ?? null,
      location: input.location ?? null,
      duration_min: input.durationMin ?? 60,
      attendees: input.attendees ?? [],
      agenda: input.agenda ?? null,
    })
    .select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/spotkania`);
  return { ok: true, id: data.id };
}

export async function addMeetingItem(input: {
  meetingId: string;
  projectId: string;
  itemType: MeetingItemType;
  title: string;
  description?: string;
  assignedToName?: string;
  dueDate?: string;
  sortOrder?: number;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("meeting_items")
    .insert({
      meeting_id: input.meetingId,
      item_type: input.itemType,
      title: input.title,
      description: input.description ?? null,
      assigned_to_name: input.assignedToName ?? null,
      due_date: input.dueDate ?? null,
      sort_order: input.sortOrder ?? 0,
    })
    .select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/spotkania`);
  return { ok: true, id: data.id };
}

export async function updateMeetingItemStatus(
  itemId: string,
  projectId: string,
  status: MeetingItemStatus
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("meeting_items").update({ status }).eq("id", itemId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/spotkania`);
  return { ok: true };
}

export async function publishMeeting(
  meetingId: string,
  projectId: string,
  summary: string,
  nextMeetingDate?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("meetings")
    .update({
      status: "published",
      summary,
      next_meeting_date: nextMeetingDate ?? null,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", meetingId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/spotkania`);
  return { ok: true };
}

export async function deleteMeeting(
  meetingId: string,
  projectId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("meetings").delete().eq("id", meetingId).eq("status", "draft");
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/spotkania`);
  return { ok: true };
}
