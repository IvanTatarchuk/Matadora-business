import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { listPunchItems } from "@/lib/actions/punch";
import { PunchList } from "@/components/execution/punch-list";
import { ProjectSubnav } from "@/components/execution/project-subnav";

export default async function InvestorPunchPage({
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
    .select("id, title, investor_id")
    .eq("id", params.id)
    .single();

  if (!project || project.investor_id !== user.id) notFound();

  const items = await listPunchItems(params.id);

  return (
    <div className="space-y-6 p-6">
      <ProjectSubnav projectId={params.id} role="investor" />

      <div>
        <h1 className="text-2xl font-bold">{project.title}</h1>
        <p className="text-muted-foreground">Дефекти та зауваження</p>
      </div>

      <PunchList
        projectId={params.id}
        initialItems={items}
        canCreate={true}
      />
    </div>
  );
}
