"use client";

import { useState, useTransition } from "react";
import { Calendar, Plus, RefreshCw, X, CheckCircle2, Clock, AlertCircle, Trash2, Search, Filter } from "lucide-react";
import {
  createCalendarConnection, toggleCalendarSync, deleteCalendarConnection, triggerSync,
  type CalendarConnection, type CalendarSyncLog, type CalendarProvider,
} from "@/lib/actions/calendar-integration";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  initialConnections: CalendarConnection[];
  initialSyncLogs: CalendarSyncLog[];
  initialStats: {
    totalConnections: number;
    activeConnections: number;
    totalSyncs: number;
    successfulSyncs: number;
  };
};

export function CalendarIntegrationClient({ initialConnections, initialSyncLogs, initialStats }: Props) {
  const [connections, setConnections] = useState<CalendarConnection[]>(initialConnections);
  const [syncLogs, setSyncLogs] = useState<CalendarSyncLog[]>(initialSyncLogs);
  const [stats, setStats] = useState(initialStats);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [connectionForm, setConnectionForm] = useState({
    provider: "google" as CalendarProvider,
    email: "",
    accessToken: "",
    refreshToken: "",
    syncDirection: "bidirectional" as "bidirectional" | "to_platform" | "from_platform",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  function handleCreateConnection() {
    if (!connectionForm.email || !connectionForm.accessToken) {
      setError("Email та access token є обов'язковими");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createCalendarConnection(connectionForm);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      setShowConnectionForm(false);
      setConnectionForm({ provider: "google", email: "", accessToken: "", refreshToken: "", syncDirection: "bidirectional" });
      // Reload connections
      const newConnections = await fetch("/api/calendar-integration/connections").then(r => r.json());
      setConnections(newConnections);
    });
  }

  function handleToggleSync(connectionId: string) {
    setError(null);
    startTransition(async () => {
      const res = await toggleCalendarSync(connectionId);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      // Reload connections
      const newConnections = await fetch("/api/calendar-integration/connections").then(r => r.json());
      setConnections(newConnections);
    });
  }

  function handleDeleteConnection(connectionId: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteCalendarConnection(connectionId);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      // Reload connections
      const newConnections = await fetch("/api/calendar-integration/connections").then(r => r.json());
      setConnections(newConnections);
    });
  }

  function handleTriggerSync(connectionId: string) {
    setError(null);
    startTransition(async () => {
      const res = await triggerSync(connectionId);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      // Reload logs
      const newLogs = await fetch("/api/calendar-integration/sync-logs").then(r => r.json());
      setSyncLogs(newLogs);
    });
  }

  const filteredConnections = connections.filter((c) => {
    const matchesSearch = !searchQuery || c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && c.sync_enabled) ||
      (filterStatus === "inactive" && !c.sync_enabled);
    return matchesSearch && matchesStatus;
  });

  const activeConnections = connections.filter((c) => c.sync_enabled);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Інтеграція календарів
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Підключення Google Calendar, Outlook та інших календарів
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Підключення</p>
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{stats.activeConnections}/{stats.totalConnections}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Синхронізації</p>
              <RefreshCw className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{stats.totalSyncs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Успішні</p>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{stats.successfulSyncs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Останній синк</p>
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold">{syncLogs.length > 0 && syncLogs[0]?.started_at ? new Date(syncLogs[0].started_at).toLocaleDateString("pl-PL") : "-"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setShowConnectionForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Підключити календар
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Шукати календарі..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "inactive")}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Всі статуси</option>
          <option value="active">Активні</option>
          <option value="inactive">Неактивні</option>
        </select>
      </div>

      {/* Connection Form */}
      {showConnectionForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Підключити календар</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowConnectionForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Провайдер</label>
                <select
                  value={connectionForm.provider}
                  onChange={(e) => setConnectionForm({ ...connectionForm, provider: e.target.value as any })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="google">Google Calendar</option>
                  <option value="outlook">Outlook</option>
                  <option value="ical">iCal</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={connectionForm.email} onChange={(e) => setConnectionForm({ ...connectionForm, email: e.target.value })} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Access Token</label>
                <Input value={connectionForm.accessToken} onChange={(e) => setConnectionForm({ ...connectionForm, accessToken: e.target.value })} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Refresh Token (опційно)</label>
                <Input value={connectionForm.refreshToken} onChange={(e) => setConnectionForm({ ...connectionForm, refreshToken: e.target.value })} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Напрямок синхронізації</label>
                <select
                  value={connectionForm.syncDirection}
                  onChange={(e) => setConnectionForm({ ...connectionForm, syncDirection: e.target.value as any })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="bidirectional">Двосторонній</option>
                  <option value="to_platform">В платформу</option>
                  <option value="from_platform">З платформи</option>
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreateConnection} disabled={pending}>{pending ? "Підключення..." : "Підключити"}</Button>
              <Button variant="outline" onClick={() => { setShowConnectionForm(false); setError(null); }}>Скасувати</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connections */}
      <Card>
        <CardHeader>
          <CardTitle>Підключення календарів</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredConnections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Немає підключених календарів
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConnections.map((connection) => (
                <div key={connection.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{connection.provider}</p>
                      {connection.sync_enabled ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-gray-400" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{connection.email}</p>
                    <p className="text-xs text-muted-foreground">{connection.calendar_name || "Default calendar"}</p>
                    {connection.last_sync_at && (
                      <p className="text-xs text-muted-foreground">Останній синк: {new Date(connection.last_sync_at).toLocaleString("pl-PL")}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {connection.sync_enabled && (
                      <Button variant="outline" size="sm" onClick={() => handleTriggerSync(connection.id)}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleToggleSync(connection.id)}>
                      {connection.sync_enabled ? "Вимкнути" : "Увімкнути"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteConnection(connection.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Логи синхронізації</CardTitle>
        </CardHeader>
        <CardContent>
          {syncLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Немає логів синхронізації
            </div>
          ) : (
            <div className="space-y-2">
              {syncLogs.slice(0, 20).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        log.status === "success" ? "bg-green-100 text-green-700" :
                        log.status === "failed" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {log.status}
                      </span>
                      <p className="text-sm font-medium">{log.events_synced} подій синхронізовано</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Створено: {log.events_created}, Оновлено: {log.events_updated}, Видалено: {log.events_deleted}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(log.started_at).toLocaleString("pl-PL")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
