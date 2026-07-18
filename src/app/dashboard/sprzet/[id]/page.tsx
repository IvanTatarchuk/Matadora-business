import { getMyOrganization } from "@/lib/actions/organizations";
import { getEquipmentById, getEquipmentHistory } from "@/lib/actions/equipment";
import { SprzetDetailClient } from "./sprzet-detail-client";

export default async function SprzetDetailPage({ params }: { params: { id: string } }) {
  const myOrg = await getMyOrganization();
  if (!myOrg) {
    return <p className="text-sm text-muted-foreground">Nie znaleziono organizacji.</p>;
  }
  const [equipment, history] = await Promise.all([
    getEquipmentById(params.id),
    getEquipmentHistory(params.id),
  ]);
  if (!equipment) {
    return <p className="text-sm text-muted-foreground">Nie znaleziono sprzętu.</p>;
  }
  return <SprzetDetailClient equipment={equipment} history={history} />;
}
