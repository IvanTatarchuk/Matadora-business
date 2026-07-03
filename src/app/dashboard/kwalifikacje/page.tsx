import { listOrgCertifications, listExpiringCertifications } from "@/lib/actions/worker-certifications";
import { listWorkersForCurrentOrg } from "@/lib/actions/workers-auto";
import { KwalifikacjeClient } from "./kwalifikacje-client";

export default async function KwalifikacjePage() {
  const [certifications, expiring, workers] = await Promise.all([
    listOrgCertifications(),
    listExpiringCertifications(60),
    listWorkersForCurrentOrg(),
  ]);
  return (
    <KwalifikacjeClient
      initialCertifications={certifications}
      expiringCertifications={expiring}
      workers={workers}
    />
  );
}
