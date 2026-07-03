import { listPurchaseOrders } from "@/lib/actions/purchase-orders";
import { ZamowieniaClient } from "./zamowienia-client";

export default async function ZamowieniaPage({ params }: { params: { id: string } }) {
  const orders = await listPurchaseOrders(params.id);
  return <ZamowieniaClient projectId={params.id} initialOrders={orders} />;
}
