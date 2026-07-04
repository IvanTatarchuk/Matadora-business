import { getMyOrganization } from "@/lib/actions/organizations";
import { getEquipmentById, getEquipmentHistory } from "@/lib/actions/equipment";
import { SprzetDetailClient } from "./sprzet-detail-client";

export default async function SprzetDetailPage({ params }: { params: { id: string } }) {
  const myOrg = await getMyOrganization();
  if (!myOrg) {
    return <p className="text-sm text-muted-foreground">Організацію не знайдено.</p>;
  }
  const [equipment, history] = await Promise.all([
    getEquipmentById(params.id),
    getEquipmentHistory(params.id),
  ]);
  if (!equipment) {
    return <p className="text-sm text-muted-foreground">Обладнання не знайдено.</p>;
  }
  return <SprzetDetailClient equipment={equipment} history={history} />;
}
