"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type PhotoCategory =
  | "progress" | "defect" | "inspection" | "safety"
  | "handover" | "before" | "after" | "drone" | "other";

export type ProjectPhoto = {
  id: string;
  project_id: string;
  org_id: string;
  uploaded_by: string | null;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  title: string | null;
  description: string | null;
  category: PhotoCategory;
  taken_at: string | null;
  location_note: string | null;
  tags: string[];
  is_cover: boolean;
  created_at: string;
  public_url?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listProjectPhotos(projectId: string): Promise<ProjectPhoto[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("project_photos").select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return ((data ?? []) as ProjectPhoto[]).map((p) => ({
    ...p,
    public_url: supabase.storage.from("project-photos").getPublicUrl(p.storage_path).data.publicUrl,
  }));
}

export async function addPhotoRecord(input: {
  projectId: string;
  storagePath: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  title?: string;
  description?: string;
  category?: PhotoCategory;
  locationNote?: string;
  takenAt?: string;
  isCover?: boolean;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("project_photos").insert({
    project_id: input.projectId, org_id: member.org_id, uploaded_by: user.id,
    storage_path: input.storagePath, file_name: input.fileName,
    file_size: input.fileSize ?? null, mime_type: input.mimeType ?? null,
    title: input.title ?? null, description: input.description ?? null,
    category: input.category ?? "progress",
    location_note: input.locationNote ?? null,
    taken_at: input.takenAt ?? null,
    is_cover: input.isCover ?? false,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/galeria`);
  return { ok: true, id: data.id };
}

export async function deletePhoto(id: string, storagePath: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  await supabase.storage.from("project-photos").remove([storagePath]);
  const { error } = await db(supabase).from("project_photos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/galeria`);
  return { ok: true };
}

export async function uploadProjectPhoto(
  projectId: string, file: FormData
): Promise<{ ok: boolean; path?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const fileObj = file.get("file") as File | null;
  if (!fileObj) return { ok: false, error: "Brak pliku" };

  const ext = fileObj.name.split(".").pop() ?? "jpg";
  const path = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from("project-photos").upload(path, fileObj);
  if (error) return { ok: false, error: error.message };

  return { ok: true, path };
}
