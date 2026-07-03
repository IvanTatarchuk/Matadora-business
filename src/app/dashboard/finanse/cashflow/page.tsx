import { listCashflow } from "@/lib/actions/cashflow";
import { CashflowClient } from "./cashflow-client";

export default async function CashflowPage() {
  const year = new Date().getFullYear();
  const entries = await listCashflow(year);
  return <CashflowClient initialEntries={entries} initialYear={year} />;
}
