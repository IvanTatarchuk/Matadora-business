"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, X, ShieldAlert, ShieldCheck, AlertTriangle,
  CheckCircle2, Clock, XCircle, HardHat,
} from "lucide-react";
import {
  createSafetyObservation, updateSafetyStatus,
  type SafetyObservation, type SafetyObservationType,
  type SafetySeverity, type SafetyStatus,
} from "@/lib/actions/safety";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import React from "react";

const TYPE_LABELS: Record<SafetyObservationType, string> = {
  unsafe_act:           "Niebezpieczne działanie",
  unsafe_condition:     "Niebezpieczny stan",
  near_miss:            "Zdarzenie potencjalnie wypadkowe",
  incident:             "Wypadek / Incydent",
  positive_observation: "Obserwacja pozytywna",
  toolbox_talk:         "Odprawa BHP / Toolbox Talk",
  ppe_violation:        "Naruszenie zasad ŚOI",
};

const SEVERITY_CONFIG: Record<SafetySeverity, { label: string; color: string }> = {
  low:      { label: "Niski",     color: "bg-green-100 text-green-700" },
  medium:   { label: "Średni",    color: "bg-yellow-100 text-yellow-700" },
  high:     { label: "Wysoki",    color: "bg-orange-100 text-orange-700" },
  critical: { label: "Krytyczny", color: "bg-red-100 text-red-700" },
};

const STATUS_CONFIG: Record<SafetyStatus, { label: string; color: string; icon: React.ElementType }> = {
  open:        { label: "Otwarte",       color: "bg-red-100 text-red-700",    icon: AlertTriangle },
  in_progress: { label: "W trakcie",     color: "bg-orange-100 text-orange-700", icon: Clock },
  resolved:    { label: "Rozwiązane",    color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  closed:      { label: "Zamknięte",     color: "bg-slate-100 text-slate-500", icon: XCircle },
};

export function BhpClient({ projectId, initialObservations }: { projectId: string; initialObservations: SafetyObservation[] }) {
  const [obs, setObs] = useState<SafetyObservation[]>(initialObservations);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<SafetyStatus | "all">("all");
  const [filterSeverity, setFilterSeverity] = useState<SafetySeverity | "all">("all");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    observationType: "unsafe_condition" as SafetyObservationType,
    severity: "medium" as SafetySeverity,
    title: "", description: "", locationNote: "",
    observedDate: new Date().toISOString().slice(0, 10),
    reportedByName: "", workersInvolved: "",
    immediateAction: "", correctiveAction: "", dueDate: "",
  });

  const filtered = obs.filter((o) => {
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    const matchSev = filterSeverity === "all" || o.severity === filterSeverity;
    return matchStatus && matchSev;
  });

  const stats = {
    open: obs.filter((o) => o.status === "open").length,
    critical: obs.filter((o) => o.severity === "critical" && o.status !== "closed").length,
    incidents: obs.filter((o) => o.observation_type === "incident").length,
    resolved: obs.filter((o) => o.status === "resolved").length,
    overdue: obs.filter((o) => o.due_date && o.status === "open" && new Date(o.due_date) < new Date()).length,
  };

  function handleCreate() {
    if (!form.title.trim()) { setError("Tytuł jest wymagany"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createSafetyObservation({
        projectId, observationType: form.observationType,
        severity: form.severity, title: form.title,
        description: form.description || undefined,
        locationNote: form.locationNote || undefined,
        observedDate: form.observedDate,
        reportedByName: form.reportedByName || undefined,
        workersInvolved: form.workersInvolved || undefined,
        immediateAction: form.immediateAction || undefined,
        correctiveAction: form.correctiveAction || undefined,
        dueDate: form.dueDate || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newObs: SafetyObservation = {
        id: res.id!, project_id: projectId, org_id: "", created_by: null,
        observation_type: form.observationType, severity: form.severity,
        status: "open", title: form.title,
        description: form.description || null,
        location_note: form.locationNote || null,
        observed_date: form.observedDate,
        reported_by_name: form.reportedByName || null,
        workers_involved: form.workersInvolved || null,
        immediate_action: form.immediateAction || null,
        corrective_action: form.correctiveAction || null,
        due_date: form.dueDate || null,
        resolved_at: null, resolved_by: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setObs((prev) => [newObs, ...prev]);
      setShowForm(false);
      setForm({ observationType: "unsafe_condition", severity: "medium", title: "", description: "", locationNote: "", observedDate: new Date().toISOString().slice(0, 10), reportedByName: "", workersInvolved: "", immediateAction: "", correctiveAction: "", dueDate: "" });
    });
  }

  function handleStatus(id: string, status: SafetyStatus) {
    startTransition(async () => {
      await updateSafetyStatus(id, projectId, status);
      setObs((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">BHP — Obserwacje i Incydenty</h1>
          <p className="text-sm text-muted-foreground">Rejestr obserwacji bezpieczeństwa, zdarzeń potencjalnie wypadkowych i incydentów (Procore Safety)</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-1 h-4 w-4" />Nowa obserwacja</Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-5">
        <Card className={stats.open > 0 ? "border-orange-200" : ""}>
          <CardContent className="p-4"><p className="text-xs text-muted-foreground">Otwarte</p><p className="text-2xl font-bold text-orange-600">{stats.open}</p></CardContent>
        </Card>
        <Card className={stats.critical > 0 ? "border-red-200" : ""}>
          <CardContent className="p-4"><p className="text-xs text-muted-foreground">Krytyczne</p><p className="text-2xl font-bold text-red-600">{stats.critical}</p></CardContent>
        </Card>
        <Card className={stats.incidents > 0 ? "border-red-200" : ""}>
          <CardContent className="p-4"><p className="text-xs text-muted-foreground">Wypadki</p><p className="text-2xl font-bold text-red-700">{stats.incidents}</p></CardContent>
        </Card>
        <Card className={stats.overdue > 0 ? "border-orange-200" : ""}>
          <CardContent className="p-4"><p className="text-xs text-muted-foreground">Po terminie</p><p className="text-2xl font-bold text-orange-600">{stats.overdue}</p></CardContent>
        </Card>
        <Card>
          <CardContent className="p-4"><p className="text-xs text-muted-foreground">Rozwiązane</p><p className="text-2xl font-bold text-green-600">{stats.resolved}</p></CardContent>
        </Card>
      </div>

      {/* FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowa obserwacja BHP</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="text-sm font-medium">Tytuł *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Krótki opis obserwacji" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Typ obserwacji</label>
                <select value={form.observationType} onChange={(e) => setForm({ ...form, observationType: e.target.value as SafetyObservationType })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Poziom ryzyka</label>
                <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as SafetySeverity })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(SEVERITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Data obserwacji</label>
                <Input type="date" value={form.observedDate} onChange={(e) => setForm({ ...form, observedDate: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Lokalizacja</label>
                <Input value={form.locationNote} onChange={(e) => setForm({ ...form, locationNote: e.target.value })} placeholder="np. Strop kondygnacji 2" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Zgłaszający</label>
                <Input value={form.reportedByName} onChange={(e) => setForm({ ...form, reportedByName: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Pracownicy zaangażowani</label>
                <Input value={form.workersInvolved} onChange={(e) => setForm({ ...form, workersInvolved: e.target.value })} className="mt-1" /></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Opis</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" /></div>
              <div><label className="text-sm font-medium">Natychmiastowe działanie</label>
                <textarea value={form.immediateAction} onChange={(e) => setForm({ ...form, immediateAction: e.target.value })} rows={2}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" /></div>
              <div><label className="text-sm font-medium">Działanie korygujące</label>
                <textarea value={form.correctiveAction} onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })} rows={2}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" /></div>
              <div><label className="text-sm font-medium">Termin realizacji</label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-1" /></div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Zapisywanie..." : "Zapisz"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FILTERS */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as SafetyStatus | "all")}
          className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="all">Wszystkie statusy</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value as SafetySeverity | "all")}
          className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="all">Wszystkie poziomy</option>
          {Object.entries(SEVERITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* LIST */}
      {filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
          <HardHat className="mx-auto h-12 w-12 opacity-20 mb-3" />
          <p className="font-medium">Brak obserwacji BHP</p>
          <p className="text-sm mt-1">Rejestruj obserwacje, zdarzenia i incydenty na budowie</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => {
            const statusCfg = STATUS_CONFIG[o.status];
            const StatusIcon = statusCfg.icon;
            const sevCfg = SEVERITY_CONFIG[o.severity];
            const isOverdue = o.due_date && o.status === "open" && new Date(o.due_date) < new Date();
            return (
              <Card key={o.id} className={`${o.severity === "critical" && o.status !== "closed" ? "border-red-200 bg-red-50/10" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${statusCfg.color}`}>
                          <StatusIcon className="h-3 w-3" />{statusCfg.label}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${sevCfg.color}`}>{sevCfg.label}</span>
                        <span className="text-xs bg-muted rounded px-1.5 py-0.5">{TYPE_LABELS[o.observation_type]}</span>
                        {isOverdue && <span className="text-xs text-red-600 font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Po terminie</span>}
                      </div>
                      <p className="font-semibold">{o.title}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span>{new Date(o.observed_date).toLocaleDateString("pl-PL")}</span>
                        {o.location_note && <span>📍 {o.location_note}</span>}
                        {o.reported_by_name && <span>Zgłoszone przez: {o.reported_by_name}</span>}
                        {o.due_date && o.status !== "closed" && <span>Termin: {new Date(o.due_date).toLocaleDateString("pl-PL")}</span>}
                      </div>
                      {o.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{o.description}</p>}
                      {o.immediate_action && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Natychm.:</span> {o.immediate_action}</p>}
                      {o.corrective_action && <p className="text-xs text-muted-foreground"><span className="font-medium">Korygujące:</span> {o.corrective_action}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                      {o.status === "open" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatus(o.id, "in_progress")} disabled={pending}>W trakcie</Button>
                      )}
                      {(o.status === "open" || o.status === "in_progress") && (
                        <Button size="sm" onClick={() => handleStatus(o.id, "resolved")} disabled={pending}>
                          <CheckCircle2 className="mr-1 h-3 w-3" />Rozwiąż
                        </Button>
                      )}
                      {o.status === "resolved" && (
                        <Button size="sm" variant="ghost" onClick={() => handleStatus(o.id, "closed")} disabled={pending}>Zamknij</Button>
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
