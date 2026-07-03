import { listRisks } from "@/lib/actions/risks";
import { RyzykaClient } from "./ryzyka-client";

export default async function RyzykaPage({ params }: { params: { id: string } }) {
  const risks = await listRisks(params.id);
  return <RyzykaClient projectId={params.id} initialRisks={risks} />;
}
