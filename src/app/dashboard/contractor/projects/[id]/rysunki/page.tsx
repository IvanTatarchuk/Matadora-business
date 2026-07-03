import { listDrawings } from "@/lib/actions/drawings";
import { RysunkiClient } from "./rysunki-client";

export default async function RysunkiPage({ params }: { params: { id: string } }) {
  const drawings = await listDrawings(params.id);
  return <RysunkiClient projectId={params.id} initialDrawings={drawings} />;
}
