import { listInvoices } from "@/lib/actions/invoices";
import { FakturyClient } from "./faktury-client";

export default async function FakturyPage() {
  const invoices = await listInvoices();
  return <FakturyClient initialInvoices={invoices} />;
}
