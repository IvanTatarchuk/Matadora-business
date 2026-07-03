"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, X, Mail, ArrowUpRight, ArrowDownLeft,
  CheckCircle2, Clock, AlertTriangle, MessageSquare,
} from "lucide-react";
import {
  createCorrespondence, updateCorrespondenceStatus,
  type Correspondence, type CorrespondenceCategory, type CorrespondenceStatus,
} from "@/lib/actions/correspondence";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const CATEGORY_LABELS: Record<CorrespondenceCategory, string> = {
  general:      "Ogólna",
  rfi_response: "Odpowiedź na RFI",
  claim:        "Roszczenie",
  notice:       "Powiadomienie",
  instruction:  "Polecenie / Instrukcja",
  approval:     "Zatwierdzenie",
  rejection:    "Odrzucenie",
  payment:      "Płatność",
  contract:     "Umowa",
  legal:        "Prawna",
  other:        "Inne",
};

const STATUS_CONFIG: Record<CorrespondenceStatus, { label: string; color: string; icon: React.ElementType }> = {
  open:       { label: "Otwarta",      color: "bg-blue-100 text-blue-700",   icon: Clock },
  responded:  { label: "Odpowiedziano", color: "bg-teal-100 text-teal-700",  icon: CheckCircle2 },
  closed:     { label: "Zamknięta",    color: "bg-slate-100 text-slate-500", icon: CheckCircle2 },
  escalated:  { label: "Eskalacja",    color: "bg-red-100 text-red-700",     icon: AlertTriangle },
};

import React from "react";

export function KorespondencjaClient({ projectId, initialItems }: { projectId: string; initialItems: Correspondence[] }) {
  const [items, setItems] = useState<Correspondence[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    subject: "", direction: "outgoing" as "outgoing" | "incoming",
    correspondent: "", correspondentEmail: "",
    sentDate: new Date().toISOString().slice(0, 10),
    receivedDate: "", category: "general" as CorrespondenceCategory,
    body: "", referenceNumber: "",
    requiresResponse: false, responseDueDate: "",
  });

  const selected = items.find((i) => i.id === selectedId);

  const stats = {
    open: items.filter((i) => i.status === "open").length,
    requiresResponse: items.filter((i) => i.requires_response && i.status === "open").length,
    overdue: items.filter((i) => i.requires_response && i.response_due_date && i.status === "open" && new Date(i.response_due_date) < new Date()).length,
    outgoing: items.filter((i) => i.direction === "outgoing").length,
    incoming: items.filter((i) => i.direction === "incoming").length,
  };

  function handleCreate() {
    if (!form.subject.trim() || !form.correspondent.trim()) { setError("Temat i korespondent są wymagane"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createCorrespondence({
        projectId, subject: form.subject,
        direction: form.direction, correspondent: form.correspondent,
        correspondentEmail: form.correspondentEmail || undefined,
        sentDate: form.sentDate, receivedDate: form.receivedDate || undefined,
        category: form.category, body: form.body || undefined,
        referenceNumber: form.referenceNumber || undefined,
        requiresResponse: form.requiresResponse,
        responseDueDate: form.responseDueDate || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newItem: Correspondence = {
        id: res.id!, project_id: projectId, org_id: "", created_by: null,
        number: items.length + 1,
        number_display: `KOR-${String(items.length + 1).padStart(3, "0")}`,
        subject: form.subject, direction: form.direction,
        correspondent: form.correspondent, correspondent_email: form.correspondentEmail || null,
        sent_date: form.sentDate, received_date: form.receivedDate || null,
        category: form.category, body: form.body || null,
        reference_number: form.referenceNumber || null,
        requires_response: form.requiresResponse,
        response_due_date: form.responseDueDate || null,
        responded_at: null, status: "open",
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setItems((prev) => [newItem, ...prev]);
      setShowForm(false);
      setForm({ subject: "", direction: "outgoing", correspondent: "", correspondentEmail: "", sentDate: new Date().toISOString().slice(0, 10), receivedDate: "", category: "general", body: "", referenceNumber: "", requiresResponse: false, responseDueDate: "" });
    });
  }

  function handleStatusChange(id: string, status: CorrespondenceStatus) {
    startTransition(async () => {
      await updateCorrespondenceStatus(id, projectId, status, status === "responded" ? new Date().toISOString().slice(0, 10) : undefined);
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, status, responded_at: status === "responded" ? new Date().toISOString().slice(0, 10) : i.responded_at } : i));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Korespondencja</h1>
          <p className="text-sm text-muted-foreground">Rejestr korespondencji przychodzącej i wychodzącej — wzorowane na Oracle Aconex Mail Log</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-1 h-4 w-4" />Dodaj korespondencję</Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-5">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Wychodząca</p>
          <p className="text-2xl font-bold flex items-center gap-1"><ArrowUpRight className="h-4 w-4 text-blue-500" />{stats.outgoing}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Przychodząca</p>
          <p className="text-2xl font-bold flex items-center gap-1"><ArrowDownLeft className="h-4 w-4 text-green-500" />{stats.incoming}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Otwarte</p><p className="text-2xl font-bold text-blue-600">{stats.open}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Wymaga odpowiedzi</p><p className="text-2xl font-bold text-orange-600">{stats.requiresResponse}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Przeterminowane</p><p className="text-2xl font-bold text-red-600">{stats.overdue}</p></CardContent></Card>
      </div>

      {/* FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowy wpis korespondencji</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="text-sm font-medium">Temat *</label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="np. Odpowiedź na RFI-007 — zmiana projektu fundamentów" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Kierunek</label>
                <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as "outgoing" | "incoming" })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="outgoing">Wychodząca ↗</option>
                  <option value="incoming">Przychodząca ↙</option>
                </select></div>
              <div><label className="text-sm font-medium">Kategoria</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as CorrespondenceCategory })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Korespondent / Firma *</label>
                <Input value={form.correspondent} onChange={(e) => setForm({ ...form, correspondent: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Email korespondenta</label>
                <Input type="email" value={form.correspondentEmail} onChange={(e) => setForm({ ...form, correspondentEmail: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Data wysłania/otrzymania</label>
                <Input type="date" value={form.sentDate} onChange={(e) => setForm({ ...form, sentDate: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Nr ref. korespondenta</label>
                <Input value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} placeholder="np. KOWAL/2024/143" className="mt-1" /></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Treść / Opis</label>
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" /></div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input type="checkbox" checked={form.requiresResponse} onChange={(e) => setForm({ ...form, requiresResponse: e.target.checked })} className="rounded" />
                  <span className="text-sm font-medium">Wymaga odpowiedzi</span>
                </label>
                {form.requiresResponse && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm">Termin odpowiedzi:</label>
                    <Input type="date" value={form.responseDueDate} onChange={(e) => setForm({ ...form, responseDueDate: e.target.value })} className="max-w-xs" />
                  </div>
                )}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Zapisywanie..." : "Dodaj"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LIST */}
      {items.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
          <Mail className="mx-auto h-12 w-12 opacity-20 mb-3" />
          <p className="font-medium">Brak korespondencji</p>
          <p className="text-sm mt-1">Rejestruj korespondencję z inwestorem, projektantem i podwykonawcami</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const cfg = STATUS_CONFIG[item.status];
            const StatusIcon = cfg.icon;
            const isOverdue = item.requires_response && item.response_due_date && item.status === "open" && new Date(item.response_due_date) < new Date();
            return (
              <Card key={item.id} className={`cursor-pointer hover:shadow-sm transition-shadow ${isOverdue ? "border-red-200" : ""} ${selectedId === item.id ? "ring-1 ring-primary/30" : ""}`}
                onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{item.number_display}</span>
                        {item.direction === "outgoing"
                          ? <span className="flex items-center gap-0.5 text-xs text-blue-600 font-medium"><ArrowUpRight className="h-3 w-3" />Wychodząca</span>
                          : <span className="flex items-center gap-0.5 text-xs text-green-600 font-medium"><ArrowDownLeft className="h-3 w-3" />Przychodząca</span>}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />{cfg.label}
                        </span>
                        <span className="text-xs bg-muted rounded px-1.5 py-0.5">{CATEGORY_LABELS[item.category]}</span>
                        {isOverdue && <span className="text-xs text-red-600 font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Przeterminowana</span>}
                        {item.requires_response && item.status === "open" && !isOverdue && (
                          <span className="text-xs text-orange-600 font-medium flex items-center gap-1"><MessageSquare className="h-3 w-3" />Wymaga odpowiedzi</span>
                        )}
                      </div>
                      <p className="font-semibold truncate">{item.subject}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span>{item.correspondent}</span>
                        <span>{new Date(item.sent_date).toLocaleDateString("pl-PL")}</span>
                        {item.reference_number && <span>Ref: {item.reference_number}</span>}
                        {item.response_due_date && item.status === "open" && (
                          <span className={isOverdue ? "text-red-600 font-medium" : ""}>Odpowiedź do: {new Date(item.response_due_date).toLocaleDateString("pl-PL")}</span>
                        )}
                      </div>
                      {selectedId === item.id && item.body && (
                        <p className="mt-2 text-sm text-muted-foreground border-l-2 border-muted pl-3 whitespace-pre-line">{item.body}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {item.status === "open" && item.requires_response && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(item.id, "responded")} disabled={pending}>
                          <CheckCircle2 className="mr-1 h-3 w-3" />Odpowiedziano
                        </Button>
                      )}
                      {item.status === "open" && (
                        <Button size="sm" variant="ghost" onClick={() => handleStatusChange(item.id, "closed")} disabled={pending}>Zamknij</Button>
                      )}
                      {item.status === "open" && (
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleStatusChange(item.id, "escalated")} disabled={pending}>Eskaluj</Button>
                      )}
                    </div>
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
