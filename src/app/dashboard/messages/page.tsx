import { listConversations, getUnreadCount } from "@/lib/actions/messenger";
import { createClient } from "@/lib/supabase/server";
import { MessengerClient } from "./messenger-client";

export default async function MessagesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const conversations = await listConversations();
  const unreadCount = await getUnreadCount();
  return (
    <MessengerClient
      initialConversations={conversations}
      initialUnreadCount={unreadCount}
      currentUserId={user?.id ?? null}
    />
  );
}
