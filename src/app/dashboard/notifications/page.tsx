import { listNotifications, countUnreadNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage() {
  const notifications = await listNotifications(50);
  const unreadCount = await countUnreadNotifications();
  return <NotificationsClient initialNotifications={notifications} initialUnreadCount={unreadCount} />;
}
