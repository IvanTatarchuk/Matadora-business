import { getWorkerById } from "@/lib/actions/workforce";
import { listCrews, listWorkerHistory } from "@/lib/actions/workforce";
import { WorkerDetailClient } from "./worker-detail-client";

export default async function WorkerDetailPage({ params }: { params: { id: string } }) {
  const worker = await getWorkerById(params.id);
  if (!worker) {
    return <p className="text-sm text-muted-foreground">Nie znaleziono pracownika.</p>;
  }
  const [crews, history] = await Promise.all([
    listCrews(worker.org_id),
    listWorkerHistory(params.id),
  ]);
  return <WorkerDetailClient worker={worker} crews={crews} initialHistory={history} />;
}
