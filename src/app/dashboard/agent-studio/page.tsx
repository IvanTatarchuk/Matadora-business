import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupportAdmin } from "@/lib/admin";
import { listAgentTasks, listAgents } from "@/lib/actions/agent-tasks";
import { AgentStudioClient } from "./agent-studio-client";

export default async function AgentStudioPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSupportAdmin(user.email)) {
    redirect("/dashboard");
  }

  const [tasks, agents] = await Promise.all([listAgentTasks(), listAgents()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agent Studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kontrolna wieża kolejki zadań agentów AI. Uruchamianie agentów odbywa się w
          desktopowej aplikacji Matadora Agent Studio (Tauri) — ta strona pokazuje status
          zadań w czasie rzeczywistym i pozwala dodać zadanie do kolejki.
        </p>
      </div>
      <AgentStudioClient tasks={tasks} agents={agents} />
    </div>
  );
}
