import { getCrewById, listCrewAssignments } from "@/lib/actions/workforce";
import { CrewDetailClient } from "./crew-detail-client";

export default async function CrewDetailPage({ params }: { params: { id: string } }) {
  const crew = await getCrewById(params.id);
  if (!crew) {
    return <p className="text-sm text-muted-foreground">Бригаду не знайдено.</p>;
  }
  const assignments = await listCrewAssignments(params.id);
  return <CrewDetailClient crew={crew} initialAssignments={assignments} />;
}
