"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailProgressUpdate, emailProjectComplete } from "@/lib/email";
import type {
  ProjectTask,
  ProjectTaskStatus,
  ProjectUpdate,
} from "@/types/database";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
  url?: string;
}

const PHOTO_BUCKET = "project-photos";
const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

function path(projectId: string) {
  return `/dashboard/contractor/projects/${projectId}`;
}

// ----------------------------------------------------------------------------
// Tasks
// ----------------------------------------------------------------------------
export async function listTasks(projectId: string): Promise<ProjectTask[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("project_tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function createTask(input: {
  projectId: string;
  title: string;
  crewId?: string | null;
  dueDate?: string | null;
}): Promise<ActionResult> {
  const supabase = createClient();
  if (!input.title.trim()) return { ok: false, error: "Title is required" };
  const { data, error } = await supabase
    .from("project_tasks")
    .insert({
      project_id: input.projectId,
      title: input.title.trim(),
      crew_id: input.crewId || null,
      due_date: input.dueDate || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(path(input.projectId));
  return { ok: true, id: data.id };
}

export async function updateTask(
  id: string,
  projectId: string,
  patch: {
    title?: string;
    status?: ProjectTaskStatus;
    progress?: number;
    crew_id?: string | null;
    due_date?: string | null;
  }
): Promise<ActionResult> {
  const supabase = createClient();
  // Keep status and progress consistent.
  const next = { ...patch };
  if (next.status === "done") next.progress = 100;
  if (typeof next.progress === "number") {
    next.progress = Math.max(0, Math.min(100, Math.round(next.progress)));
    if (next.progress === 100 && !next.status) next.status = "done";
  }
  const { error } = await supabase
    .from("project_tasks")
    .update(next)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(path(projectId));
  return { ok: true };
}

export async function deleteTask(
  id: string,
  projectId: string
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("project_tasks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(path(projectId));
  return { ok: true };
}

// ----------------------------------------------------------------------------
// Progress / photo updates
// ----------------------------------------------------------------------------
export async function listUpdates(
  projectId: string
): Promise<ProjectUpdate[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("project_updates")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function addUpdate(input: {
  projectId: string;
  note?: string;
  progress?: number | null;
  photoUrl?: string | null;
}): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (!input.note?.trim() && !input.photoUrl) {
    return { ok: false, error: "Add a note or a photo" };
  }

  const { error } = await supabase.from("project_updates").insert({
    project_id: input.projectId,
    author_id: user.id,
    note: input.note?.trim() || null,
    progress:
      typeof input.progress === "number"
        ? Math.max(0, Math.min(100, Math.round(input.progress)))
        : null,
    photo_url: input.photoUrl || null,
  });
  if (error) return { ok: false, error: error.message };

  // Email investor on progress update (non-blocking).
  const admin = createAdminClient();
  void Promise.resolve(
    admin
      .from("projects")
      .select("title, investor_id")
      .eq("id", input.projectId)
      .single()
  ).then(async ({ data: proj }) => {
      if (!proj || !input.progress) return;
      const { data: inv } = await admin
        .from("profiles")
        .select("full_name, company_name")
        .eq("id", proj.investor_id)
        .single();
      const { data: authData } = await admin.auth.admin.getUserById(proj.investor_id);
      const email = authData?.user?.email;
      if (!email || !inv) return;
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://buildmate-app-nu.vercel.app";
      emailProgressUpdate({
        investorEmail: email,
        investorName: inv.full_name ?? inv.company_name ?? "Investor",
        projectTitle: proj.title,
        progress: input.progress,
        note: input.note,
        projectUrl: `${siteUrl}/dashboard/investor/projects/${input.projectId}`,
      });
  }).catch(() => {});

  revalidatePath(path(input.projectId));
  return { ok: true };
}

/** Uploads a site photo and returns its public URL. Expects FormData "photo". */
export async function uploadProjectPhoto(
  formData: FormData
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided" };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Photo must be 8 MB or smaller" };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: "Use PNG, JPG or WEBP" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const objectPath = `${user.id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(objectPath, file, { upsert: true, contentType: file.type });
  if (uploadError) return { ok: false, error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(objectPath);
  return { ok: true, url: publicUrl };
}

/** Sets the project lifecycle status (e.g. mark in progress / completed). */
export async function setProjectStatus(
  projectId: string,
  status: "in_progress" | "completed"
): Promise<ActionResult> {
  const supabase = createClient();
  const { data: proj, error } = await supabase
    .from("projects")
    .update({ status })
    .eq("id", projectId)
    .select("title, investor_id")
    .single();
  if (error) return { ok: false, error: error.message };

  // Email investor when project is completed (non-blocking).
  if (status === "completed" && proj) {
    const admin = createAdminClient();
    void Promise.resolve(
      admin
        .from("profiles")
        .select("full_name, company_name")
        .eq("id", proj.investor_id)
        .single()
    ).then(async ({ data: inv }) => {
        const { data: authData } = await admin.auth.admin.getUserById(proj.investor_id);
        const email = authData?.user?.email;
        if (!email || !inv) return;
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://buildmate-app-nu.vercel.app";
        emailProjectComplete({
          investorEmail: email,
          investorName: inv.full_name ?? inv.company_name ?? "Investor",
          projectTitle: proj.title,
          projectUrl: `${siteUrl}/dashboard/investor/projects/${projectId}`,
        });
    }).catch(() => {});
  }

  revalidatePath(path(projectId));
  return { ok: true };
}
