"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface ReviewableProject {
  projectId: string;
  projectTitle: string;
  revieweeId: string;
  revieweeName: string;
  alreadyReviewed: boolean;
}

/** Posts a review about the counterparty of a project the user took part in. */
export async function createReview(input: {
  projectId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const rating = Math.round(Number(input.rating));
  if (!(rating >= 1 && rating <= 5)) {
    return { ok: false, error: "Rating must be 1–5" };
  }

  const { error } = await supabase.from("reviews").insert({
    project_id: input.projectId,
    reviewer_id: user.id,
    reviewee_id: input.revieweeId,
    rating,
    comment: input.comment?.trim() || null,
  });

  if (error) {
    // Unique violation = already reviewed this counterparty on this project.
    if (error.code === "23505") {
      return { ok: false, error: "You already reviewed this project" };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/investor/projects");
  revalidatePath("/dashboard/contractor/projects");
  return { ok: true };
}

/**
 * Projects the current user can review: in-progress/completed projects they
 * participate in, paired with the counterparty and whether already reviewed.
 */
export async function getReviewableProjects(): Promise<ReviewableProject[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, investor_id, contractor_id, status")
    .in("status", ["in_progress", "completed"])
    .or(`investor_id.eq.${user.id},contractor_id.eq.${user.id}`);

  const eligible = (projects ?? []).filter(
    (p) =>
      p.contractor_id &&
      p.investor_id !== p.contractor_id &&
      (p.investor_id === user.id || p.contractor_id === user.id)
  );
  if (eligible.length === 0) return [];

  // Counterparty ids + names.
  const counterpartyId = (p: (typeof eligible)[number]) =>
    p.investor_id === user.id ? (p.contractor_id as string) : p.investor_id;

  const ids = Array.from(new Set(eligible.map(counterpartyId)));
  const { data: people } = await supabase
    .from("profiles")
    .select("id, company_name, full_name")
    .in("id", ids);
  const nameById = new Map(
    (people ?? []).map((p) => [p.id, p.company_name || p.full_name || "Company"])
  );

  // Which projects has the user already reviewed?
  const { data: mine } = await supabase
    .from("reviews")
    .select("project_id")
    .eq("reviewer_id", user.id)
    .in(
      "project_id",
      eligible.map((p) => p.id)
    );
  const reviewed = new Set((mine ?? []).map((r) => r.project_id));

  return eligible.map((p) => {
    const rid = counterpartyId(p);
    return {
      projectId: p.id,
      projectTitle: p.title,
      revieweeId: rid,
      revieweeName: nameById.get(rid) ?? "Company",
      alreadyReviewed: reviewed.has(p.id),
    };
  });
}
