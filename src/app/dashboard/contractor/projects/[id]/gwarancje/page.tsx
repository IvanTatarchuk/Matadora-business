import { listWarranties } from "@/lib/actions/warranty";
import { GwarancjeClient } from "./gwarancje-client";

export default async function GwarancjePage({ params }: { params: { id: string } }) {
  const warranties = await listWarranties(params.id);
  return <GwarancjeClient projectId={params.id} initialWarranties={warranties} />;
}
