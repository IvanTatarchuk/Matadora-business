import { listAllOrgWarranties } from "@/lib/actions/warranty";
import { GlobalGwarancjeClient } from "./global-gwarancje-client";

export default async function GlobalGwarancjePage() {
  const warranties = await listAllOrgWarranties();
  return <GlobalGwarancjeClient initialWarranties={warranties} />;
}
