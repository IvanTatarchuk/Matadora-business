import { listInspections } from "@/lib/actions/inspections";
import { InspekcjeClient } from "./inspekcje-client";

export default async function InspekcjePage({ params }: { params: { id: string } }) {
  const inspections = await listInspections(params.id);
  return <InspekcjeClient projectId={params.id} initialInspections={inspections} />;
}
