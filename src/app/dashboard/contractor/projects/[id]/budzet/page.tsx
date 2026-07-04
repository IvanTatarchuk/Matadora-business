import { listBudgetForecast } from "@/lib/actions/budget-forecast";
import { BudzetClient } from "./budzet-client";

export default async function BudzetPage({ params }: { params: { id: string } }) {
  const year = new Date().getFullYear();
  const forecast = await listBudgetForecast(params.id, year);
  return <BudzetClient projectId={params.id} initialForecast={forecast} initialYear={year} />;
}
