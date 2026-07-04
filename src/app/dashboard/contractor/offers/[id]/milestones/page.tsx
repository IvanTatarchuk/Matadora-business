import { listPaymentMilestones } from "@/lib/actions/payment-milestones";
import { MilestonesClient } from "./milestones-client";

export default async function MilestonesPage({ params }: { params: { id: string } }) {
  const milestones = await listPaymentMilestones(params.id);
  return <MilestonesClient offerId={params.id} initialMilestones={milestones} />;
}
