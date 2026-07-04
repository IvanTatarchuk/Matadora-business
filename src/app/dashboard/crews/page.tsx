import { getMyOrganization } from "@/lib/actions/organizations";
import { listWorkers, listCrews } from "@/lib/actions/workforce";
import { CrewsManager } from "@/components/workforce/crews-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Plus } from "lucide-react";
import Link from "next/link";

export default async function CrewsPage() {
  const myOrg = await getMyOrganization();
  
  if (!myOrg) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Бригади</h1>
          <p className="text-sm text-muted-foreground">
            Групуйте працівників у бригади та призначайте бригадира
          </p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="font-medium mb-2">Організацію не знайдено</p>
            <p className="text-sm text-muted-foreground mb-4">
              Для роботи з бригадами потрібно створити організацію
            </p>
            <Button asChild>
              <Link href="/dashboard/team">
                <Plus className="h-4 w-4 mr-2" />
                Створити організацію
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const [workers, crews] = await Promise.all([
    listWorkers(myOrg.org.id),
    listCrews(myOrg.org.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Бригади</h1>
        <p className="text-sm text-muted-foreground">
          Групуйте працівників у бригади та призначайте бригадира. Бригади можна призначати до проектів.
        </p>
      </div>
      <CrewsManager orgId={myOrg.org.id} workers={workers} crews={crews} />
    </div>
  );
}
