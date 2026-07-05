import { listRfqs } from "@/lib/actions/rfq";
import { listProjectSubBids, type SubBid } from "@/lib/actions/sub-bids";
import { RfqClient } from "./rfq-client";

export default async function RfqPage({ params }: { params: { id: string } }) {
  const [rfqs, subBids] = await Promise.all([
    listRfqs(params.id),
    listProjectSubBids(params.id),
  ]);
  const initialSubBids = subBids.reduce<Record<string, SubBid[]>>((acc, bid) => {
    (acc[bid.rfq_id] ??= []).push(bid);
    return acc;
  }, {});
  return <RfqClient projectId={params.id} initialRfqs={rfqs} initialSubBids={initialSubBids} />;
}
