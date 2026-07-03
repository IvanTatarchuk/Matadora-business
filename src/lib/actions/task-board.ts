"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskCategory = "general" | "technical" | "admin" | "procurement" | "safety" | "quality" | "other";

export type TaskCard = {
  id: string;
  project_id: string;
  org_id: string;
  created_by: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  position: number;
  tags: string[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listTaskCards(projectId: string): Promise<TaskCard[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("project_task_cards").select("*").eq("project_id", projectId)
    .order("status").order("position");
  if (error) return [];
  return (data ?? []) as TaskCard[];
}

export async function createTaskCard(input: {
  projectId: string; title: string; status?: TaskStatus;
  priority?: TaskPriority; category?: TaskCategory;
  description?: string; dueDate?: string;
  estimatedHours?: number;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data: last } = await db(supabase)
    .from("project_task_cards").select("position")
    .eq("project_id", input.projectId).eq("status", input.status ?? "todo")
    .order("position", { ascending: false }).limit(1).single();

  const { data, error } = await db(supabase).from("project_task_cards").insert({
    project_id: input.projectId, org_id: member.org_id, created_by: user.id,
    title: input.title, status: input.status ?? "todo",
    priority: input.priority ?? "medium", category: input.category ?? "general",
    description: input.description ?? null,
    due_date: input.dueDate ?? null,
    estimated_hours: input.estimatedHours ?? null,
    position: (last?.position ?? 0) + 10,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/zadania`);
  return { ok: true, id: data.id };
}

export async function moveTaskCard(
  id: string, projectId: string, newStatus: TaskStatus
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const updates: Record<string, unknown> = {
    status: newStatus, updated_at: new Date().toISOString(),
  };
  if (newStatus === "done") updates.completed_at = new Date().toISOString();
  else updates.completed_at = null;
  const { error } = await db(supabase).from("project_task_cards").update(updates).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/zadania`);
  return { ok: true };
}

export async function deleteTaskCard(id: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("project_task_cards").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/zadania`);
  return { ok: true };
}

export async function updateTaskCard(
  id: string, projectId: string,
  updates: Partial<Pick<TaskCard, "title" | "description" | "priority" | "due_date" | "estimated_hours">>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("project_task_cards")
    .update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/zadania`);
  return { ok: true };
}
