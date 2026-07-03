import { listIncidents } from "@/lib/actions/incidents";
import { WypadkiClient } from "./wypadki-client";

export default async function WypadkiPage({ params }: { params: { id: string } }) {
  const incidents = await listIncidents(params.id);
  return <WypadkiClient projectId={params.id} initialIncidents={incidents} />;
}
