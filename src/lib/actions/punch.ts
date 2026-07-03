"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailPunchItemOpened } from "@/lib/email";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export type PunchStatus = "open" | "in_progress" | "resolved";

export interface PunchItem {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  plan_x: number | null;
  plan_y: number | null;
  floor_plan_url: string | null;
  status: PunchStatus;
  assigned_to: string | null;
  due_date: string | null;
  resolved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function punchPath(projectId: string) {
  return `/dashboard/contractor/projects/${projectId}/punch`;
}

export async function listPunchItems(projectId: string): Promise<PunchItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("punch_items")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return (data ?? []) as PunchItem[];
}

export async function createPunchItem(input: {
  projectId: string;
  title: string;
  description?: string;
  photoUrl?: string | null;
  dueDate?: string | null;
  assignedTo?: string | null;
}): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  if (!input.title.trim()) return { ok: false, error: "Title required" };

  const { data, error } = await supabase
    .from("punch_items")
    .insert({
      project_id: input.projectId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      photo_url: input.photoUrl || null,
      due_date: input.dueDate || null,
      assigned_to: input.assignedTo || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  // Notify contractor if item created by investor (non-blocking).
  const admin = createAdminClient();
  void Promise.resolve(
    admin
      .from("projects")
      .select("title, contractor_id")
      .eq("id", input.projectId)
      .single()
  ).then(async ({ data: proj }) => {
    if (!proj?.contractor_id || proj.contractor_id === user.id) return;
    const { data: con } = await admin
      .from("profiles")
      .select("full_name, company_name")
      .eq("id", proj.contractor_id)
      .single();
    const { data: authData } = await admin.auth.admin.getUserById(proj.contractor_id);
    const email = authData?.user?.email;
    if (!email || !con) return;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://buildmate-app-nu.vercel.app";
    emailPunchItemOpened({
      contractorEmail: email,
      contractorName: con.full_name ?? con.company_name ?? "Contractor",
      projectTitle: proj.title,
      itemTitle: input.title,
      projectUrl: `${siteUrl}/dashboard/contractor/projects/${input.projectId}/punch`,
    });
  }).catch(() => {});

  revalidatePath(punchPath(input.projectId));
  return { ok: true, id: data.id };
}

export async function updatePunchStatus(
  id: string,
  projectId: string,
  status: PunchStatus
): Promise<ActionResult> {
  const supabase = createClient();
  const patch =
    status === "resolved"
      ? { status, resolved_at: new Date().toISOString() }
      : { status };
  const { error } = await supabase.from("punch_items").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(punchPath(projectId));
  return { ok: true };
}

export async function deletePunchItem(
  id: string,
  projectId: string
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("punch_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(punchPath(projectId));
  return { ok: true };
}

/** Upload a photo for a punch item — uses the same project-photos bucket. */
export async function uploadPunchPhoto(
  formData: FormData
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "No file" };
  if (file.size > 8 * 1024 * 1024) return { ok: false, error: "Max 8 MB" };

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `punch/${user.id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("project-photos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) return { ok: false, error: error.message };

  const { data: { publicUrl } } = supabase.storage
    .from("project-photos")
    .getPublicUrl(path);
  return { ok: true, id: publicUrl };
}
