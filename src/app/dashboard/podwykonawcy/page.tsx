import { listSubcontractors } from "@/lib/actions/subcontractors";
import { PodwykonawcyClient } from "./podwykonawcy-client";

export default async function PodwykonawcyPage() {
  const subcontractors = await listSubcontractors();
  return <PodwykonawcyClient initialSubcontractors={subcontractors} />;
}
