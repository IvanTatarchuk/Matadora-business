import { listCalendarEvents } from "@/lib/actions/calendar";
import { KalendarzClient } from "./kalendarz-client";

export default async function KalendarzPage({ params }: { params: { id: string } }) {
  const now = new Date();
  const events = await listCalendarEvents(params.id, now.getFullYear(), now.getMonth() + 1);
  return (
    <KalendarzClient
      projectId={params.id}
      initialEvents={events}
      initialYear={now.getFullYear()}
      initialMonth={now.getMonth() + 1}
    />
  );
}
