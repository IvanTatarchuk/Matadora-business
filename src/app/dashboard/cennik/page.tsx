import { listPricebookItems } from "@/lib/actions/pricebook";
import { CennikClient } from "./cennik-client";

export default async function CennikPage() {
  const items = await listPricebookItems();
  return <CennikClient initialItems={items} />;
}
