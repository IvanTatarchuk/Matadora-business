"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, ClipboardCheck, X, CheckCircle2,
  XCircle, AlertTriangle, ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import {
  createInspection, submitInspectionResults, deleteInspection,
  type Inspection, type InspectionCategory, type InspectionItem, type InspectionItemResult,
} from "@/lib/actions/inspections";
import { BUILT_IN_TEMPLATES } from "@/lib/constants/inspections";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const CATEGORY_LABELS: Record<InspectionCategory, string> = {
  quality:     "Kontrola jakości",
  safety:      "BHP / Bezpieczeństwo",
  handover:    "Odbiór robót",
  maintenance: "Przegląd techniczny",
  environment: "Środowisko",
  regulatory:  "Wymogi prawne",
  custom:      "Własny",
};

const STATUS_CONFIG: Record<Inspection["status"], { label: string; color: string; icon: React.ElementType }> = {
  draft:       { label: "Szkic",        color: "bg-slate-100 text-slate-600",   icon: ClipboardCheck },
  in_progress: { label: "W trakcie",    color: "bg-blue-100 text-blue-700",     icon: ClipboardCheck },
  passed:      { label: "Zaakceptowano",color: "bg-green-100 text-green-700",   icon: CheckCircle2 },
  failed:      { label: "Niezgodne",    color: "bg-red-100 text-red-700",       icon: XCircle },
  conditional: { label: "Warunkowo",    color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
};

const RESULT_CONFIG: Record<InspectionItemResult, { label: string; color: string; bg: string }> = {
  pass:        { label: "OK",         color: "text-green-700", bg: "bg-green-100" },
  fail:        { label: "Niezgodne",  color: "text-red-700",   bg: "bg-red-100" },
  observation: { label: "Obserwacja", color: "text-orange-700",bg: "bg-orange-100" },
  na:          { label: "N/D",        color: "text-slate-500", bg: "bg-slate-100" },
};

import React from "react";

export function InspekcjeClient({
  projectId,
  initialInspections,
}: {
  projectId: string;
  initialInspections: Inspection[];
}) {
  const [inspections, setInspections] = useState<Inspection[]>(initialInspections);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", category: "quality" as InspectionCategory,
    inspectorName: "", inspectionDate: new Date().toISOString().slice(0, 10),
    locationNote: "", templateKey: "custom", notes: "",
  });

  const selected = inspections.find((i) => i.id === selectedId);

  const stats = {
    passed: inspections.filter((i) => i.status === "passed").length,
    failed: inspections.filter((i) => i.status === "failed").length,
    pending: inspections.filter((i) => ["draft","in_progress"].includes(i.status)).length,
    defects: inspections.reduce((s, i) => s + i.defects_count, 0),
  };

  function handleCreate() {
    if (!form.title.trim()) { setError("Tytuł jest wymagany"); return; }
    setError(null);
    const template = form.templateKey !== "custom" ? BUILT_IN_TEMPLATES[form.templateKey] : null;
    const items: InspectionItem[] = template
      ? template.items.map((it: Omit<InspectionItem, "result" | "value" | "notes">) => ({ ...it }))
      : [];
    startTransition(async () => {
      const res = await createInspection({
        projectId, title: form.title, category: template?.category ?? form.category,
        inspectorName: form.inspectorName || undefined,
        inspectionDate: form.inspectionDate,
        locationNote: form.locationNote || undefined,
        items, notes: form.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newInspection: Inspection = {
        id: res.id!, project_id: projectId, org_id: "", template_id: null,
        created_by: null, number: inspections.length + 1,
        number_display: `INS-${String(inspections.length + 1).padStart(3, "0")}`,
        title: form.title, category: template?.category ?? form.category,
        inspection_date: form.inspectionDate,
        inspector_name: form.inspectorName || null,
        location_note: form.locationNote || null, status: "draft", items,
        overall_result: null, defects_count: 0, observations_count: 0,
        notes: form.notes || null, corrective_actions: null, follow_up_date: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setInspections((prev) => [newInspection, ...prev]);
      setSelectedId(res.id!);
      setShowForm(false);
      setForm({ title: "", category: "quality", inspectorName: "", inspectionDate: new Date().toISOString().slice(0, 10), locationNote: "", templateKey: "custom", notes: "" });
    });
  }

  function handleItemResult(inspId: string, itemId: string, result: InspectionItemResult) {
    setInspections((prev) => prev.map((ins) =>
      ins.id === inspId
        ? { ...ins, status: "in_progress", items: ins.items.map((it) => it.id === itemId ? { ...it, result } : it) }
        : ins
    ));
  }

  function handleItemNote(inspId: string, itemId: string, notes: string) {
    setInspections((prev) => prev.map((ins) =>
      ins.id === inspId
        ? { ...ins, items: ins.items.map((it) => it.id === itemId ? { ...it, notes } : it) }
        : ins
    ));
  }

  function handleSubmit(inspection: Inspection, notes: string, correctiveActions: string) {
    startTransition(async () => {
      await submitInspectionResults(inspection.id, projectId, inspection.items, notes, correctiveActions);
      const defects = inspection.items.filter((i) => i.result === "fail").length;
      const observations = inspection.items.filter((i) => i.result === "observation").length;
      const anyFailed = defects > 0;
      const overall = anyFailed ? "fail" as const : observations === 0 ? "pass" as const : "conditional" as const;
      const status: Inspection["status"] = anyFailed ? "failed" : observations === 0 ? "passed" : "conditional";
      setInspections((prev) => prev.map((ins) =>
        ins.id === inspection.id
          ? { ...ins, status, overall_result: overall, defects_count: defects, observations_count: observations }
          : ins
      ));
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteInspection(id, projectId);
      setInspections((prev) => prev.filter((i) => i.id !== id));
      if (selectedId === id) setSelectedId(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Inspekcje / Kontrola jakości</h1>
          <p className="text-sm text-muted-foreground">Checklists inspekcyjne, wyniki pass/fail, działania naprawcze — wzorowane na PlanRadar i Procore QC</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="mr-1 h-4 w-4" /> Nowa inspekcja
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Zaakceptowane</p><p className="text-2xl font-bold text-green-600">{stats.passed}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Niezgodne</p><p className="text-2xl font-bold text-red-600">{stats.failed}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Oczekujące</p><p className="text-2xl font-bold text-blue-600">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Łączna liczba niezgodności</p><p className="text-2xl font-bold text-orange-600">{stats.defects}</p></CardContent></Card>
      </div>

      {/* FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowa inspekcja</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Szablon inspekcji</label>
                <select value={form.templateKey} onChange={(e) => {
                  const key = e.target.value;
                  const tmpl = key !== "custom" ? BUILT_IN_TEMPLATES[key] : null;
                  setForm({ ...form, templateKey: key, title: tmpl?.name ?? form.title, category: tmpl?.category ?? form.category });
                }} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="custom">— Własny (bez szablonu) —</option>
                  {Object.entries(BUILT_IN_TEMPLATES).map(([k, t]) => <option key={k} value={k}>{(t as { name: string }).name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Kategoria</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as InspectionCategory })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Tytuł inspekcji *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="np. Kontrola betonu — ława F1" />
              </div>
              <div>
                <label className="text-sm font-medium">Inspektor</label>
                <Input value={form.inspectorName} onChange={(e) => setForm({ ...form, inspectorName: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Data inspekcji</label>
                <Input type="date" value={form.inspectionDate} onChange={(e) => setForm({ ...form, inspectionDate: e.target.value })} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Lokalizacja</label>
                <Input value={form.locationNote} onChange={(e) => setForm({ ...form, locationNote: e.target.value })} placeholder="np. Sektor A, piwnica" className="mt-1" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Tworzenie..." : "Utwórz inspekcję"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* LIST */}
        <div className="space-y-2">
          {inspections.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-6 text-center text-muted-foreground">
              <ClipboardCheck className="mx-auto h-8 w-8 opacity-20 mb-2" />
              <p className="text-sm">Brak inspekcji</p>
            </CardContent></Card>
          ) : inspections.map((ins) => {
            const cfg = STATUS_CONFIG[ins.status];
            const Icon = cfg.icon;
            return (
              <Card key={ins.id}
                className={`cursor-pointer hover:shadow-sm transition-all ${selectedId === ins.id ? "border-primary ring-1 ring-primary/20" : ""}`}
                onClick={() => setSelectedId(selectedId === ins.id ? null : ins.id)}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="font-mono text-xs text-muted-foreground">{ins.number_display}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
                          <Icon className="h-3 w-3" />{cfg.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">{ins.title}</p>
                      <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[ins.category]}</p>
                      <p className="text-xs text-muted-foreground">{new Date(ins.inspection_date).toLocaleDateString("pl-PL")}</p>
                      {ins.defects_count > 0 && <p className="text-xs text-red-600 font-medium">{ins.defects_count} niezgodności</p>}
                    </div>
                    {ins.status === "draft" && (
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(ins.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* DETAIL */}
        {selected ? (
          <InspectionDetail
            inspection={selected}
            onItemResult={(itemId, result) => handleItemResult(selected.id, itemId, result)}
            onItemNote={(itemId, notes) => handleItemNote(selected.id, itemId, notes)}
            onSubmit={(notes, ca) => handleSubmit(selected, notes, ca)}
            pending={pending}
          />
        ) : (
          <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
            <ClipboardCheck className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Wybierz inspekcję z listy</p>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}

function InspectionDetail({
  inspection, onItemResult, onItemNote, onSubmit, pending,
}: {
  inspection: Inspection;
  onItemResult: (itemId: string, result: InspectionItemResult) => void;
  onItemNote: (itemId: string, notes: string) => void;
  onSubmit: (notes: string, ca: string) => void;
  pending: boolean;
}) {
  const [notes, setNotes] = useState(inspection.notes ?? "");
  const [correctiveActions, setCorrectiveActions] = useState(inspection.corrective_actions ?? "");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const cfg = STATUS_CONFIG[inspection.status];
  const StatusIcon = cfg.icon;
  const answeredCount = inspection.items.filter((i) => i.result).length;
  const progress = inspection.items.length > 0 ? (answeredCount / inspection.items.length) * 100 : 0;
  const isDone = ["passed","failed","conditional"].includes(inspection.status);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-xs text-muted-foreground">{inspection.number_display}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                  <StatusIcon className="h-3 w-3" />{cfg.label}
                </span>
              </div>
              <CardTitle className="text-lg">{inspection.title}</CardTitle>
              <div className="flex gap-4 text-sm text-muted-foreground flex-wrap mt-1">
                <span>{CATEGORY_LABELS[inspection.category]}</span>
                {inspection.inspector_name && <span>Inspektor: {inspection.inspector_name}</span>}
                <span>{new Date(inspection.inspection_date).toLocaleDateString("pl-PL")}</span>
                {inspection.location_note && <span>{inspection.location_note}</span>}
              </div>
            </div>
            {!isDone && answeredCount === inspection.items.length && inspection.items.length > 0 && (
              <Button size="sm" onClick={() => onSubmit(notes, correctiveActions)} disabled={pending}>
                <CheckCircle2 className="mr-1 h-4 w-4" /> Zatwierdź inspekcję
              </Button>
            )}
          </div>
          {inspection.items.length > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Postęp: {answeredCount}/{inspection.items.length}</span><span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, backgroundColor: inspection.defects_count > 0 ? "#ef4444" : "#22c55e" }} />
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* CHECKLIST ITEMS */}
      {inspection.items.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-6 text-center text-muted-foreground text-sm">
          Brak punktów checklisty. Utwórz inspekcję z szablonem lub dodaj punkty.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {inspection.items.map((item) => {
            const resultCfg = item.result ? RESULT_CONFIG[item.result] : null;
            const isExpanded = expandedItem === item.id;
            return (
              <Card key={item.id} className={`transition-colors ${item.result === "fail" ? "border-red-200 bg-red-50/30" : ""}`}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.question}{item.required && <span className="text-red-500 ml-0.5">*</span>}</p>
                      {item.result && <span className={`inline-block mt-1 rounded px-1.5 py-0.5 text-xs font-semibold ${resultCfg!.bg} ${resultCfg!.color}`}>{resultCfg!.label}</span>}
                      {item.notes && <p className="text-xs text-muted-foreground mt-1 italic">{item.notes}</p>}
                    </div>
                    {!isDone && (
                      <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                        {(["pass","fail","observation","na"] as InspectionItemResult[]).map((r) => {
                          const rc = RESULT_CONFIG[r];
                          return (
                            <button key={r} onClick={() => onItemResult(item.id, r)}
                              className={`rounded px-2 py-1 text-xs font-medium border transition-all ${item.result === r ? `${rc.bg} ${rc.color} border-current` : "border-muted hover:bg-muted"}`}>
                              {rc.label}
                            </button>
                          );
                        })}
                        <Button variant="ghost" size="sm" onClick={() => setExpandedItem(isExpanded ? null : item.id)}>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                      </div>
                    )}
                  </div>
                  {isExpanded && !isDone && (
                    <textarea value={item.notes ?? ""} onChange={(e) => onItemNote(item.id, e.target.value)}
                      rows={2} placeholder="Notatka do tej pozycji..."
                      className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* SUMMARY NOTES */}
      {!isDone && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="text-sm font-medium">Uwagi ogólne</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium">Działania naprawcze</label>
              <textarea value={correctiveActions} onChange={(e) => setCorrectiveActions(e.target.value)} rows={2}
                placeholder="Opisz działania korygujące dla wykrytych niezgodności..."
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
            </div>
          </CardContent>
        </Card>
      )}

      {isDone && inspection.corrective_actions && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-1">Działania naprawcze</p>
            <p className="text-sm text-muted-foreground">{inspection.corrective_actions}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
