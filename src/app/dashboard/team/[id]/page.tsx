import { getMyOrganization } from "@/lib/actions/organizations";
import { getMemberById } from "@/lib/actions/organizations";
import { TeamMemberClient } from "./member-detail-client";

export default async function TeamMemberPage({ params }: { params: { id: string } }) {
  const myOrg = await getMyOrganization();
  if (!myOrg) {
    return <p className="text-sm text-muted-foreground">Nie znaleziono organizacji.</p>;
  }
  const member = await getMemberById(params.id, myOrg.org.id);
  if (!member) {
    return <p className="text-sm text-muted-foreground">Nie znaleziono członka zespołu.</p>;
  }
  return <TeamMemberClient member={member} org={myOrg.org} myRole={myOrg.role} />;
}
