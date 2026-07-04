import { listApiKeys, listApiWebhooks, listApiLogs, getApiStats } from "@/lib/actions/api";
import { ApiClient } from "./api-client";

export default async function ApiPage() {
  const keys = await listApiKeys();
  const webhooks = await listApiWebhooks();
  const logs = await listApiLogs();
  const stats = await getApiStats();
  return <ApiClient initialKeys={keys} initialWebhooks={webhooks} initialLogs={logs} initialStats={stats} />;
}
