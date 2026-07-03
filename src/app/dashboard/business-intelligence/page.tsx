import { listBIDashboards, listBIReports, listBIDataSources, getBIStats } from "@/lib/actions/business-intelligence";
import { BusinessIntelligenceClient } from "./business-intelligence-client";

export default async function BusinessIntelligencePage() {
  const dashboards = await listBIDashboards();
  const reports = await listBIReports();
  const dataSources = await listBIDataSources();
  const stats = await getBIStats();
  return <BusinessIntelligenceClient initialDashboards={dashboards} initialReports={reports} initialDataSources={dataSources} initialStats={stats} />;
}
