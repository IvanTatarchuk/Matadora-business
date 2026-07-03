import { listRfqs } from "@/lib/actions/rfq";
import { RfqClient } from "./rfq-client";

export default async function RfqPage({ params }: { params: { id: string } }) {
  const rfqs = await listRfqs(params.id);
  return <RfqClient projectId={params.id} initialRfqs={rfqs} />;
}
