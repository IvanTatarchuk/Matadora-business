import { listPaymentMethods, listPaymentTransactions, getPaymentStats } from "@/lib/actions/payments";
import { PaymentsClient } from "./payments-client";

export default async function PaymentsPage() {
  const methods = await listPaymentMethods();
  const transactions = await listPaymentTransactions();
  const stats = await getPaymentStats();
  return <PaymentsClient initialMethods={methods} initialTransactions={transactions} initialStats={stats} />;
}
