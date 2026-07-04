import { listSignatures, listSignatureRequests } from "@/lib/actions/esignatures";
import { EsignaturesClient } from "./esignatures-client";

export default async function EsignaturesPage() {
  const signatures = await listSignatures("", "");
  const requests = await listSignatureRequests();
  return <EsignaturesClient initialSignatures={signatures} initialRequests={requests} />;
}
