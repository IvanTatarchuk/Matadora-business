"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, MessageSquare, Clock, CheckCircle2,
  XCircle, AlertTriangle, ChevronDown, ChevronUp, X,
  Send, Check, Archive, Calendar,
} from "lucide-react";
import {
  createRFI, openRFI, answerRFI, closeRFI, voidRFI, deleteRFI,
  type RFI, type RFIDiscipline, type RFIPriority,
} from "@/lib/actions/rfis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const DISCIPLINE_LABELS: Record<RFIDiscipline, string> = {
  general:                "Ogólne",
  architektura:           "Architektura",
  konstrukcja:            "Konstrukcja",
  instalacje_elektryczne: "Instalacje elektryczne",
  instalacje_sanitarne:   "Instalacje sanitarne",
  instalacje_hvac:        "HVAC / Wentylacja",
  geotechnika:            "Geotechnika",
  drogi:                  "Drogi / Infrastruktura",
  kosztorys:              "Kosztorys",
  bhp:                    "BHP",
  inne:                   "Inne",
};

const PRIORITY_CONFIG: Record<RFIPriority, { label: string; color: string }> = {
  low:    { label: "Niski",   color: "bg-slate-100 text-slate-600" },
  normal: { label: "Normalny", color: "bg-blue-100 text-blue-700" },
  high:   { label: "Wysoki",  color: "bg-orange-100 text-orange-700" },
  urgent: { label: "Pilny",   color: "bg-red-100 text-red-700" },
};

const STATUS_CONFIG: Record<RFI["status"], { label: string; color: string; icon: React.ElementType }> = {
  draft:    { label: "Szkic",      color: "bg-slate-100 text-slate-600",   icon: MessageSquare },
  open:     { label: "Otwarte",    color: "bg-blue-100 text-blue-700",     icon: Clock },
  answered: { label: "Odpowiedziano", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  closed:   { label: "Zamknięte", color: "bg-teal-100 text-teal-700",     icon: Check },
  void:     { label: "Anulowane", color: "bg-slate-100 text-slate-400",   icon: XCircle },
};

import React from "react";

export function RFIClient({
  projectId,
  initialRFIs,
}: {
  projectId: string;
  initialRFIs: RFI[];
}) {
  const [rfis, setRFIs] = useState<RFI[]>(initialRFIs);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [answerMode, setAnswerMode] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [filterStatus, setFilterStatus] = useState<RFI["status"] | "all">("all");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", question: "", discipline: "general" as RFIDiscipline,
    priority: "normal" as RFIPriority, assignedToName: "",
    dueDate: "", costImpact: false, scheduleImpact: false,
    scheduleDays: "0", drawingRef: "", specSection: "", locationNote: "",
  });

  const filtered = filterStatus === "all" ? rfis : rfis.filter((r) => r.status === filterStatus);

  const stats = {
    open: rfis.filter((r) => r.status === "open").length,
    overdue: rfis.filter((r) => r.status === "open" && r.due_date && new Date(r.due_date) < new Date()).length,
    answered: rfis.filter((r) => r.status === "answered").length,
    closed: rfis.filter((r) => r.status === "closed").length,
  };

  function handleAdd() {
    if (!form.title.trim() || !form.question.trim()) {
      setError("Tytuł i treść pytania są wymagane");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createRFI({
        projectId, title: form.title, question: form.question,
        discipline: form.discipline, priority: form.priority,
        assignedToName: form.assignedToName || undefined,
        dueDate: form.dueDate || undefined,
        costImpact: form.costImpact, scheduleImpact: form.scheduleImpact,
        scheduleDays: Number(form.scheduleDays),
        drawingRef: form.drawingRef || undefined,
        specSection: form.specSection || undefined,
        locationNote: form.locationNote || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newRFI: RFI = {
        id: res.id!, project_id: projectId, org_id: "",
        number: rfis.length + 1,
        number_display: `RFI-${String(rfis.length + 1).padStart(3, "0")}`,
        title: form.title, question: form.question,
        discipline: form.discipline, priority: form.priority,
        status: "draft",
        created_by: null, assigned_to: null,
        assigned_to_name: form.assignedToName || null,
        date_initiated: new Date().toISOString().slice(0, 10),
        due_date: form.dueDate || null,
        answered_at: null, closed_at: null,
        cost_impact: form.costImpact, schedule_impact: form.scheduleImpact,
        schedule_days: Number(form.scheduleDays),
        answer: null, answered_by: null, answered_by_name: null,
        drawing_ref: form.drawingRef || null,
        spec_section: form.specSection || null,
        location_note: form.locationNote || null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        days_open: 0,
      };
      setRFIs((prev) => [newRFI, ...prev]);
      setShowForm(false);
      setForm({ title: "", question: "", discipline: "general", priority: "normal", assignedToName: "", dueDate: "", costImpact: false, scheduleImpact: false, scheduleDays: "0", drawingRef: "", specSection: "", locationNote: "" });
    });
  }

  function handleOpen(id: string) {
    startTransition(async () => {
      await openRFI(id, projectId);
      setRFIs((prev) => prev.map((r) => r.id === id ? { ...r, status: "open" } : r));
    });
  }

  function handleAnswer(id: string) {
    if (!answerText.trim()) return;
    startTransition(async () => {
      await answerRFI(id, projectId, answerText);
      setRFIs((prev) => prev.map((r) => r.id === id ? { ...r, status: "answered", answer: answerText, answered_at: new Date().toISOString() } : r));
      setAnswerMode(null);
      setAnswerText("");
    });
  }

  function handleClose(id: string) {
    startTransition(async () => {
      await closeRFI(id, projectId);
      setRFIs((prev) => prev.map((r) => r.id === id ? { ...r, status: "closed", closed_at: new Date().toISOString() } : r));
    });
  }

  function handleVoid(id: string) {
    startTransition(async () => {
      await voidRFI(id, projectId);
      setRFIs((prev) => prev.map((r) => r.id === id ? { ...r, status: "void" } : r));
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteRFI(id, projectId);
      setRFIs((prev) => prev.filter((r) => r.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">RFI — Zapytania techniczne</h1>
          <p className="text-sm text-muted-foreground">Request for Information — dokumentacja pytań projektowych i odpowiedzi</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="mr-1 h-4 w-4" /> Nowe RFI
        </Button>
      </div>

      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Otwarte", value: stats.open, color: "text-blue-600" },
          { label: "Przeterminowane", value: stats.overdue, color: "text-red-600" },
          { label: "Odpowiedziano", value: stats.answered, color: "text-green-600" },
          { label: "Zamknięte", value: stats.closed, color: "text-teal-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowe zapytanie RFI</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Tytuł *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="np. Wyjaśnienie zbrojenia ławy fundamentowej — os. B" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Branża</label>
                <select value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value as RFIDiscipline })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(DISCIPLINE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Priorytet</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as RFIPriority })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Skierowane do</label>
                <Input value={form.assignedToName} onChange={(e) => setForm({ ...form, assignedToName: e.target.value })}
                  placeholder="Imię i nazwisko / firma" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Termin odpowiedzi</label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Nr rysunku / dokumentu</label>
                <Input value={form.drawingRef} onChange={(e) => setForm({ ...form, drawingRef: e.target.value })}
                  placeholder="np. RB-01 rev.C" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Sekcja specyfikacji</label>
                <Input value={form.specSection} onChange={(e) => setForm({ ...form, specSection: e.target.value })}
                  placeholder="np. §5.3 Beton" className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Treść pytania *</label>
                <textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })}
                  rows={4} placeholder="Szczegółowe pytanie techniczne, sprzeczność w dokumentacji, brakujące informacje..."
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium">Lokalizacja na budowie</label>
                <Input value={form.locationNote} onChange={(e) => setForm({ ...form, locationNote: e.target.value })}
                  placeholder="np. Oś 3-4, piwnica" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Wpływ na harmonogram (+dni)</label>
                <Input type="number" min={0} value={form.scheduleDays}
                  onChange={(e) => setForm({ ...form, scheduleDays: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.costImpact} onChange={(e) => setForm({ ...form, costImpact: e.target.checked })} className="h-4 w-4" />
                Wpływ na koszt
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.scheduleImpact} onChange={(e) => setForm({ ...form, scheduleImpact: e.target.checked })} className="h-4 w-4" />
                Wpływ na harmonogram
              </label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={pending}>{pending ? "Zapisywanie..." : "Zapisz RFI"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FILTER TABS */}
      <div className="flex gap-1 border-b flex-wrap">
        {(["all", "draft", "open", "answered", "closed", "void"] as const).map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${filterStatus === s ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {s === "all" ? `Wszystkie (${rfis.length})` : `${STATUS_CONFIG[s].label} (${rfis.filter((r) => r.status === s).length})`}
          </button>
        ))}
      </div>

      {/* RFI LIST */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <MessageSquare className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Brak zapytań RFI</p>
            <p className="text-sm mt-1">Dodaj pierwsze zapytanie techniczne</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((rfi) => {
            const statusCfg = STATUS_CONFIG[rfi.status];
            const priorityCfg = PRIORITY_CONFIG[rfi.priority];
            const StatusIcon = statusCfg.icon;
            const isExpanded = expandedId === rfi.id;
            const isOverdue = rfi.status === "open" && rfi.due_date && new Date(rfi.due_date) < new Date();
            return (
              <Card key={rfi.id} className={`hover:shadow-sm transition-shadow ${isOverdue ? "border-red-300" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* TOP ROW */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-semibold text-muted-foreground">{rfi.number_display}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${statusCfg.color}`}>
                          <StatusIcon className="h-3 w-3" />{statusCfg.label}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priorityCfg.color}`}>
                          {priorityCfg.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{DISCIPLINE_LABELS[rfi.discipline]}</span>
                        {isOverdue && (
                          <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                            <AlertTriangle className="h-3 w-3" /> Przeterminowane
                          </span>
                        )}
                        {rfi.cost_impact && <span className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">Wpływ na koszt</span>}
                        {rfi.schedule_impact && <span className="text-xs bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">Wpływ na harmonogram</span>}
                      </div>

                      <p className="font-semibold">{rfi.title}</p>

                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>Zainicjowano: {new Date(rfi.date_initiated).toLocaleDateString("pl-PL")}</span>
                        {rfi.due_date && (
                          <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                            <Calendar className="h-3 w-3" /> Termin: {new Date(rfi.due_date).toLocaleDateString("pl-PL")}
                          </span>
                        )}
                        {rfi.assigned_to_name && <span>Do: {rfi.assigned_to_name}</span>}
                        {rfi.drawing_ref && <span>Rysunek: {rfi.drawing_ref}</span>}
                        <span>{rfi.days_open} dni otwarte</span>
                      </div>

                      {/* EXPANDED */}
                      {isExpanded && (
                        <div className="mt-3 space-y-3">
                          <div className="rounded-md bg-muted/50 p-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">PYTANIE</p>
                            <p className="text-sm whitespace-pre-wrap">{rfi.question}</p>
                          </div>
                          {rfi.answer && (
                            <div className="rounded-md bg-green-50 p-3 border border-green-200">
                              <p className="text-xs font-semibold text-green-700 mb-1">ODPOWIEDŹ
                                {rfi.answered_by_name && ` — ${rfi.answered_by_name}`}
                                {rfi.answered_at && ` (${new Date(rfi.answered_at).toLocaleDateString("pl-PL")})`}
                              </p>
                              <p className="text-sm whitespace-pre-wrap">{rfi.answer}</p>
                            </div>
                          )}
                          {answerMode === rfi.id && (
                            <div className="space-y-2">
                              <textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)}
                                rows={3} placeholder="Treść odpowiedzi na zapytanie..."
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleAnswer(rfi.id)} disabled={pending || !answerText.trim()}>
                                  <Send className="mr-1 h-3 w-3" /> Wyślij odpowiedź
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setAnswerMode(null); setAnswerText(""); }}>Anuluj</Button>
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            {rfi.status === "draft" && (
                              <>
                                <Button size="sm" onClick={() => handleOpen(rfi.id)} disabled={pending}>
                                  <Send className="mr-1 h-3 w-3" /> Wyślij zapytanie
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDelete(rfi.id)} disabled={pending} className="text-destructive">Usuń</Button>
                              </>
                            )}
                            {rfi.status === "open" && !answerMode && (
                              <Button size="sm" variant="outline" onClick={() => setAnswerMode(rfi.id)}>
                                <MessageSquare className="mr-1 h-3 w-3" /> Odpowiedz
                              </Button>
                            )}
                            {rfi.status === "answered" && (
                              <Button size="sm" variant="outline" onClick={() => handleClose(rfi.id)} disabled={pending}>
                                <Check className="mr-1 h-3 w-3" /> Zamknij RFI
                              </Button>
                            )}
                            {(rfi.status === "draft" || rfi.status === "open") && (
                              <Button size="sm" variant="ghost" onClick={() => handleVoid(rfi.id)} disabled={pending}>
                                <Archive className="mr-1 h-3 w-3" /> Anuluj
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : rfi.id)}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
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
