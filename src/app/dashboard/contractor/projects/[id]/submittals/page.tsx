import { listSubmittals } from "@/lib/actions/submittals";
import { SubmittalsClient } from "./submittals-client";

export default async function SubmittalsPage({ params }: { params: { id: string } }) {
  const submittals = await listSubmittals(params.id);
  return <SubmittalsClient projectId={params.id} initialSubmittals={submittals} />;
}
