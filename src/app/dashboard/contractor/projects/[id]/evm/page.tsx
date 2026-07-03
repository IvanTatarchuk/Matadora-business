import { listEvmSnapshots } from "@/lib/actions/evm";
import { EvmClient } from "./evm-client";

export default async function EvmPage({ params }: { params: { id: string } }) {
  const snapshots = await listEvmSnapshots(params.id);
  return <EvmClient projectId={params.id} initialSnapshots={snapshots} />;
}
