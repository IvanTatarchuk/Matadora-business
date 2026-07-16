import { getCrewById, listCrewAssignments, listCrewSchedules, listCrewProductivity, getCrewProductivityStats } from "@/lib/actions/workforce";
import { listExpiringCertificationsForWorkers } from "@/lib/actions/worker-certifications";
import { CrewDetailClient } from "./crew-detail-client";

export default async function CrewDetailPage({ params }: { params: { id: string } }) {
  const crew = await getCrewById(params.id);
  if (!crew) {
    return <p className="text-sm text-muted-foreground">Бригаду не знайдено.</p>;
  }
  const [assignments, schedules, productivityEntries, productivityStats, expiringCertifications] = await Promise.all([
    listCrewAssignments(params.id),
    listCrewSchedules(params.id),
    listCrewProductivity(params.id),
    getCrewProductivityStats(params.id),
    listExpiringCertificationsForWorkers(crew.memberIds),
  ]);
  return (
    <CrewDetailClient
      crew={crew}
      initialAssignments={assignments}
      initialSchedules={schedules}
      initialProductivityEntries={productivityEntries}
      initialProductivityStats={productivityStats}
      expiringCertifications={expiringCertifications}
    />
  );
}
