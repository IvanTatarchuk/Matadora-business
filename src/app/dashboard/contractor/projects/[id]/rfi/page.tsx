import { listRFIs } from "@/lib/actions/rfis";
import { RFIClient } from "./rfi-client";

export default async function RFIPage({ params }: { params: { id: string } }) {
  const rfis = await listRFIs(params.id);
  return <RFIClient projectId={params.id} initialRFIs={rfis} />;
}
