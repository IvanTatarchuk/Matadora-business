"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export type Conversation = {
  id: string;
  project_id: string | null;
  offer_id: string | null;
  title: string | null;
  type: "project" | "offer" | "direct";
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  message_type: "text" | "system" | "file" | "image";
  created_at: string;
  updated_at: string;
};

export type ConversationParticipant = {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
};

export async function createConversation(input: {
  projectId?: string;
  offerId?: string;
  title?: string;
  type: "project" | "offer" | "direct";
  participantIds: string[];
}): Promise<{ ok: boolean; error?: string; conversationId?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const { data: conversation, error: convError } = await db(supabase)
    .from("conversations")
    .insert({
      project_id: input.projectId || null,
      offer_id: input.offerId || null,
      title: input.title || null,
      type: input.type,
    })
    .select("id")
    .single();

  if (convError || !conversation) return { ok: false, error: convError?.message ?? "Błąd tworzenia konwersacji" };

  // Add creator as participant
  const { error: creatorError } = await db(supabase)
    .from("conversation_participants")
    .insert({
      conversation_id: conversation.id,
      user_id: user.id,
    });

  if (creatorError) return { ok: false, error: creatorError.message };

  // Add other participants
  if (input.participantIds.length > 0) {
    const participants = input.participantIds.map((userId) => ({
      conversation_id: conversation.id,
      user_id: userId,
    }));
    const { error: participantsError } = await db(supabase)
      .from("conversation_participants")
      .insert(participants);
    if (participantsError) return { ok: false, error: participantsError.message };
  }

  revalidatePath("/dashboard/messages");
  return { ok: true, conversationId: conversation.id };
}

export async function listConversations(): Promise<Conversation[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("conversations")
    .select("*")
    .in("id", db(supabase)
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
    )
    .order("updated_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as Conversation[];
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as Message[];
}

export async function sendMessage(input: {
  conversationId: string;
  content: string;
  messageType?: "text" | "system" | "file" | "image";
}): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const { data: message, error } = await db(supabase)
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      sender_id: user.id,
      content: input.content,
      message_type: input.messageType || "text",
    })
    .select("id")
    .single();

  if (error || !message) return { ok: false, error: error?.message ?? "Błąd wysyłania wiadomości" };

  revalidatePath("/dashboard/messages");
  return { ok: true, messageId: message.id };
}

export async function markAsRead(conversationId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const { error } = await db(supabase)
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function getUnreadCount(): Promise<number> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data, error } = await db(supabase)
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", user.id);

  if (error || !data) return 0;

  let unreadCount = 0;
  for (const participant of data) {
    const { data: messages } = await db(supabase)
      .from("messages")
      .select("id")
      .eq("conversation_id", participant.conversation_id)
      .gt("created_at", participant.last_read_at || "1970-01-01");
    if (messages) unreadCount += messages.length;
  }

  return unreadCount;
}
