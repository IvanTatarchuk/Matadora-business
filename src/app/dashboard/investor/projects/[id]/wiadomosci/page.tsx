import { listInvestorMessages, listInvestorApprovals } from "@/lib/actions/investor-portal";
import { InvestorPortalClient } from "./investor-portal-client";

export default async function InvestorWiadomosciPage({ params }: { params: { id: string } }) {
  const [messages, approvals] = await Promise.all([
    listInvestorMessages(params.id),
    listInvestorApprovals(params.id),
  ]);
  return (
    <InvestorPortalClient
      projectId={params.id}
      initialMessages={messages}
      initialApprovals={approvals}
    />
  );
}
