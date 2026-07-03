import { listDailyReports } from "@/lib/actions/daily-reports";
import { RaportyClient } from "./raporty-client";

export default async function RaportyPage({ params }: { params: { id: string } }) {
  const reports = await listDailyReports(params.id, 60);
  return <RaportyClient projectId={params.id} initialReports={reports} />;
}
