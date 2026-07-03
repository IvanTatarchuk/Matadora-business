import { listMeetings } from "@/lib/actions/meetings";
import { SpotkaniakClient } from "./spotkania-client";

export default async function SpotkaniaPage({ params }: { params: { id: string } }) {
  const meetings = await listMeetings(params.id);
  return <SpotkaniakClient projectId={params.id} initialMeetings={meetings} />;
}
