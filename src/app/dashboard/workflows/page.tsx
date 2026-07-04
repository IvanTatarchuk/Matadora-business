import { listWorkflowDefinitions, listWorkflowExecutions, getWorkflowStats } from "@/lib/actions/workflows";
import { WorkflowsClient } from "./workflows-client";

export default async function WorkflowsPage() {
  const workflows = await listWorkflowDefinitions();
  const executions = await listWorkflowExecutions();
  const stats = await getWorkflowStats();
  return <WorkflowsClient initialWorkflows={workflows} initialExecutions={executions} initialStats={stats} />;
}
