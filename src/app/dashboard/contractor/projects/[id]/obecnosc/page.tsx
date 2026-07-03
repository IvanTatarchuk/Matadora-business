import { createClient } from "@/lib/supabase/server";
import { listAttendanceByDate, getAttendanceMonthlySummary } from "@/lib/actions/attendance";
import { ObeznoscClient } from "./obecnosc-client";

export default async function ObeznoscPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: { user } } = await supabase.auth.getUser();
  const { data: member } = user
    ? await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single()
    : { data: null };

  const workers = member
    ? (await supabase.from("workers").select("id, full_name, specialty, hourly_rate, is_active").eq("org_id", member.org_id).eq("is_active", true).order("full_name")).data ?? []
    : [];

  const todayRecords = await listAttendanceByDate(params.id, today);
  const now = new Date();
  const summary = await getAttendanceMonthlySummary(params.id, now.getFullYear(), now.getMonth() + 1);

  return (
    <ObeznoscClient
      projectId={params.id}
      workers={workers}
      initialRecords={todayRecords}
      monthlySummary={summary}
      today={today}
    />
  );
}
