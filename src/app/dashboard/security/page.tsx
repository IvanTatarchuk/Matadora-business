import { listAuditLogs, listSecurityEvents, listUserSessions, getSecurityStats } from "@/lib/actions/security";
import { SecurityClient } from "./security-client";

export default async function SecurityPage() {
  const auditLogs = await listAuditLogs();
  const securityEvents = await listSecurityEvents();
  const sessions = await listUserSessions();
  const stats = await getSecurityStats();
  return <SecurityClient initialAuditLogs={auditLogs} initialSecurityEvents={securityEvents} initialSessions={sessions} initialStats={stats} />;
}
