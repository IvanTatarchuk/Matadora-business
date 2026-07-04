import { listGeneratedOffers } from "@/lib/actions/offer-generator";
import { PorownanieClient } from "./porownanie-client";

export default async function PorownaniePage({ params }: { params: { id: string } }) {
  const offers = await listGeneratedOffers(params.id);
  return <PorownanieClient projectId={params.id} initialOffers={offers} />;
}
