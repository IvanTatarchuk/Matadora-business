"use client";

import { useState, useTransition } from "react";
import { Users, Plus, RefreshCw, X, CheckCircle2, Clock, AlertCircle, Trash2, Search, Filter } from "lucide-react";
import {
  createCRMConnection, toggleCRMSync, deleteCRMConnection, triggerCRMSync,
  type CRMConnection, type CRMSyncLog, type CRMProvider,
} from "@/lib/actions/crm-integration";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  initialConnections: CRMConnection[];
  initialSyncLogs: CRMSyncLog[];
  initialStats: {
    totalConnections: number;
    activeConnections: number;
    totalSyncs: number;
    successfulSyncs: number;
  };
};

export function CRMIntegrationClient({ initialConnections, initialSyncLogs, initialStats }: Props) {
  const [connections, setConnections] = useState<CRMConnection[]>(initialConnections);
  const [syncLogs, setSyncLogs] = useState<CRMSyncLog[]>(initialSyncLogs);
  const [stats, setStats] = useState(initialStats);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [connectionForm, setConnectionForm] = useState({
    provider: "hubspot" as CRMProvider,
    apiKey: "",
    apiUrl: "",
    syncDirection: "bidirectional" as "bidirectional" | "to_crm" | "from_crm",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  function handleCreateConnection() {
    if (!connectionForm.apiKey) {
      setError("Klucz API jest wymagany");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createCRMConnection(connectionForm);
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      setShowConnectionForm(false);
      setConnectionForm({ provider: "hubspot", apiKey: "", apiUrl: "", syncDirection: "bidirectional" });
      // Reload connections
      const newConnections = await fetch("/api/crm-integration/connections").then(r => r.json());
      setConnections(newConnections);
    });
  }

  function handleToggleSync(connectionId: string) {
    setError(null);
    startTransition(async () => {
      const res = await toggleCRMSync(connectionId);
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      // Reload connections
      const newConnections = await fetch("/api/crm-integration/connections").then(r => r.json());
      setConnections(newConnections);
    });
  }

  function handleDeleteConnection(connectionId: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteCRMConnection(connectionId);
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      // Reload connections
      const newConnections = await fetch("/api/crm-integration/connections").then(r => r.json());
      setConnections(newConnections);
    });
  }

  function handleTriggerSync(connectionId: string) {
    setError(null);
    startTransition(async () => {
      const res = await triggerCRMSync(connectionId);
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      // Reload logs
      const newLogs = await fetch("/api/crm-integration/sync-logs").then(r => r.json());
      setSyncLogs(newLogs);
    });
  }

  const filteredConnections = connections.filter((c) => {
    const matchesSearch = !searchQuery || c.provider.toLowerCase().includes(searchQuery.toLowerCase());
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
          <Users className="h-6 w-6" />
          Integracja CRM
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Połączenia z HubSpot, Salesforce, Pipedrive i innymi systemami CRM
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Połączenia</p>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{stats.activeConnections}/{stats.totalConnections}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Synchronizacje</p>
              <RefreshCw className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{stats.totalSyncs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Udane</p>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{stats.successfulSyncs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Ostatnia synchronizacja</p>
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
          Podłącz CRM
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj CRM..."
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
          <option value="all">Wszystkie statusy</option>
          <option value="active">Aktywne</option>
          <option value="inactive">Nieaktywne</option>
        </select>
      </div>

      {/* Connection Form */}
      {showConnectionForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Podłącz CRM</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowConnectionForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">System CRM</label>
                <select
                  value={connectionForm.provider}
                  onChange={(e) => setConnectionForm({ ...connectionForm, provider: e.target.value as any })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="hubspot">HubSpot</option>
                  <option value="salesforce">Salesforce</option>
                  <option value="pipedrive">Pipedrive</option>
                  <option value="zoho">Zoho CRM</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">API Key</label>
                <Input value={connectionForm.apiKey} onChange={(e) => setConnectionForm({ ...connectionForm, apiKey: e.target.value })} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">API URL (opcjonalnie)</label>
                <Input value={connectionForm.apiUrl} onChange={(e) => setConnectionForm({ ...connectionForm, apiUrl: e.target.value })} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Kierunek synchronizacji</label>
                <select
                  value={connectionForm.syncDirection}
                  onChange={(e) => setConnectionForm({ ...connectionForm, syncDirection: e.target.value as any })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="bidirectional">Двосторонній</option>
                  <option value="to_crm">В CRM</option>
                  <option value="from_crm">З CRM</option>
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
          <CardTitle>Підключення CRM</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredConnections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Немає підключених CRM
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
                    <p className="text-sm text-muted-foreground">{connection.sync_direction}</p>
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
                      <p className="text-sm font-medium">{log.entity_type}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Синхронізовано: {log.records_synced}, Створено: {log.records_created}, Оновлено: {log.records_updated}
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
