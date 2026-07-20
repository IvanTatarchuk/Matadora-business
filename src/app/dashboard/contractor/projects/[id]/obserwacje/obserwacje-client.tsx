"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, Eye, X, Trash2, CheckCircle2, AlertTriangle, Clock,
} from "lucide-react";
import {
  createObservation, updateObservationStatus, deleteObservation,
  type ProjectObservation, type ObservationType, type ObservationPriority,
  type ObservationStatus,
} from "@/lib/actions/observations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const TYPE_LABELS: Record<ObservationType, string> = {
  safety:        "BHP / Bezpieczeństwo",
  quality:       "Jakość",
  environmental: "Środowisko",
  commissioning: "Odbiory / Rozruch",
  work:          "Wykonawstwo",
  other:         "Inne",
};

const PRIORITY_CONFIG: Record<ObservationPriority, { label: string; color: string }> = {
  low:    { label: "Niski",    color: "bg-slate-100 text-slate-600" },
  medium: { label: "Średni",   color: "bg-blue-100 text-blue-700" },
  high:   { label: "Wysoki",   color: "bg-orange-100 text-orange-700" },
  urgent: { label: "Pilny",    color: "bg-red-100 text-red-700" },
};

const STATUS_CONFIG: Record<ObservationStatus, { label: string; color: string }> = {
  initiated:    { label: "Zgłoszona",       color: "bg-blue-100 text-blue-700" },
  in_progress:  { label: "W trakcie",       color: "bg-yellow-100 text-yellow-700" },
  ready_review: { label: "Do weryfikacji",  color: "bg-purple-100 text-purple-700" },
  closed:       { label: "Zamknięta",       color: "bg-green-100 text-green-700" },
  void:         { label: "Anulowana",       color: "bg-slate-100 text-slate-500" },
};

const OPEN_STATUSES: ObservationStatus[] = ["initiated", "in_progress", "ready_review"];

function isOverdue(o: ProjectObservation): boolean {
  if (!o.due_date || !OPEN_STATUSES.includes(o.status)) return false;
  return new Date(o.due_date) < new Date(new Date().toDateString());
}

export function ObserwacjeClient({
  projectId,
  initialObservations,
}: {
  projectId: string;
  initialObservations: ProjectObservation[];
}) {
  const [items, setItems] = useState<ProjectObservation[]>(initialObservations);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<ObservationStatus | "all" | "open">("open");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", description: "", type: "safety" as ObservationType,
    priority: "medium" as ObservationPriority, assigneeName: "",
    location: "", trade: "", observedBy: "", dueDate: "",
  });

  const openCount = items.filter((o) => OPEN_STATUSES.includes(o.status)).length;
  const urgentCount = items.filter((o) => OPEN_STATUSES.includes(o.status) && o.priority === "urgent").length;
  const overdueCount = items.filter(isOverdue).length;
  const closedCount = items.filter((o) => o.status === "closed").length;

  const filtered =
    filter === "all" ? items
    : filter === "open" ? items.filter((o) => OPEN_STATUSES.includes(o.status))
    : items.filter((o) => o.status === filter);

  function resetForm() {
    setForm({
      title: "", description: "", type: "safety", priority: "medium",
      assigneeName: "", location: "", trade: "", observedBy: "", dueDate: "",
    });
  }

  function handleAdd() {
    if (!form.title.trim()) { setError("Tytuł jest wymagany"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createObservation({
        projectId,
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        priority: form.priority,
        assigneeName: form.assigneeName || undefined,
        location: form.location || undefined,
        trade: form.trade || undefined,
        observedBy: form.observedBy || undefined,
        dueDate: form.dueDate || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const now = new Date().toISOString();
      const created: ProjectObservation = {
        id: res.id!, project_id: projectId, org_id: "", created_by: null,
        number: res.number ?? items.length + 1, title: form.title,
        description: form.description || null, type: form.type, priority: form.priority,
        status: "initiated", assignee_name: form.assigneeName || null, assignee_id: null,
        location: form.location || null, trade: form.trade || null,
        observed_by: form.observedBy || null, due_date: form.dueDate || null,
        resolved_at: null, closed_at: null, resolution_note: null,
        created_at: now, updated_at: now,
      };
      setItems((prev) => [created, ...prev]);
      setShowForm(false);
      resetForm();
    });
  }

  function handleStatus(id: string, status: ObservationStatus) {
    startTransition(async () => {
      await updateObservationStatus(id, projectId, status);
      setItems((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteObservation(id, projectId);
      setItems((prev) => prev.filter((o) => o.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Obserwacje jakości i BHP</h1>
          <p className="text-sm text-muted-foreground">
            Proaktywne zgłoszenia z terenu — jakość, bezpieczeństwo, środowisko i odbiory
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="mr-1 h-4 w-4" /> Nowa obserwacja
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Otwarte</p>
            <p className="text-2xl font-bold">{openCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pilne</p>
            <p className="text-2xl font-bold text-red-600">{urgentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Po terminie</p>
            <p className="text-2xl font-bold text-orange-600">{overdueCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Zamknięte</p>
            <p className="text-2xl font-bold text-green-600">{closedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowa obserwacja</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Tytuł *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="np. Brak zabezpieczenia krawędzi stropu na 3. piętrze" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Typ</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ObservationType })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Priorytet</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as ObservationPriority })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Przydzielono do</label>
                <Input value={form.assigneeName} onChange={(e) => setForm({ ...form, assigneeName: e.target.value })}
                  placeholder="Osoba / brygada odpowiedzialna" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Zgłaszający</label>
                <Input value={form.observedBy} onChange={(e) => setForm({ ...form, observedBy: e.target.value })}
                  placeholder="np. Kierownik BHP" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Lokalizacja</label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="np. Budynek A, poziom -1" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Branża / roboty</label>
                <Input value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })}
                  placeholder="np. Roboty żelbetowe" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Termin usunięcia</label>
                <Input type="date" value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Opis</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2} placeholder="Szczegóły obserwacji i zalecane działania naprawcze..."
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={pending}>{pending ? "Zapisywanie..." : "Dodaj obserwację"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FILTER */}
      <div className="flex gap-1 border-b flex-wrap">
        {([
          ["open", `Otwarte (${openCount})`],
          ["all", `Wszystkie (${items.length})`],
          ["initiated", STATUS_CONFIG.initiated.label],
          ["in_progress", STATUS_CONFIG.in_progress.label],
          ["ready_review", STATUS_CONFIG.ready_review.label],
          ["closed", STATUS_CONFIG.closed.label],
          ["void", STATUS_CONFIG.void.label],
        ] as [ObservationStatus | "all" | "open", string][]).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${filter === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* LIST */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Eye className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Brak obserwacji</p>
            <p className="text-sm mt-1">Zgłaszaj obserwacje jakości i BHP, aby zapobiegać usterkom i wypadkom</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => {
            const statusCfg = STATUS_CONFIG[o.status];
            const prioCfg = PRIORITY_CONFIG[o.priority];
            const overdue = isOverdue(o);
            return (
              <Card key={o.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="text-center min-w-[48px] shrink-0">
                      <p className="text-xs text-muted-foreground">Nr</p>
                      <p className="text-lg font-bold">{o.number}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusCfg.color}`}>{statusCfg.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${prioCfg.color}`}>{prioCfg.label}</span>
                        <span className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{TYPE_LABELS[o.type]}</span>
                        {overdue && (
                          <span className="text-xs bg-red-50 text-red-700 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Po terminie
                          </span>
                        )}
                      </div>
                      <p className="font-semibold">{o.title}</p>
                      {o.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{o.description}</p>}
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        {o.assignee_name && <span>Przydzielono: {o.assignee_name}</span>}
                        {o.location && <span>Lokalizacja: {o.location}</span>}
                        {o.trade && <span>Branża: {o.trade}</span>}
                        {o.observed_by && <span>Zgłaszający: {o.observed_by}</span>}
                        {o.due_date && <span className={overdue ? "text-red-600 font-medium" : ""}>Termin: {new Date(o.due_date).toLocaleDateString("pl-PL")}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {o.status === "initiated" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatus(o.id, "in_progress")} disabled={pending}>Rozpocznij</Button>
                      )}
                      {o.status === "in_progress" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatus(o.id, "ready_review")} disabled={pending}>Do weryfikacji</Button>
                      )}
                      {o.status === "ready_review" && (
                        <Button size="sm" variant="outline" className="text-green-600 border-green-300" onClick={() => handleStatus(o.id, "closed")} disabled={pending}>
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Zamknij
                        </Button>
                      )}
                      {OPEN_STATUSES.includes(o.status) && (
                        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => handleStatus(o.id, "void")} disabled={pending}>
                          <AlertTriangle className="mr-1 h-3 w-3" /> Anuluj
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(o.id)} disabled={pending}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
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
