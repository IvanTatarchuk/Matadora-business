import { listConversations, getUnreadCount } from "@/lib/actions/messenger";
import { MessengerClient } from "./messenger-client";

export default async function MessagesPage() {
  const conversations = await listConversations();
  const unreadCount = await getUnreadCount();
  return <MessengerClient initialConversations={conversations} initialUnreadCount={unreadCount} />;
}
