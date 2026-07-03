import { listCorrespondence } from "@/lib/actions/correspondence";
import { KorespondencjaClient } from "./korespondencja-client";

export default async function KorespondencjaPage({ params }: { params: { id: string } }) {
  const items = await listCorrespondence(params.id);
  return <KorespondencjaClient projectId={params.id} initialItems={items} />;
}
