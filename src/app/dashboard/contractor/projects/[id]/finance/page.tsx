import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  getProjectPnL,
  getTimeEntries,
  getExpenses,
} from "@/lib/actions/finance";
import { FinancePanel } from "@/components/execution/finance-panel";
import { ProjectSubnav } from "@/components/execution/project-subnav";
import { CashFlowInsightCard } from "@/components/execution/cashflow-insight-card";

export default async function ProjectFinancePage({
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
    .select("id, title, contractor_id")
    .eq("id", params.id)
    .single();

  if (!project || project.contractor_id !== user.id) notFound();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  const { data: workers } = org
    ? await supabase
        .from("workers")
        .select("*")
        .eq("org_id", org.id)
        .eq("is_active", true)
    : { data: [] };

  const [pnl, timeEntries, expenses] = await Promise.all([
    getProjectPnL(params.id),
    getTimeEntries(params.id),
    getExpenses(params.id),
  ]);

  return (
    <div className="space-y-6 p-6">
      <ProjectSubnav projectId={params.id} role="contractor" />

      <div>
        <h1 className="text-2xl font-bold">{project.title}</h1>
        <p className="text-muted-foreground">Finanse i rentowność projektu</p>
      </div>

      <FinancePanel
        projectId={params.id}
        initialPnL={pnl}
        initialTimeEntries={timeEntries}
        initialExpenses={expenses}
        workers={workers ?? []}
      />

      <CashFlowInsightCard projectId={params.id} />
    </div>
  );
}
