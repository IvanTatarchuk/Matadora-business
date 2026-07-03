import { listRetentions } from "@/lib/actions/retention";
import { KaucjaClient } from "./kaucja-client";

export default async function KaucjaPage({ params }: { params: { id: string } }) {
  const retentions = await listRetentions(params.id);
  return <KaucjaClient projectId={params.id} initialRetentions={retentions} />;
}
