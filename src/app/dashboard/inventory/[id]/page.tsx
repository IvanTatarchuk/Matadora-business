import { getMyOrganization } from "@/lib/actions/organizations";
import { getInventoryItemById, getInventoryTransactions } from "@/lib/actions/inventory";
import { InventoryDetailClient } from "./inventory-detail-client";

export default async function InventoryDetailPage({ params }: { params: { id: string } }) {
  const myOrg = await getMyOrganization();
  if (!myOrg) {
    return <p className="text-sm text-muted-foreground">Nie znaleziono organizacji.</p>;
  }
  const [item, transactions] = await Promise.all([
    getInventoryItemById(params.id),
    getInventoryTransactions(params.id),
  ]);
  if (!item) {
    return <p className="text-sm text-muted-foreground">Nie znaleziono pozycji.</p>;
  }
  return <InventoryDetailClient item={item} transactions={transactions} />;
}
