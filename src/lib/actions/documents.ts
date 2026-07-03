"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type DocCategory =
  | "projekt" | "umowa" | "kosztorys" | "bhp" | "pozwolenie"
  | "protokol" | "faktura" | "aneks" | "korespondencja" | "zdjecie" | "inne";

export type ProjectDocument = {
  id: string;
  project_id: string;
  org_id: string;
  uploaded_by: string | null;
  name: string;
  file_url: string | null;
  file_size: number;
  mime_type: string | null;
  category: DocCategory;
  folder_path: string;
  version: number;
  is_latest: boolean;
  is_confidential: boolean;
  visible_to: "all" | "contractor_only" | "investor_only";
  notes: string | null;
  tags: string[];
  expiry_date: string | null;
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  uploader_name?: string | null;
};

export async function listProjectDocuments(projectId: string): Promise<ProjectDocument[]> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("project_documents")
    .select("*, uploader:uploaded_by(full_name)")
    .eq("project_id", projectId)
    .eq("is_latest", true)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []).map((d: Record<string, unknown>) => ({
    ...d,
    uploader_name: (d.uploader as { full_name?: string } | null)?.full_name ?? null,
  })) as ProjectDocument[];
}

export async function createProjectDocument(input: {
  projectId: string;
  name: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  category: DocCategory;
  folderPath?: string;
  isConfidential?: boolean;
  visibleTo?: "all" | "contractor_only" | "investor_only";
  notes?: string;
  expiryDate?: string;
  requiresApproval?: boolean;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  // Get org
  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("project_documents")
    .insert({
      project_id: input.projectId,
      org_id: member.org_id,
      uploaded_by: user.id,
      name: input.name,
      file_url: input.fileUrl ?? null,
      file_size: input.fileSize ?? 0,
      mime_type: input.mimeType ?? null,
      category: input.category,
      folder_path: input.folderPath ?? "/",
      is_confidential: input.isConfidential ?? false,
      visible_to: input.visibleTo ?? "all",
      notes: input.notes ?? null,
      expiry_date: input.expiryDate ?? null,
      requires_approval: input.requiresApproval ?? false,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/dokumenty`);
  return { ok: true, id: data.id };
}

export async function uploadDocumentFile(
  formData: FormData,
  projectId: string
): Promise<{ ok: boolean; url?: string; size?: number; mimeType?: string; error?: string }> {
  const supabase = createClient();
  const file = formData.get("file") as File | null;
  if (!file) return { ok: false, error: "Brak pliku" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `project-docs/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("project-documents")
    .upload(path, file, { contentType: file.type });

  if (error) return { ok: false, error: error.message };

  const { data: { publicUrl } } = supabase.storage
    .from("project-documents")
    .getPublicUrl(path);

  return { ok: true, url: publicUrl, size: file.size, mimeType: file.type };
}

export async function deleteProjectDocument(
  docId: string,
  projectId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("project_documents")
    .delete()
    .eq("id", docId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/dokumenty`);
  return { ok: true };
}

export async function updateProjectDocument(
  docId: string,
  projectId: string,
  updates: Partial<{ notes: string; category: DocCategory; expiry_date: string; is_confidential: boolean; visible_to: string }>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("project_documents")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", docId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/dokumenty`);
  return { ok: true };
}
