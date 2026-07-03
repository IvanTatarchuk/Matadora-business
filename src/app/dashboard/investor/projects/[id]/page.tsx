import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { listTasks, listUpdates } from "@/lib/actions/execution";
import { getProjectPnL } from "@/lib/actions/finance";
import { InvestorView } from "@/components/execution/investor-view";

export default async function InvestorProjectPage({
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
    .select("id, title, address, status, investor_id")
    .eq("id", params.id)
    .single();

  if (!project || project.investor_id !== user.id) notFound();

  const [tasks, updates, pnl] = await Promise.all([
    listTasks(project.id),
    listUpdates(project.id),
    getProjectPnL(project.id),
  ]);

  return (
    <div className="p-6">
      <InvestorView
        project={project}
        tasks={tasks}
        updates={updates}
        budget={pnl.budget}
        totalCost={pnl.totalCost}
      />
    </div>
  );
}
