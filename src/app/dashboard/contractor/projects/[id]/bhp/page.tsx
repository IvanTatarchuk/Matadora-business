import { listSafetyObservations } from "@/lib/actions/safety";
import { BhpClient } from "./bhp-client";

export default async function BhpPage({ params }: { params: { id: string } }) {
  const observations = await listSafetyObservations(params.id);
  return <BhpClient projectId={params.id} initialObservations={observations} />;
}
