import { listSubcontractors, listProjectContracts } from "@/lib/actions/subcontractors";
import { ProjektPodwykonawcyClient } from "./projekt-podwykonawcy-client";

export default async function ProjektPodwykonawcyPage({ params }: { params: { id: string } }) {
  const [allSubs, contracts] = await Promise.all([
    listSubcontractors(),
    listProjectContracts(params.id),
  ]);
  return <ProjektPodwykonawcyClient projectId={params.id} allSubcontractors={allSubs} initialContracts={contracts} />;
}
