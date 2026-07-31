"use client";

import { useState, useTransition } from "react";
import { Mail, Bell, CheckCircle2, RefreshCw, Clock, AlertCircle, Search, Filter } from "lucide-react";
import { updateEmailPreferences, listEmailQueue, type EmailConfig } from "@/lib/actions/email";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  initialPreferences: any;
};

export function EmailSettingsClient({ initialPreferences }: Props) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [queue, setQueue] = useState<any[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "sent" | "pending" | "failed">("all");

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await updateEmailPreferences({
        emailEnabled: preferences.email_enabled,
        dailyDigest: preferences.daily_digest,
        instantNotifications: preferences.instant_notifications,
        offerUpdates: preferences.offer_updates,
        taskAssignments: preferences.task_assignments,
        paymentUpdates: preferences.payment_updates,
      });
      if (!res.ok) { setError(res.error ?? "Błąd zapisu"); return; }
    });
  }

  function handleRetry(emailId: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/email/retry", {
        method: "POST",
        body: JSON.stringify({ emailId }),
      }).then(r => r.json());
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      // Reload queue
      const queueData = await listEmailQueue();
      setQueue(queueData);
    });
  }

  function loadQueue() {
    startTransition(async () => {
      const queueData = await listEmailQueue();
      setQueue(queueData);
    });
  }

  const filteredQueue = queue.filter((e) => {
    const matchesSearch = !searchQuery || 
      e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(e.to) ? e.to.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())) : e.to.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === "all" || e.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendingEmails = filteredQueue.filter((e) => e.status === "pending");
  const failedEmails = filteredQueue.filter((e) => e.status === "failed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6" />
          Ustawienia email
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Zarządzaj powiadomieniami email i kolejką wysyłania
        </p>
      </div>

      {/* Email Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferencje powiadomień</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Włącz powiadomienia email</p>
              <p className="text-sm text-muted-foreground">Otrzymuj powiadomienia na adres email</p>
            </div>
            <input
              type="checkbox"
              checked={preferences?.email_enabled ?? true}
              onChange={(e) => setPreferences({ ...preferences, email_enabled: e.target.checked })}
              className="h-5 w-5"
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Codzienny podsumowanie</p>
              <p className="text-sm text-muted-foreground">Przegląd wszystkich powiadomień raz dziennie</p>
            </div>
            <input
              type="checkbox"
              checked={preferences?.daily_digest ?? true}
              onChange={(e) => setPreferences({ ...preferences, daily_digest: e.target.checked })}
              className="h-5 w-5"
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Natychmiastowe powiadomienia</p>
              <p className="text-sm text-muted-foreground">Otrzymuj powiadomienia w czasie rzeczywistym</p>
            </div>
            <input
              type="checkbox"
              checked={preferences?.instant_notifications ?? true}
              onChange={(e) => setPreferences({ ...preferences, instant_notifications: e.target.checked })}
              className="h-5 w-5"
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Aktualizacje ofert</p>
              <p className="text-sm text-muted-foreground">Powiadomienia o zmianach w ofertach</p>
            </div>
            <input
              type="checkbox"
              checked={preferences?.offer_updates ?? true}
              onChange={(e) => setPreferences({ ...preferences, offer_updates: e.target.checked })}
              className="h-5 w-5"
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Przypisania zadań</p>
              <p className="text-sm text-muted-foreground">Powiadomienia o nowych zadaniach</p>
            </div>
            <input
              type="checkbox"
              checked={preferences?.task_assignments ?? true}
              onChange={(e) => setPreferences({ ...preferences, task_assignments: e.target.checked })}
              className="h-5 w-5"
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Aktualizacje płatności</p>
              <p className="text-sm text-muted-foreground">Powiadomienia o płatnościach</p>
            </div>
            <input
              type="checkbox"
              checked={preferences?.payment_updates ?? true}
              onChange={(e) => setPreferences({ ...preferences, payment_updates: e.target.checked })}
              className="h-5 w-5"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleSave} disabled={pending}>
            {pending ? "Zapisywanie..." : "Zapisz ustawienia"}
          </Button>
        </CardContent>
      </Card>

      {/* Email Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Kolejka email</CardTitle>
            <Button variant="outline" size="sm" onClick={loadQueue}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Odśwież
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-3 flex-wrap mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "all" | "sent" | "pending" | "failed")}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">Wszystkie statusy</option>
              <option value="sent">Wysłane</option>
              <option value="pending">Oczekujące</option>
              <option value="failed">Z błędami</option>
            </select>
          </div>

          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm">Oczekujące: {pendingEmails.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm">Błędy: {failedEmails.length}</span>
            </div>
          </div>

          {filteredQueue.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak email w kolejce
            </div>
          ) : (
            <div className="space-y-2">
              {filteredQueue.map((email) => (
                <div key={email.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{email.subject}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        email.status === "sent" ? "bg-green-100 text-green-700" :
                        email.status === "pending" ? "bg-orange-100 text-orange-700" :
                        email.status === "failed" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {email.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Do: {Array.isArray(email.to) ? email.to.join(", ") : email.to}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(email.created_at).toLocaleString("pl-PL")}
                    </p>
                  </div>
                  {email.status === "failed" && (
                    <Button variant="outline" size="sm" onClick={() => handleRetry(email.id)}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  {email.status === "sent" && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
