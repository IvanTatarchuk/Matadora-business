"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type DrawingDiscipline = "architecture" | "structure" | "mep" | "electrical" | "plumbing" | "hvac" | "civil" | "landscape" | "fire" | "other";
export type DrawingStatus = "draft" | "for_review" | "issued" | "superseded" | "void";

export type ProjectDrawing = {
  id: string; project_id: string; org_id: string; uploaded_by: string | null;
  drawing_number: string; title: string; description: string | null;
  discipline: DrawingDiscipline; sheet_size: string | null;
  revision: string; revision_date: string | null; status: DrawingStatus;
  file_url: string | null; file_name: string | null; file_size_bytes: number | null;
  scale: string | null; notes: string | null;
  created_at: string; updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listDrawings(projectId: string): Promise<ProjectDrawing[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("project_drawings").select("*").eq("project_id", projectId)
    .neq("status", "void")
    .order("discipline").order("drawing_number");
  if (error) return [];
  return (data ?? []) as ProjectDrawing[];
}

export async function createDrawing(input: {
  projectId: string; drawingNumber: string; title: string;
  description?: string; discipline?: DrawingDiscipline;
  sheetSize?: string; revision?: string; revisionDate?: string;
  fileUrl?: string; fileName?: string; scale?: string; notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("project_drawings").insert({
    project_id: input.projectId, org_id: member.org_id, uploaded_by: user.id,
    drawing_number: input.drawingNumber, title: input.title,
    description: input.description ?? null,
    discipline: input.discipline ?? "architecture",
    sheet_size: input.sheetSize ?? null,
    revision: input.revision ?? "A", revision_date: input.revisionDate ?? null,
    status: "issued",
    file_url: input.fileUrl ?? null, file_name: input.fileName ?? null,
    scale: input.scale ?? null, notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/rysunki`);
  return { ok: true, id: data.id };
}

export async function updateDrawingStatus(id: string, projectId: string, status: DrawingStatus): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("project_drawings").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/rysunki`);
  return { ok: true };
}

export async function addDrawingRevision(
  originalId: string, projectId: string,
  newRevision: string, revisionDate?: string, notes?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: original } = await db(supabase).from("project_drawings").select("*").eq("id", originalId).single();
  if (!original) return { ok: false, error: "Rysunek nie znaleziony" };

  await db(supabase).from("project_drawings").update({ status: "superseded" }).eq("id", originalId);
  const { error } = await db(supabase).from("project_drawings").insert({
    ...original, id: undefined, created_at: undefined, updated_at: undefined,
    revision: newRevision, revision_date: revisionDate ?? null,
    status: "issued", notes: notes ?? null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/rysunki`);
  return { ok: true };
}
