import { listChangeOrders } from "@/lib/actions/change-orders";
import { AneksyClient } from "./aneksy-client";

export default async function AneksyPage({ params }: { params: { id: string } }) {
  const orders = await listChangeOrders(params.id);
  return <AneksyClient projectId={params.id} initialOrders={orders} />;
}
