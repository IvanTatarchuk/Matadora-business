"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Bell, Check, CheckCheck, X, Info, AlertTriangle,
  AlertCircle, CheckCircle2, FileText, ShieldAlert,
  Calendar, CreditCard, Upload, ClipboardCheck, Trash2, Search, Filter,
  MessageSquare as MessageSquareIcon, Star as StarIcon,
} from "lucide-react";
import {
  markNotificationRead, markAllNotificationsRead,
  type Notification, type NotificationType,
} from "@/lib/actions/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const TYPE_CONFIG: Record<NotificationType, { label: string; icon: React.ElementType; color: string }> = {
  offer_sent: { label: "Oferta wysłana", icon: FileText, color: "bg-blue-100 text-blue-700" },
  offer_accepted: { label: "Oferta zaakceptowana", icon: CheckCircle2, color: "bg-green-100 text-green-700" },
  offer_rejected: { label: "Oferta odrzucona", icon: X, color: "bg-red-100 text-red-700" },
  message_received: { label: "Wiadomość", icon: Bell, color: "bg-purple-100 text-purple-700" },
  payment_released: { label: "Płatność zwolniona", icon: CreditCard, color: "bg-green-100 text-green-700" },
  task_assigned: { label: "Zadanie przypisane", icon: ClipboardCheck, color: "bg-blue-100 text-blue-700" },
  project_update: { label: "Aktualizacja projektu", icon: FileText, color: "bg-blue-100 text-blue-700" },
  review_received: { label: "Opinia otrzymana", icon: CheckCircle2, color: "bg-green-100 text-green-700" },
  milestone_ready: { label: "Etap gotowy", icon: CheckCircle2, color: "bg-orange-100 text-orange-700" },
  info: { label: "Informacja", icon: Info, color: "bg-blue-100 text-blue-700" },
  warning: { label: "Ostrzeżenie", icon: AlertTriangle, color: "bg-yellow-100 text-yellow-700" },
  error: { label: "Błąd", icon: AlertCircle, color: "bg-red-100 text-red-700" },
  success: { label: "Sukces", icon: CheckCircle2, color: "bg-green-100 text-green-700" },
  ad_response_received: { label: "Відповідь на оголошення", icon: MessageSquareIcon, color: "bg-blue-100 text-blue-700" },
  ad_response_accepted: { label: "Відповідь прийнято", icon: CheckCircle2, color: "bg-green-100 text-green-700" },
  ad_response_rejected: { label: "Відповідь відхилено", icon: X, color: "bg-red-100 text-red-700" },
  ad_review_received: { label: "Відгук отримано", icon: StarIcon, color: "bg-yellow-100 text-yellow-700" },
  ad_created: { label: "Оголошення створено", icon: FileText, color: "bg-green-100 text-green-700" },
};

export function NotificationsClient({
  initialNotifications,
  initialUnreadCount,
}: {
  initialNotifications: Notification[];
  initialUnreadCount: number;
}) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [pending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<NotificationType | "all">("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    });
  }

  const filteredNotifications = notifications.filter((n) => {
    const matchesSearch = !searchQuery || 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.message && n.message.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === "all" || n.type === filterType;
    const matchesUnread = !showUnreadOnly || !n.read_at;
    return matchesSearch && matchesType && matchesUnread;
  });

  const unread = filteredNotifications.filter((n) => !n.read_at);
  const read = filteredNotifications.filter((n) => n.read_at);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Powiadomienia</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} nieprzeczytanych` : "Wszystkie przeczytane"}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllRead} disabled={pending} variant="outline" className="gap-2">
              <CheckCheck className="h-4 w-4" />
              Oznacz wszystkie jako przeczytane
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj powiadomień..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as NotificationType | "all")}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Wszystkie typy</option>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <Button
          variant={showUnreadOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowUnreadOnly(!showUnreadOnly)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Tylko nieprzeczytane
        </Button>
      </div>

      {/* Unread */}
      {unread.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Nieprzeczytane</h2>
          <div className="space-y-2">
            {unread.map((n) => {
              const cfg = TYPE_CONFIG[n.type];
              const Icon = cfg.icon;
              return (
                <Card key={n.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${cfg.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted">
                            {cfg.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(n.created_at).toLocaleString("pl-PL")}
                          </span>
                        </div>
                        <p className="font-medium">{n.title}</p>
                        {n.message && <p className="text-sm text-muted-foreground mt-1">{n.message}</p>}
                        {n.link && (
                          <Link href={n.link} className="text-sm text-primary hover:underline mt-2 inline-block">
                            Przejdź →
                          </Link>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkRead(n.id)}
                        disabled={pending}
                        className="shrink-0"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Read */}
      {read.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Przeczytane</h2>
          <div className="space-y-2">
            {read.map((n) => {
              const cfg = TYPE_CONFIG[n.type];
              const Icon = cfg.icon;
              return (
                <Card key={n.id} className="opacity-70">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${cfg.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted">
                            {cfg.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(n.created_at).toLocaleString("pl-PL")}
                          </span>
                        </div>
                        <p className="font-medium">{n.title}</p>
                        {n.message && <p className="text-sm text-muted-foreground mt-1">{n.message}</p>}
                        {n.link && (
                          <Link href={n.link} className="text-sm text-primary hover:underline mt-2 inline-block">
                            Przejdź →
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {notifications.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Bell className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Brak powiadomień</p>
            <p className="text-sm mt-1">Będziesz otrzymywać powiadomienia o ważnych wydarzeniach w projektach.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
