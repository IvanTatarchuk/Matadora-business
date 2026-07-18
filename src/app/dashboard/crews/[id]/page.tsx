import { getCrewById, listCrewAssignments, listCrewSchedules, getCrewProductivityStats } from "@/lib/actions/workforce";
import { CrewDetailClient } from "./crew-detail-client";

export default async function CrewDetailPage({ params }: { params: { id: string } }) {
  const crew = await getCrewById(params.id);
  if (!crew) {
    return <p className="text-sm text-muted-foreground">Nie znaleziono brygady.</p>;
  }
  const [assignments, schedules, productivityStats] = await Promise.all([
    listCrewAssignments(params.id),
    listCrewSchedules(params.id),
    getCrewProductivityStats(params.id),
  ]);
  return <CrewDetailClient crew={crew} initialAssignments={assignments} initialSchedules={schedules} initialProductivityStats={productivityStats} />;
}
