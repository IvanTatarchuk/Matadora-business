import { getMyOrganization } from "@/lib/actions/organizations";
import { listWorkers, listCrews } from "@/lib/actions/workforce";
import { CrewsManager } from "@/components/workforce/crews-manager";

export default async function CrewsPage() {
  const myOrg = await getMyOrganization();
  if (!myOrg) {
    return (
      <p className="text-sm text-muted-foreground">Nie znaleziono organizacji.</p>
    );
  }
  const [workers, crews] = await Promise.all([
    listWorkers(myOrg.org.id),
    listCrews(myOrg.org.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Brygady</h1>
        <p className="text-sm text-muted-foreground">
          Grupuj pracowników w brygady i wyznaczaj brygadzistę. Brygady można przypisywać do projektów.
        </p>
      </div>
      <CrewsManager orgId={myOrg.org.id} workers={workers} crews={crews} />
    </div>
  );
}
