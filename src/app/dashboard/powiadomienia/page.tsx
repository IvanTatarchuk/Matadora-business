import { listNotifications } from "@/lib/actions/notifications";
import { PowiadomieniaClient } from "./powiadomienia-client";

export default async function PowiadomieniaPage() {
  const notifications = await listNotifications(100);
  return <PowiadomieniaClient initialNotifications={notifications} />;
}
