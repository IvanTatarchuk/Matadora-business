import { listInvestorMessages, listInvestorApprovals } from "@/lib/actions/investor-portal";
import { PortalInwestoraClient } from "./portal-inwestora-client";

export default async function PortalInwestoraPage({ params }: { params: { id: string } }) {
  const [messages, approvals] = await Promise.all([
    listInvestorMessages(params.id),
    listInvestorApprovals(params.id),
  ]);
  return <PortalInwestoraClient projectId={params.id} initialMessages={messages} initialApprovals={approvals} />;
}
