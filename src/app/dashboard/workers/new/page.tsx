import { getMyOrganization } from "@/lib/actions/organizations";
import { listCrews } from "@/lib/actions/workforce";
import { WorkerCreateClient } from "./worker-create-client";

export default async function WorkerCreatePage() {
  const myOrg = await getMyOrganization();
  if (!myOrg) {
    return <p className="text-sm text-muted-foreground">Nie znaleziono organizacji.</p>;
  }
  const crews = await listCrews(myOrg.org.id);
  return <WorkerCreateClient orgId={myOrg.org.id} crews={crews} />;
}
