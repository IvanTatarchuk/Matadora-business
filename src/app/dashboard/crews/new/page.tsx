import { getMyOrganization } from "@/lib/actions/organizations";
import { listWorkers } from "@/lib/actions/workforce";
import { CrewCreateClient } from "./crew-create-client";

export default async function CrewCreatePage() {
  const myOrg = await getMyOrganization();
  if (!myOrg) {
    return <p className="text-sm text-muted-foreground">Nie znaleziono organizacji.</p>;
  }
  const workers = await listWorkers(myOrg.org.id);
  return <CrewCreateClient orgId={myOrg.org.id} workers={workers} />;
}
