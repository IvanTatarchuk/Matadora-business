import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { listTasks } from "@/lib/actions/execution";
import { GanttView } from "@/components/execution/gantt-view";
import { ProjectSubnav } from "@/components/execution/project-subnav";

export default async function GanttPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, contractor_id, created_at")
    .eq("id", params.id)
    .single();

  if (!project || project.contractor_id !== user.id) notFound();

  const tasks = await listTasks(params.id);

  return (
    <div className="space-y-6 p-6">
      <ProjectSubnav projectId={params.id} role="contractor" />

      <div>
        <h1 className="text-2xl font-bold">{project.title}</h1>
        <p className="text-muted-foreground">Harmonogram Gantta</p>
      </div>

      <GanttView tasks={tasks} projectStart={project.created_at} />
    </div>
  );
}
