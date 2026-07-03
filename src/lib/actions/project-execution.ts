"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export type ProjectTask = {
  id: string;
  project_id: string;
  crew_id: string | null;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "blocked" | "done";
  progress: number;
  order_index: number;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectUpdate = {
  id: string;
  project_id: string;
  author_id: string | null;
  note: string | null;
  progress: number | null;
  photo_url: string | null;
  created_at: string;
};

export type TaskInput = {
  projectId: string;
  crewId?: string;
  title: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
};

export async function createProjectTask(input: TaskInput): Promise<{ ok: boolean; error?: string; taskId?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const { data: task, error } = await db(supabase)
    .from("project_tasks")
    .insert({
      project_id: input.projectId,
      crew_id: input.crewId || null,
      title: input.title,
      description: input.description || null,
      status: "todo",
      progress: 0,
      start_date: input.startDate || null,
      due_date: input.dueDate || null,
    })
    .select("id")
    .single();

  if (error || !task) return { ok: false, error: error?.message ?? "Błąd tworzenia zadania" };

  revalidatePath(`/dashboard/contractor/projects/${input.projectId}`);
  return { ok: true, taskId: task.id };
}

export async function listProjectTasks(projectId: string): Promise<ProjectTask[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("project_tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });
  if (error) return [];
  return (data ?? []) as ProjectTask[];
}

export async function updateTaskStatus(
  id: string, status: ProjectTask["status"], progress?: number
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const updateData: any = { status };
  if (progress !== undefined) updateData.progress = progress;
  
  const { error } = await db(supabase)
    .from("project_tasks")
    .update(updateData)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/contractor/projects");
  return { ok: true };
}

export async function deleteProjectTask(id: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("project_tasks")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/contractor/projects/${projectId}`);
  return { ok: true };
}

export async function createProjectUpdate(input: {
  projectId: string;
  note?: string;
  progress?: number;
  photoUrl?: string;
}): Promise<{ ok: boolean; error?: string; updateId?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const { data: update, error } = await db(supabase)
    .from("project_updates")
    .insert({
      project_id: input.projectId,
      author_id: user.id,
      note: input.note || null,
      progress: input.progress || null,
      photo_url: input.photoUrl || null,
    })
    .select("id")
    .single();

  if (error || !update) return { ok: false, error: error?.message ?? "Błąd tworzenia aktualizacji" };

  revalidatePath(`/dashboard/contractor/projects/${input.projectId}`);
  return { ok: true, updateId: update.id };
}

export async function listProjectUpdates(projectId: string): Promise<ProjectUpdate[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("project_updates")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as ProjectUpdate[];
}
