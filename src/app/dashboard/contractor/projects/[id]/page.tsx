import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getMyOrganization } from "@/lib/actions/organizations";
import { listCrews } from "@/lib/actions/workforce";
import { listTasks, listUpdates } from "@/lib/actions/execution";
import { ExecutionBoard } from "@/components/execution/execution-board";
import { ProjectSubnav } from "@/components/execution/project-subnav";

export default async function ProjectExecutionPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, address, status, contractor_id, investor_id")
    .eq("id", params.id)
    .single();

  if (!project || project.contractor_id !== user!.id) notFound();

  const myOrg = await getMyOrganization();
  const [tasks, updates, crews] = await Promise.all([
    listTasks(project.id),
    listUpdates(project.id),
    myOrg ? listCrews(myOrg.org.id) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/contractor/projects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Wróć do projektów
      </Link>

      <ProjectSubnav projectId={project.id} role="contractor" />

      <ExecutionBoard
        project={project}
        tasks={tasks}
        updates={updates}
        crews={crews.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
