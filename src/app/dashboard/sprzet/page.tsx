import { listEquipment } from "@/lib/actions/equipment";
import { SprzętClient } from "./sprzet-client";

export default async function SprzętPage() {
  const equipment = await listEquipment();
  return <SprzętClient initialEquipment={equipment} />;
}
