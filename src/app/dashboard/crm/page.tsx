import { listLeads } from "@/lib/actions/crm";
import { CRMClient } from "./crm-client";

export default async function CRMPage() {
  const leads = await listLeads();
  return <CRMClient initialLeads={leads} />;
}
