import { listCashflow } from "@/lib/actions/cashflow";
import { CashPositionCard } from "@/components/execution/cash-position-card";
import { CashflowClient } from "./cashflow-client";

export default async function CashflowPage() {
  const year = new Date().getFullYear();
  const entries = await listCashflow(year);
  return (
    <div className="space-y-6">
      <CashPositionCard />
      <CashflowClient initialEntries={entries} initialYear={year} />
    </div>
  );
}
