"use client";

import { useState, useTransition, useEffect } from "react";
import {
  MessageSquare, Plus, Send, Search, MoreVertical, Users,
  Clock, CheckCircle2, XCircle, Paperclip,
} from "lucide-react";
import {
  createConversation, sendMessage, markAsRead,
  type Conversation, type Message,
} from "@/lib/actions/messenger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  initialConversations: Conversation[];
  initialUnreadCount: number;
};

export function MessengerClient({ initialConversations, initialUnreadCount }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);

  const filteredConversations = conversations.filter((c) =>
    c.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  async function loadMessages(conversationId: string) {
    // This would typically use realtime subscription
    // For now, we'll just load initial messages
    startTransition(async () => {
      const res = await fetch(`/api/messages/${conversationId}`).then(r => r.json());
      setMessages(res.messages ?? []);
      await markAsRead(conversationId);
      setUnreadCount(Math.max(0, unreadCount - 1));
    });
  }

  function handleSendMessage() {
    if (!newMessage.trim() || !selectedConversation) return;
    setError(null);
    startTransition(async () => {
      const res = await sendMessage({
        conversationId: selectedConversation.id,
        content: newMessage,
      });
      if (!res.ok) {
        setError(res.error ?? "Błąd wysyłania");
        return;
      }
      setNewMessage("");
      loadMessages(selectedConversation.id);
    });
  }

  function handleCreateConversation() {
    // Simplified - would normally show modal to select participants
    setError("Funkcja tworzenia konwersacji w budowie");
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Conversations List */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Wiadomości
              {unreadCount > 0 && (
                <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={handleCreateConversation}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Input
            placeholder="Szukaj..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-2"
          />
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Brak konwersacji
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedConversation?.id === conv.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{conv.title || "Konwersacja"}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(conv.updated_at).toLocaleDateString("pl-PL")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${
                      conv.type === "project" ? "bg-blue-500" :
                      conv.type === "offer" ? "bg-green-500" :
                      "bg-purple-500"
                    }`} />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{selectedConversation.title || "Konwersacja"}</CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {selectedConversation.type === "project" ? "Projekt" :
                     selectedConversation.type === "offer" ? "Oferta" :
                     "Bezpośrednia"}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Rozpocznij konwersację
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === "current" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.sender_id === "current"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(msg.created_at).toLocaleTimeString("pl-PL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            <CardContent className="pt-3 border-t">
              <div className="flex gap-2">
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Napisz wiadomość..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={pending || !newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="mx-auto h-12 w-12 opacity-20 mb-3" />
              <p className="font-medium">Wybierz konwersację</p>
              <p className="text-sm mt-1">lub utwórz nową, aby rozpocząć czat</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
