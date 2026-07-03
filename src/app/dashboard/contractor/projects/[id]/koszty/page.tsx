import { listJobCostItems } from "@/lib/actions/job-costing";
import { KosztyClient } from "./koszty-client";

export default async function KosztyPage({ params }: { params: { id: string } }) {
  const items = await listJobCostItems(params.id);
  return <KosztyClient projectId={params.id} initialItems={items} />;
}
