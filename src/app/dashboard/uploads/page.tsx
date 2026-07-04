import { getMyOrganization } from "@/lib/actions/organizations";
import { listFileUploads, getFileUploadStats } from "@/lib/actions/file-uploads";
import { UploadsClient } from "./uploads-client";

export default async function UploadsPage() {
  const myOrg = await getMyOrganization();
  if (!myOrg) {
    return <p className="text-sm text-muted-foreground">Організацію не знайдено.</p>;
  }
  const [uploads, stats] = await Promise.all([
    listFileUploads(myOrg.org.id),
    getFileUploadStats(myOrg.org.id),
  ]);
  return <UploadsClient orgId={myOrg.org.id} initialUploads={uploads} initialStats={stats} />;
}
