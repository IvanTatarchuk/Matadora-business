import { listDispatchForWeek } from "@/lib/actions/dispatch";
import { PlanowanieClient } from "./planowanie-client";

function getWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

export default async function PlanowaniePage() {
  const { start, end } = getWeekRange();
  const assignments = await listDispatchForWeek(start, end);
  return <PlanowanieClient initialAssignments={assignments} initialStart={start} />;
}
