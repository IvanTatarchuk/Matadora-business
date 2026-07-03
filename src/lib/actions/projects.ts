"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
  projectId?: string;
}

export interface CreateProjectPayload {
  title: string;
  description?: string;
  address?: string;
  category?: string;
  surfaceArea?: number;
  budgetMin?: number;
  budgetMax?: number;
  deadline?: string; // ISO date (yyyy-mm-dd)
  publish?: boolean; // true => list on marketplace immediately
}

/** Investor creates a project (optionally published to the marketplace). */
export async function createProject(
  payload: CreateProjectPayload
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (!payload.title.trim()) {
    return { ok: false, error: "Project title is required" };
  }

  const publish = payload.publish ?? false;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      investor_id: user.id,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      address: payload.address?.trim() || null,
      category: payload.category || null,
      surface_area: payload.surfaceArea ?? null,
      budget_min: payload.budgetMin ?? null,
      budget_max: payload.budgetMax ?? null,
      deadline: payload.deadline || null,
      status: publish ? "open" : "draft",
      published_at: publish ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create project" };
  }

  revalidatePath("/dashboard/investor/projects");
  revalidatePath("/dashboard/marketplace");
  return { ok: true, projectId: data.id };
}

/** Publish a draft project to the marketplace (status -> open). */
export async function publishProject(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update({ status: "open", published_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/investor/projects");
  revalidatePath("/dashboard/marketplace");
  return { ok: true, projectId: id };
}

/** Remove a project from the marketplace (status -> draft). */
export async function unpublishProject(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update({ status: "draft" })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/investor/projects");
  revalidatePath("/dashboard/marketplace");
  return { ok: true, projectId: id };
}

/** Investor deletes their own project. */
export async function deleteProject(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/investor/projects");
  revalidatePath("/dashboard/marketplace");
  return { ok: true, projectId: id };
}
