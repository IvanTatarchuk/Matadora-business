import { listBudgetForecast } from "@/lib/actions/budget-forecast";
import { getProjectTimeline } from "@/lib/actions/analytics";
import { BudzetClient } from "./budzet-client";

export default async function BudzetPage({ params }: { params: { id: string } }) {
  const year = new Date().getFullYear();
  const [forecast, timeline] = await Promise.all([
    listBudgetForecast(params.id, year),
    getProjectTimeline(params.id),
  ]);
  return <BudzetClient projectId={params.id} initialForecast={forecast} initialYear={year} costTimeline={timeline} />;
}
