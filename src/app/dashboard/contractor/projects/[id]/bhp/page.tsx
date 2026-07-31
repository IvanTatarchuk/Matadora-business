import { createClient } from "@/lib/supabase/server";
import { listSafetyObservations } from "@/lib/actions/safety";
import { BhpClient } from "./bhp-client";

export default async function BhpPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const observations = await listSafetyObservations(params.id);

  const resolverIds = Array.from(
    new Set(observations.map((o) => o.resolved_by).filter((id): id is string => !!id))
  );
  const resolverNames: Record<string, string> = {};
  if (resolverIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles").select("id, full_name").in("id", resolverIds);
    for (const p of profiles ?? []) resolverNames[p.id] = p.full_name ?? "";
  }

  return (
    <BhpClient
      projectId={params.id}
      initialObservations={observations}
      currentUserId={user?.id ?? ""}
      resolverNames={resolverNames}
    />
  );
}
