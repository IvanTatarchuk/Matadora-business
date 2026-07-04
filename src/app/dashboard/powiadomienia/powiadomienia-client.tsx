"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Bell, CheckCheck, Info, AlertTriangle, CheckCircle2, XCircle,
  FileText, ClipboardCheck, ShieldAlert, DollarSign, GraduationCap,
  Shield, Upload, Receipt, MessageSquare as MessageSquareIcon, Star as StarIcon,
} from "lucide-react";
import {
  markNotificationRead, markAllNotificationsRead,
  type Notification, type NotificationType,
} from "@/lib/actions/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import React from "react";

const TYPE_CONFIG: Record<NotificationType, { label: string; icon: React.ElementType; color: string }> = {
  offer_sent: { label: "Oferta wysłana", icon: FileText, color: "text-blue-600" },
  offer_accepted: { label: "Oferta zaakceptowana", icon: CheckCircle2, color: "text-green-600" },
  offer_rejected: { label: "Oferta odrzucona", icon: XCircle, color: "text-red-600" },
  message_received: { label: "Wiadomość", icon: Bell, color: "text-purple-600" },
  payment_released: { label: "Płatność zwolniona", icon: Receipt, color: "text-green-600" },
  task_assigned: { label: "Zadanie przypisane", icon: ClipboardCheck, color: "text-blue-600" },
  project_update: { label: "Aktualizacja projektu", icon: FileText, color: "text-blue-600" },
  review_received: { label: "Opinia otrzymana", icon: CheckCircle2, color: "text-green-600" },
  milestone_ready: { label: "Etap gotowy", icon: CheckCircle2, color: "text-orange-600" },
  info: { label: "Informacja", icon: Info, color: "text-blue-500" },
  warning: { label: "Ostrzeżenie", icon: AlertTriangle, color: "text-yellow-500" },
  error: { label: "Błąд", icon: XCircle, color: "text-red-500" },
  success: { label: "Sukces", icon: CheckCircle2, color: "text-green-500" },
  ad_response_received: { label: "Відповідь на оголошення", icon: MessageSquareIcon, color: "text-blue-600" },
  ad_response_accepted: { label: "Відповідь прийнято", icon: CheckCircle2, color: "text-green-600" },
  ad_response_rejected: { label: "Відповідь відхилено", icon: XCircle, color: "text-red-600" },
  ad_review_received: { label: "Відгук отримано", icon: StarIcon, color: "text-yellow-500" },
  ad_created: { label: "Оголошення створено", icon: FileText, color: "text-green-600" },
};

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "przed chwilą";
  if (mins < 60) return `${mins} min temu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h temu`;
  const days = Math.floor(hours / 24);
  return `${days} dni temu`;
}

export function PowiadomieniaClient({ initialNotifications }: { initialNotifications: Notification[] }) {
  const [notifs, setNotifs] = useState<Notification[]>(initialNotifications);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifs.filter((n) => !n.read_at).length;
  const displayed = filter === "unread" ? notifs.filter((n) => !n.read_at) : notifs;

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationRead(id);
      setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead();
      setNotifs((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />Powiadomienia
            {unreadCount > 0 && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5">{unreadCount}</span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">{notifs.length} powiadomień łącznie</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md border overflow-hidden text-sm">
            <button onClick={() => setFilter("all")} className={`px-3 py-1.5 ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>Wszystkie</button>
            <button onClick={() => setFilter("unread")} className={`px-3 py-1.5 ${filter === "unread" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>Nieprzeczytane ({unreadCount})</button>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={pending}>
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" />Oznacz wszystkie
            </Button>
          )}
        </div>
      </div>

      {displayed.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Bell className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">{filter === "unread" ? "Brak nieprzeczytanych powiadomień" : "Brak powiadomień"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {displayed.map((n) => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info;
            const Icon = cfg.icon;
            const Wrapper = n.link ? Link : "div";
            const wrapperProps = n.link ? { href: n.link } : {};
            return (
              <Card key={n.id} className={`transition-colors ${!n.read_at ? "bg-blue-50/40 border-blue-100" : ""} hover:bg-muted/30`}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* @ts-expect-error dynamic wrapper */}
                      <Wrapper {...wrapperProps} className="block" onClick={() => !n.read_at && handleMarkRead(n.id)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!n.read_at ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                            {n.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(n.created_at)}</span>
                            {!n.read_at && <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />}
                          </div>
                        </div>
                      </Wrapper>
                    </div>
                    {!n.read_at && (
                      <button onClick={() => handleMarkRead(n.id)} disabled={pending}
                        className="shrink-0 text-muted-foreground hover:text-foreground" title="Oznacz jako przeczytane">
                        <CheckCheck className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
