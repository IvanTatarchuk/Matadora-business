import { getMyOrganization } from "@/lib/actions/organizations";
import { getSubcontractorById } from "@/lib/actions/subcontractors";
import { PodwykonawcaDetailClient } from "./podwykonawca-detail-client";

export default async function PodwykonawcaDetailPage({ params }: { params: { id: string } }) {
  const myOrg = await getMyOrganization();
  if (!myOrg) {
    return <p className="text-sm text-muted-foreground">Nie znaleziono organizacji.</p>;
  }
  const subcontractor = await getSubcontractorById(params.id);
  if (!subcontractor) {
    return <p className="text-sm text-muted-foreground">Nie znaleziono podwykonawcy.</p>;
  }
  return <PodwykonawcaDetailClient subcontractor={subcontractor} />;
}
