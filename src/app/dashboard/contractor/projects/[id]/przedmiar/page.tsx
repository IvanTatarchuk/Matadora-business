import { listBoqDocuments, getBoqItems } from "@/lib/actions/boq";
import { listPricebookItems } from "@/lib/actions/pricebook";
import { PrzedmiarClient } from "./przedmiar-client";

export default async function PrzedmiarPage({ params }: { params: { id: string } }) {
  const [documents, pricebook] = await Promise.all([
    listBoqDocuments(params.id),
    listPricebookItems(),
  ]);

  const firstDoc = documents[0];
  const items = firstDoc ? await getBoqItems(firstDoc.id) : [];

  return (
    <PrzedmiarClient
      projectId={params.id}
      initialDocuments={documents}
      initialItems={items}
      pricebook={pricebook}
    />
  );
}
