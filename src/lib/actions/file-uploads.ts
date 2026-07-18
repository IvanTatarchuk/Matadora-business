"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FileCategory = "document" | "image" | "video" | "audio" | "other";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const UPLOADS_PATH = "/dashboard/uploads";

export async function createFileUpload(input: {
  orgId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  storageUrl?: string;
  category?: FileCategory;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}): Promise<ActionResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("file_uploads") as any).insert({
    org_id: input.orgId,
    file_name: input.fileName,
    file_type: input.fileType,
    file_size: input.fileSize,
    storage_path: input.storagePath,
    storage_url: input.storageUrl || null,
    uploaded_by: user.id,
    category: input.category || "other",
    description: input.description || null,
    tags: input.tags || [],
    is_public: input.isPublic || false,
  }).select("id").single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(UPLOADS_PATH);
  return { ok: true, id: data.id };
}

export async function listFileUploads(orgId: string, category?: FileCategory): Promise<any[]> {
  const supabase = createClient();
  let query = supabase
    .from("file_uploads")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data } = await query;
  return data ?? [];
}

export async function deleteFileUpload(id: string): Promise<ActionResult> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("file_uploads") as any).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(UPLOADS_PATH);
  return { ok: true };
}

export async function updateFileUpload(
  id: string,
  patch: {
    description?: string | null;
    tags?: string[];
    is_public?: boolean;
  }
): Promise<ActionResult> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("file_uploads") as any).update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(UPLOADS_PATH);
  return { ok: true };
}

export async function incrementDownloadCount(id: string): Promise<ActionResult> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await (supabase.from("file_uploads") as any).select("download_count").eq("id", id).single();
  const currentCount = current?.download_count || 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("file_uploads") as any).update({
    download_count: currentCount + 1,
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getFileUploadStats(orgId: string): Promise<{
  totalFiles: number;
  totalSize: number;
  byCategory: Record<FileCategory, number>;
}> {
  const uploads = await listFileUploads(orgId);
  const totalFiles = uploads.length;
  const totalSize = uploads.reduce((sum, u) => sum + (u.file_size || 0), 0);
  
  const byCategory: Record<FileCategory, number> = {
    document: 0,
    image: 0,
    video: 0,
    audio: 0,
    other: 0,
  };
  
  for (const upload of uploads) {
    const cat = upload.category as FileCategory;
    if (cat && byCategory[cat] !== undefined) {
      byCategory[cat]++;
    }
  }

  return { totalFiles, totalSize, byCategory };
}
