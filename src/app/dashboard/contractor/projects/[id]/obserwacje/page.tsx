import { listObservations } from "@/lib/actions/observations";
import { ObserwacjeClient } from "./obserwacje-client";

export default async function ObserwacjePage({ params }: { params: { id: string } }) {
  const observations = await listObservations(params.id);
  return <ObserwacjeClient projectId={params.id} initialObservations={observations} />;
}
