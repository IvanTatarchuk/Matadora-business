import { listBoqDocuments } from "@/lib/actions/boq";
import { listGeneratedOffers } from "@/lib/actions/offer-generator";
import { OfertyClient } from "./oferty-client";

export default async function OfertyPage({ params }: { params: { id: string } }) {
  const boqDocuments = await listBoqDocuments(params.id);
  const offers = await listGeneratedOffers(params.id);
  return <OfertyClient projectId={params.id} initialBoqDocuments={boqDocuments} initialOffers={offers} />;
}
