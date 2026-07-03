"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, FileImage, ArrowUpRight, RefreshCw, Archive } from "lucide-react";
import {
  createDrawing, updateDrawingStatus, addDrawingRevision,
  type ProjectDrawing, type DrawingDiscipline, type DrawingStatus,
} from "@/lib/actions/drawings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const DISCIPLINE_CONFIG: Record<DrawingDiscipline, { label: string; color: string }> = {
  architecture: { label: "Architektura",    color: "bg-blue-100 text-blue-700" },
  structure:    { label: "Konstrukcja",     color: "bg-orange-100 text-orange-700" },
  mep:          { label: "MEP",             color: "bg-green-100 text-green-700" },
  electrical:   { label: "Elektryka",       color: "bg-yellow-100 text-yellow-700" },
  plumbing:     { label: "Instalacje",      color: "bg-cyan-100 text-cyan-700" },
  hvac:         { label: "HVAC",            color: "bg-teal-100 text-teal-700" },
  civil:        { label: "Drogowa",         color: "bg-red-100 text-red-700" },
  landscape:    { label: "Zieleń",          color: "bg-lime-100 text-lime-700" },
  fire:         { label: "P.Poż.",          color: "bg-rose-100 text-rose-700" },
  other:        { label: "Inne",            color: "bg-slate-100 text-slate-500" },
};

const STATUS_CONFIG: Record<DrawingStatus, { label: string; color: string }> = {
  draft:       { label: "Szkic",         color: "bg-slate-100 text-slate-500" },
  for_review:  { label: "Do przeglądu",  color: "bg-yellow-100 text-yellow-700" },
  issued:      { label: "Wydany",        color: "bg-green-100 text-green-700" },
  superseded:  { label: "Zastąpiony",    color: "bg-orange-100 text-orange-600" },
  void:        { label: "Unieważniony",  color: "bg-red-100 text-red-600" },
};

export function RysunkiClient({ projectId, initialDrawings }: { projectId: string; initialDrawings: ProjectDrawing[] }) {
  const [drawings, setDrawings] = useState<ProjectDrawing[]>(initialDrawings);
  const [showForm, setShowForm] = useState(false);
  const [filterDisc, setFilterDisc] = useState<DrawingDiscipline | "all">("all");
  const [revisionTarget, setRevisionTarget] = useState<ProjectDrawing | null>(null);
  const [revForm, setRevForm] = useState({ revision: "", revisionDate: "", notes: "" });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    drawingNumber: "", title: "", description: "",
    discipline: "architecture" as DrawingDiscipline,
    sheetSize: "", revision: "A", revisionDate: "",
    fileUrl: "", scale: "", notes: "",
  });

  const filtered = drawings.filter((d) => filterDisc === "all" || d.discipline === filterDisc);
  const grouped = (Object.keys(DISCIPLINE_CONFIG) as DrawingDiscipline[]).reduce((acc, disc) => {
    acc[disc] = filtered.filter((d) => d.discipline === disc);
    return acc;
  }, {} as Record<DrawingDiscipline, ProjectDrawing[]>);

  function handleCreate() {
    if (!form.drawingNumber.trim() || !form.title.trim()) { setError("Numer i tytuł są wymagane"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createDrawing({
        projectId, drawingNumber: form.drawingNumber, title: form.title,
        description: form.description || undefined, discipline: form.discipline,
        sheetSize: form.sheetSize || undefined, revision: form.revision,
        revisionDate: form.revisionDate || undefined,
        fileUrl: form.fileUrl || undefined, scale: form.scale || undefined,
        notes: form.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newD: ProjectDrawing = {
        id: res.id!, project_id: projectId, org_id: "", uploaded_by: null,
        drawing_number: form.drawingNumber, title: form.title,
        description: form.description || null, discipline: form.discipline,
        sheet_size: form.sheetSize || null, revision: form.revision,
        revision_date: form.revisionDate || null, status: "issued",
        file_url: form.fileUrl || null, file_name: null, file_size_bytes: null,
        scale: form.scale || null, notes: form.notes || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setDrawings((prev) => [newD, ...prev]);
      setShowForm(false);
      setForm({ drawingNumber: "", title: "", description: "", discipline: "architecture", sheetSize: "", revision: "A", revisionDate: "", fileUrl: "", scale: "", notes: "" });
    });
  }

  function handleStatusUpdate(id: string, status: DrawingStatus) {
    startTransition(async () => {
      await updateDrawingStatus(id, projectId, status);
      setDrawings((prev) => prev.map((d) => d.id === id ? { ...d, status } : d));
    });
  }

  function handleAddRevision() {
    if (!revisionTarget || !revForm.revision.trim()) return;
    startTransition(async () => {
      const res = await addDrawingRevision(revisionTarget.id, projectId, revForm.revision, revForm.revisionDate || undefined, revForm.notes || undefined);
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      setDrawings((prev) => prev.map((d) => d.id === revisionTarget.id ? { ...d, status: "superseded" as const } : d));
      const newD: ProjectDrawing = { ...revisionTarget, id: `temp-${Date.now()}`, revision: revForm.revision, revision_date: revForm.revisionDate || null, status: "issued", notes: revForm.notes || null };
      setDrawings((prev) => [newD, ...prev]);
      setRevisionTarget(null);
      setRevForm({ revision: "", revisionDate: "", notes: "" });
    });
  }

  const stats = {
    total: drawings.length,
    issued: drawings.filter((d) => d.status === "issued").length,
    forReview: drawings.filter((d) => d.status === "for_review").length,
    superseded: drawings.filter((d) => d.status === "superseded").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2"><FileImage className="h-5 w-5" />Rejestr rysunków i planów</h1>
          <p className="text-sm text-muted-foreground">Drawings — numery rewizji, status, branże. Wzorowane na PlanRadar i PlanGrid.</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-1 h-4 w-4" />Dodaj rysunek</Button>
      </div>

      {/* STATS */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Wszystkich</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card className="border-green-200"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Wydanych</p><p className="text-2xl font-bold text-green-700">{stats.issued}</p></CardContent></Card>
        <Card className="border-yellow-200"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Do przeglądu</p><p className="text-2xl font-bold text-yellow-700">{stats.forReview}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Zastąpionych</p><p className="text-2xl font-bold text-muted-foreground">{stats.superseded}</p></CardContent></Card>
      </div>

      {/* DISCIPLINE FILTER */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setFilterDisc("all")}
          className={`rounded-full px-3 py-1 text-xs font-medium border ${filterDisc === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
          Wszystkie
        </button>
        {(Object.entries(DISCIPLINE_CONFIG) as [DrawingDiscipline, { label: string; color: string }][]).map(([k, v]) => (
          <button key={k} onClick={() => setFilterDisc(k)}
            className={`rounded-full px-3 py-1 text-xs font-medium border ${filterDisc === k ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
            {v.label} ({drawings.filter((d) => d.discipline === k).length})
          </button>
        ))}
      </div>

      {/* ADD FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Dodaj rysunek / plan</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className="text-sm font-medium">Numer rysunku *</label>
                <Input value={form.drawingNumber} onChange={(e) => setForm({ ...form, drawingNumber: e.target.value })} placeholder="np. A-001, S-05" className="mt-1" /></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Tytuł *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="np. Rzut parteru — układu funkcjonalny" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Branża</label>
                <select value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value as DrawingDiscipline })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(DISCIPLINE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Rewizja</label>
                <Input value={form.revision} onChange={(e) => setForm({ ...form, revision: e.target.value })} placeholder="A, B, C..." className="mt-1" /></div>
              <div><label className="text-sm font-medium">Data rewizji</label>
                <Input type="date" value={form.revisionDate} onChange={(e) => setForm({ ...form, revisionDate: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Format arkusza</label>
                <Input value={form.sheetSize} onChange={(e) => setForm({ ...form, sheetSize: e.target.value })} placeholder="A1, A0, A2..." className="mt-1" /></div>
              <div><label className="text-sm font-medium">Skala</label>
                <Input value={form.scale} onChange={(e) => setForm({ ...form, scale: e.target.value })} placeholder="1:50, 1:100, 1:500" className="mt-1" /></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Link do pliku</label>
                <Input value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} placeholder="https://..." className="mt-1" /></div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Dodawanie..." : "Dodaj rysunek"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* REVISION FORM */}
      {revisionTarget && (
        <Card className="border-orange-200 bg-orange-50/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Nowa rewizja: {revisionTarget.drawing_number} — {revisionTarget.title}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setRevisionTarget(null)}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div><label className="text-sm font-medium">Nowa rewizja *</label>
              <Input value={revForm.revision} onChange={(e) => setRevForm({ ...revForm, revision: e.target.value })} placeholder="np. B, C, Rev.2" className="mt-1" /></div>
            <div><label className="text-sm font-medium">Data rewizji</label>
              <Input type="date" value={revForm.revisionDate} onChange={(e) => setRevForm({ ...revForm, revisionDate: e.target.value })} className="mt-1" /></div>
            <div className="flex items-end"><Button onClick={handleAddRevision} disabled={pending} className="w-full">Dodaj rewizję</Button></div>
          </CardContent>
        </Card>
      )}

      {/* DRAWINGS TABLE BY DISCIPLINE */}
      {filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
          <FileImage className="mx-auto h-12 w-12 opacity-20 mb-3" />
          <p className="font-medium">Brak rysunków</p>
          <p className="text-sm mt-1">Dodaj pierwsze rysunki i plany techniczne do projektu</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {(Object.entries(grouped) as [DrawingDiscipline, ProjectDrawing[]][])
            .filter(([, v]) => v.length > 0)
            .map(([disc, discDrawings]) => (
              <div key={disc}>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${DISCIPLINE_CONFIG[disc].color}`}>{DISCIPLINE_CONFIG[disc].label}</span>
                  <span className="text-muted-foreground">({discDrawings.length})</span>
                </h3>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2">Nr</th>
                        <th className="text-left px-3 py-2">Tytuł</th>
                        <th className="text-left px-3 py-2 hidden md:table-cell">Rev.</th>
                        <th className="text-left px-3 py-2 hidden md:table-cell">Data</th>
                        <th className="text-left px-3 py-2">Status</th>
                        <th className="px-3 py-2 w-32"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {discDrawings.map((d) => (
                        <tr key={d.id} className={`border-t hover:bg-muted/20 ${d.status === "superseded" ? "opacity-60" : ""}`}>
                          <td className="px-3 py-2 font-mono text-xs font-semibold">{d.drawing_number}</td>
                          <td className="px-3 py-2">
                            <p className="font-medium truncate max-w-[200px]">{d.title}</p>
                            {d.scale && <p className="text-xs text-muted-foreground">{d.scale}{d.sheet_size ? ` · ${d.sheet_size}` : ""}</p>}
                          </td>
                          <td className="px-3 py-2 hidden md:table-cell font-mono">{d.revision}</td>
                          <td className="px-3 py-2 hidden md:table-cell text-xs text-muted-foreground">
                            {d.revision_date ? new Date(d.revision_date).toLocaleDateString("pl-PL") : "—"}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CONFIG[d.status].color}`}>
                              {STATUS_CONFIG[d.status].label}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1.5 items-center">
                              {d.file_url && (
                                <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                                  <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                                </a>
                              )}
                              {d.status === "issued" && (
                                <>
                                  <button onClick={() => setRevisionTarget(d)} title="Nowa rewizja">
                                    <RefreshCw className="h-3.5 w-3.5 text-muted-foreground hover:text-orange-600" />
                                  </button>
                                  <button onClick={() => handleStatusUpdate(d.id, "void")} title="Unieważnij" disabled={pending}>
                                    <Archive className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                  </button>
                                </>
                              )}
                              {d.status === "draft" && (
                                <button onClick={() => handleStatusUpdate(d.id, "issued")} className="text-xs text-green-600 hover:underline" disabled={pending}>Wydaj</button>
                              )}
                              {d.status === "for_review" && (
                                <button onClick={() => handleStatusUpdate(d.id, "issued")} className="text-xs text-green-600 hover:underline" disabled={pending}>Zatwierdź</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
