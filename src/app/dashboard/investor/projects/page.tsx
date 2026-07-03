import { createClient } from "@/lib/supabase/server";
import {
  ProjectsManager,
  type ProjectWithBids,
} from "@/components/investor/projects-manager";
import { ReviewsPanel } from "@/components/trust/reviews-panel";
import { getReviewableProjects } from "@/lib/actions/reviews";

export default async function InvestorProjectsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("investor_id", user!.id)
    .order("created_at", { ascending: false });

  const list = projects ?? [];

  // Count bids (offers) per project.
  const ids = list.map((p) => p.id);
  const { data: offers } = ids.length
    ? await supabase.from("offers").select("project_id").in("project_id", ids)
    : { data: [] as { project_id: string }[] };

  const bidCounts = new Map<string, number>();
  for (const o of offers ?? []) {
    bidCounts.set(o.project_id, (bidCounts.get(o.project_id) ?? 0) + 1);
  }

  const withBids: ProjectWithBids[] = list.map((p) => ({
    ...p,
    bidCount: bidCounts.get(p.id) ?? 0,
  }));

  const reviewable = await getReviewableProjects();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My projects</h1>
        <p className="text-sm text-muted-foreground">
          Create a project and publish it to the marketplace so contractors can
          submit competitive bids.
        </p>
      </div>

      <ProjectsManager projects={withBids} />

      <ReviewsPanel items={reviewable} />
    </div>
  );
}
