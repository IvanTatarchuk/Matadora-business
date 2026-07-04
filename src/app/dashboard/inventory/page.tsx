import { listInventoryItems, getLowStockItems, listInventoryTransactions } from "@/lib/actions/inventory";
import { InventoryClient } from "./inventory-client";

export default async function InventoryPage() {
  const items = await listInventoryItems();
  const lowStock = await getLowStockItems();
  const transactions = await listInventoryTransactions();
  return <InventoryClient initialItems={items} initialLowStock={lowStock} initialTransactions={transactions} />;
}
