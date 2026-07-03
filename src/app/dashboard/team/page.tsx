import { createClient } from "@/lib/supabase/server";
import { getMyOrganization, getMembers } from "@/lib/actions/organizations";
import { TeamManager } from "@/components/team/team-manager";

export default async function TeamPage() {
  const myOrg = await getMyOrganization();
  if (!myOrg) {
    return (
      <p className="text-sm text-muted-foreground">Nie znaleziono organizacji.</p>
    );
  }

  const supabase = createClient();
  const [members, { data: invites }] = await Promise.all([
    getMembers(myOrg.org.id),
    supabase
      .from("organization_invitations")
      .select("id, email, role, status, token, created_at")
      .eq("org_id", myOrg.org.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Zespół i organizacja</h1>
        <p className="text-sm text-muted-foreground">
          Zarządzaj firmą {myOrg.org.name}: dane firmy, członkowie i zaproszenia.
        </p>
      </div>
      <TeamManager
        org={myOrg.org}
        myRole={myOrg.role}
        members={members}
        invites={invites ?? []}
      />
    </div>
  );
}
