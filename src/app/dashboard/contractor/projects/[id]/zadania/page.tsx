import { listTaskCards } from "@/lib/actions/task-board";
import { ZadaniaClient } from "./zadania-client";

export default async function ZadaniaPage({ params }: { params: { id: string } }) {
  const tasks = await listTaskCards(params.id);
  return <ZadaniaClient projectId={params.id} initialTasks={tasks} />;
}
