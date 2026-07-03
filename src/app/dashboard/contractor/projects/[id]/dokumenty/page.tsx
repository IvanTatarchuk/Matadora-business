import { listProjectDocuments } from "@/lib/actions/documents";
import { DokumentyClient } from "./dokumenty-client";

export default async function DocumentyPage({ params }: { params: { id: string } }) {
  const docs = await listProjectDocuments(params.id);
  return <DokumentyClient projectId={params.id} initialDocs={docs} />;
}
