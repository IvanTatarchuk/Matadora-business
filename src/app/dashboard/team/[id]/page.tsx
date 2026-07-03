import { getMyOrganization } from "@/lib/actions/organizations";
import { getMemberById } from "@/lib/actions/organizations";
import { TeamMemberClient } from "./member-detail-client";

export default async function TeamMemberPage({ params }: { params: { id: string } }) {
  const myOrg = await getMyOrganization();
  if (!myOrg) {
    return <p className="text-sm text-muted-foreground">Організацію не знайдено.</p>;
  }
  const member = await getMemberById(params.id, myOrg.org.id);
  if (!member) {
    return <p className="text-sm text-muted-foreground">Члена команди не знайдено.</p>;
  }
  return <TeamMemberClient member={member} org={myOrg.org} myRole={myOrg.role} />;
}
