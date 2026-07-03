import { listEquipment, listProjectEquipment } from "@/lib/actions/equipment";
import { ProjektSprzętClient } from "./projekt-sprzet-client";

export default async function ProjektSprzętPage({ params }: { params: { id: string } }) {
  const [allEquipment, assignments] = await Promise.all([
    listEquipment(),
    listProjectEquipment(params.id),
  ]);
  return <ProjektSprzętClient projectId={params.id} allEquipment={allEquipment} initialAssignments={assignments} />;
}
