"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Bell, Check, CheckCheck, X, Info, AlertTriangle,
  AlertCircle, CheckCircle2, FileText, ShieldAlert,
  Calendar, CreditCard, Upload, ClipboardCheck,
} from "lucide-react";
import {
  markNotificationRead, markAllNotificationsRead,
  type Notification, type NotificationType,
} from "@/lib/actions/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  const unread = notifications.filter((n) => !n.read_at);
  const read = notifications.filter((n) => n.read_at);

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
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllRead} disabled={pending} variant="outline" className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Oznacz wszystkie jako przeczytane
          </Button>
        )}
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
