import { listMilestones } from "@/lib/actions/milestones";
import { MilestonesClient } from "./milestones-client";

export default async function MilestonesPage({ params }: { params: { id: string } }) {
  const milestones = await listMilestones(params.id);
  return <MilestonesClient projectId={params.id} initialMilestones={milestones} />;
}
