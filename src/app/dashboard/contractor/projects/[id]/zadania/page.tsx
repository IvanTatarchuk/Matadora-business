import { listTaskCards } from "@/lib/actions/task-board";
import { listProjectTasks, listProjectUpdates } from "@/lib/actions/project-execution";
import { ZadaniaClient } from "./zadania-client";

export default async function ZadaniaPage({ params }: { params: { id: string } }) {
  const tasks = await listTaskCards(params.id);
  const projectTasks = await listProjectTasks(params.id);
  const updates = await listProjectUpdates(params.id);
  return <ZadaniaClient projectId={params.id} initialTasks={tasks} initialProjectTasks={projectTasks} initialUpdates={updates} />;
}
