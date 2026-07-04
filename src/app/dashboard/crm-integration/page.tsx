import { listCRMConnections, listCRMSyncLogs, getCRMStats } from "@/lib/actions/crm-integration";
import { CRMIntegrationClient } from "./crm-integration-client";

export default async function CRMIntegrationPage() {
  const connections = await listCRMConnections();
  const syncLogs = await listCRMSyncLogs();
  const stats = await getCRMStats();
  return <CRMIntegrationClient initialConnections={connections} initialSyncLogs={syncLogs} initialStats={stats} />;
}
