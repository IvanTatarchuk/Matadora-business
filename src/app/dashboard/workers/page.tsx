import { getMyOrganization } from "@/lib/actions/organizations";
import { listWorkers } from "@/lib/actions/workforce";
import { WorkersManager } from "@/components/workforce/workers-manager";

export default async function WorkersPage() {
  const myOrg = await getMyOrganization();
  if (!myOrg) {
    return (
      <p className="text-sm text-muted-foreground">Nie znaleziono organizacji.</p>
    );
  }
  const workers = await listWorkers(myOrg.org.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pracownicy</h1>
        <p className="text-sm text-muted-foreground">
          Zarządzaj pracownikami firmy {myOrg.org.name}. Pracownicy mogą być grupowani w brygady i przypisywani do projektów.
        </p>
      </div>
      <WorkersManager orgId={myOrg.org.id} initialWorkers={workers} />
    </div>
  );
}
