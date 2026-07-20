import { listCashflow, getCashPosition } from "@/lib/actions/cashflow";
import { CashflowClient } from "./cashflow-client";
import { CashPositionCard } from "./cash-position-card";

export default async function CashflowPage() {
  const year = new Date().getFullYear();
  const [entries, cashPosition] = await Promise.all([
    listCashflow(year),
    getCashPosition(),
  ]);
  return (
    <div className="space-y-6">
      <CashPositionCard data={cashPosition} />
      <CashflowClient initialEntries={entries} initialYear={year} />
    </div>
  );
}
