import { listCalendarConnections, listCalendarSyncLogs, getCalendarStats } from "@/lib/actions/calendar-integration";
import { CalendarIntegrationClient } from "./calendar-integration-client";

export default async function CalendarIntegrationPage() {
  const connections = await listCalendarConnections();
  const syncLogs = await listCalendarSyncLogs();
  const stats = await getCalendarStats();
  return <CalendarIntegrationClient initialConnections={connections} initialSyncLogs={syncLogs} initialStats={stats} />;
}
