"use client";

import { useState, useTransition } from "react";
import { Key, Webhook, Activity, Plus, Copy, X, RefreshCw, CheckCircle2, AlertCircle, Clock, Search, Filter } from "lucide-react";
import {
  createApiKey, revokeApiKey, createApiWebhook, toggleApiWebhook,
  type ApiKey, type ApiWebhook, type ApiScope,
} from "@/lib/actions/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  initialKeys: ApiKey[];
  initialWebhooks: ApiWebhook[];
  initialLogs: any[];
  initialStats: {
    totalKeys: number;
    activeKeys: number;
    totalWebhooks: number;
    activeWebhooks: number;
    totalRequests: number;
    avgResponseTime: number;
  };
};

const AVAILABLE_SCOPES: ApiScope[] = [
  "projects:read", "projects:write",
  "offers:read", "offers:write",
  "inventory:read", "inventory:write",
  "reports:read",
];

export function ApiClient({ initialKeys, initialWebhooks, initialLogs, initialStats }: Props) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [webhooks, setWebhooks] = useState<ApiWebhook[]>(initialWebhooks);
  const [logs, setLogs] = useState(initialLogs);
  const [stats, setStats] = useState(initialStats);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [showKeyForm, setShowKeyForm] = useState(false);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  const [keyForm, setKeyForm] = useState({
    name: "",
    scopes: [] as ApiScope[],
    expiresAt: "",
  });

  const [webhookForm, setWebhookForm] = useState({
    name: "",
    url: "",
    events: [] as string[],
  });

  function handleCreateKey() {
    if (!keyForm.name || keyForm.scopes.length === 0) {
      setError("Nazwa i scope są wymagane");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createApiKey(keyForm);
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      setNewKey(res.key || null);
      setShowKeyForm(false);
      setKeyForm({ name: "", scopes: [], expiresAt: "" });
      // Reload keys
      const newKeys = await fetch("/api/api/keys").then(r => r.json());
      setKeys(newKeys);
    });
  }

  function handleToggleScope(scope: ApiScope) {
    if (keyForm.scopes.includes(scope)) {
      setKeyForm({ ...keyForm, scopes: keyForm.scopes.filter((s) => s !== scope) });
    } else {
      setKeyForm({ ...keyForm, scopes: [...keyForm.scopes, scope] });
    }
  }

  function handleCreateWebhook() {
    if (!webhookForm.name || !webhookForm.url || webhookForm.events.length === 0) {
      setError("Nazwa, URL i zdarzenia są wymagane");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createApiWebhook(webhookForm);
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      setNewWebhookSecret(res.secret || null);
      setShowWebhookForm(false);
      setWebhookForm({ name: "", url: "", events: [] });
      // Reload webhooks
      const newWebhooks = await fetch("/api/api/webhooks").then(r => r.json());
      setWebhooks(newWebhooks);
    });
  }

  function handleToggleWebhook(webhookId: string) {
    setError(null);
    startTransition(async () => {
      const res = await toggleApiWebhook(webhookId);
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      // Reload webhooks
      const newWebhooks = await fetch("/api/api/webhooks").then(r => r.json());
      setWebhooks(newWebhooks);
    });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  const filteredKeys = keys.filter((k) => {
    const matchesSearch = !searchQuery || k.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && k.is_active) ||
      (filterStatus === "inactive" && !k.is_active);
    return matchesSearch && matchesStatus;
  });

  const filteredWebhooks = webhooks.filter((w) => {
    const matchesSearch = !searchQuery || w.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && w.is_active) ||
      (filterStatus === "inactive" && !w.is_active);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Key className="h-6 w-6" />
          API i integracje
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Zarządzanie kluczami API, webhookami i dziennikami żądań
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Klucze API</p>
              <Key className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{stats.activeKeys}/{stats.totalKeys}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Webhooki</p>
              <Webhook className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{stats.activeWebhooks}/{stats.totalWebhooks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Żądania</p>
              <Activity className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{stats.totalRequests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Średni czas</p>
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold">{stats.avgResponseTime.toFixed(0)}ms</p>
          </CardContent>
        </Card>
      </div>

      {/* New Key Alert */}
      {newKey && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Utworzono nowy klucz API</p>
                <p className="text-sm text-muted-foreground">Zapisz go teraz - nie będzie już dostępny</p>
                <code className="mt-2 block bg-muted p-2 rounded text-sm">{newKey}</code>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => copyToClipboard(newKey)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Kopiuj
                </Button>
                <Button size="sm" variant="outline" onClick={() => setNewKey(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Webhook Secret Alert */}
      {newWebhookSecret && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Utworzono nowy webhook</p>
                <p className="text-sm text-muted-foreground">Secret do weryfikacji podpisu</p>
                <code className="mt-2 block bg-muted p-2 rounded text-sm">{newWebhookSecret}</code>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => copyToClipboard(newWebhookSecret)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Kopiuj
                </Button>
                <Button size="sm" variant="outline" onClick={() => setNewWebhookSecret(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setShowKeyForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nowy klucz API
        </Button>
        <Button variant="outline" onClick={() => setShowWebhookForm(true)}>
          <Webhook className="h-4 w-4 mr-2" />
          Nowy webhook
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj..."
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

      {/* API Key Form */}
      {showKeyForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Utwórz klucz API</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowKeyForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nazwa</label>
              <Input value={keyForm.name} onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Scopes</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {AVAILABLE_SCOPES.map((scope) => (
                  <label key={scope} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={keyForm.scopes.includes(scope)}
                      onChange={() => handleToggleScope(scope)}
                    />
                    {scope}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Data wygaśnięcia (opcjonalnie)</label>
              <Input type="date" value={keyForm.expiresAt} onChange={(e) => setKeyForm({ ...keyForm, expiresAt: e.target.value })} className="mt-1" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreateKey} disabled={pending}>{pending ? "Tworzenie..." : "Utwórz"}</Button>
              <Button variant="outline" onClick={() => { setShowKeyForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook Form */}
      {showWebhookForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Utwórz webhook</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowWebhookForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nazwa</label>
              <Input value={webhookForm.name} onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">URL</label>
              <Input value={webhookForm.url} onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Zdarzenia</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {["project.created", "project.updated", "offer.accepted", "offer.rejected", "payment.completed", "task.completed"].map((event) => (
                  <label key={event} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={webhookForm.events.includes(event)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setWebhookForm({ ...webhookForm, events: [...webhookForm.events, event] });
                        } else {
                          setWebhookForm({ ...webhookForm, events: webhookForm.events.filter((e) => e !== event) });
                        }
                      }}
                    />
                    {event}
                  </label>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreateWebhook} disabled={pending}>{pending ? "Tworzenie..." : "Utwórz"}</Button>
              <Button variant="outline" onClick={() => { setShowWebhookForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>Klucze API</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak kluczy API
            </div>
          ) : (
            <div className="space-y-2">
              {filteredKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${key.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                    <div>
                      <p className="font-medium">{key.name}</p>
                      <p className="text-sm text-muted-foreground">{key.key_prefix}***</p>
                      <p className="text-xs text-muted-foreground">{key.scopes.join(", ")}</p>
                    </div>
                  </div>
                  {key.is_active && (
                    <Button variant="outline" size="sm" onClick={() => revokeApiKey(key.id)}>
                      Odwołaj
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle>Webhooki</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredWebhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak webhooków
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWebhooks.map((webhook) => (
                <div key={webhook.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{webhook.name}</p>
                      {webhook.is_active ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-gray-400" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{webhook.url}</p>
                    <p className="text-xs text-muted-foreground">{webhook.events.join(", ")}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleToggleWebhook(webhook.id)}>
                    {webhook.is_active ? "Wyłącz" : "Włącz"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Dzienniki żądań</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak dzienników
            </div>
          ) : (
            <div className="space-y-2">
              {logs.slice(0, 20).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        log.status_code >= 200 && log.status_code < 300 ? "bg-green-100 text-green-700" :
                        log.status_code >= 400 ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {log.status_code}
                      </span>
                      <p className="font-medium">{log.method} {log.path}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("pl-PL")}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{log.response_time_ms}ms</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
