import { listBackupJobs, listBackupSchedules, listRestoreJobs, getBackupStats } from "@/lib/actions/backups";
import { BackupsClient } from "./backups-client";

export default async function BackupsPage() {
  const backupJobs = await listBackupJobs();
  const schedules = await listBackupSchedules();
  const restoreJobs = await listRestoreJobs();
  const stats = await getBackupStats();
  return <BackupsClient initialBackupJobs={backupJobs} initialSchedules={schedules} initialRestoreJobs={restoreJobs} initialStats={stats} />;
}
