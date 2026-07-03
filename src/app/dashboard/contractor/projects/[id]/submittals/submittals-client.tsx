"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, X, FileCheck, CheckCircle2, XCircle,
  AlertTriangle, Clock, RotateCcw, Send,
} from "lucide-react";
import {
  createSubmittal, updateSubmittalStatus, resubmitSubmittal,
  type Submittal, type SubmittalType, type SubmittalStatus,
} from "@/lib/actions/submittals";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const TYPE_LABELS: Record<SubmittalType, string> = {
  shop_drawings:     "Rysunki warsztatowe",
  product_data:      "Dane techniczne produktu",
  samples:           "Próbki materiałów",
  calculations:      "Obliczenia",
  certificates:      "Certyfikaty / Atesty",
  warranties:        "Karty gwarancyjne",
  test_reports:      "Protokoły badań",
  operation_manuals: "Instrukcje obsługi",
  other:             "Inne",
};

const STATUS_CONFIG: Record<SubmittalStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft:            { label: "Szkic",             color: "bg-slate-100 text-slate-600",   icon: Clock },
  submitted:        { label: "Złożony",           color: "bg-blue-100 text-blue-700",     icon: Send },
  under_review:     { label: "W przeglądzie",     color: "bg-indigo-100 text-indigo-700", icon: Clock },
  approved:         { label: "Zatwierdzony",      color: "bg-green-100 text-green-700",   icon: CheckCircle2 },
  approved_as_noted:{ label: "Zatwierdzony z uw.",color: "bg-teal-100 text-teal-700",    icon: CheckCircle2 },
  revise_resubmit:  { label: "Popraw i złóż ponownie", color: "bg-orange-100 text-orange-700", icon: RotateCcw },
  rejected:         { label: "Odrzucony",         color: "bg-red-100 text-red-700",       icon: XCircle },
  void:             { label: "Anulowany",         color: "bg-slate-100 text-slate-400",   icon: XCircle },
};

import React from "react";

export function SubmittalsClient({ projectId, initialSubmittals }: { projectId: string; initialSubmittals: Submittal[] }) {
  const [submittals, setSubmittals] = useState<Submittal[]>(initialSubmittals);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewStatus, setReviewStatus] = useState<SubmittalStatus>("approved");
  const [showReview, setShowReview] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", submittalType: "shop_drawings" as SubmittalType,
    specSection: "", submittedTo: "", submittedDate: "", requiredDate: "",
    description: "", internalNotes: "",
  });

  const selected = submittals.find((s) => s.id === selectedId);

  const stats = {
    open: submittals.filter((s) => ["submitted","under_review"].includes(s.status)).length,
    approved: submittals.filter((s) => ["approved","approved_as_noted"].includes(s.status)).length,
    action: submittals.filter((s) => s.status === "revise_resubmit").length,
    overdue: submittals.filter((s) => s.required_date && !["approved","approved_as_noted","void"].includes(s.status) && new Date(s.required_date) < new Date()).length,
  };

  function handleCreate() {
    if (!form.title.trim()) { setError("Tytuł jest wymagany"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createSubmittal({
        projectId, title: form.title, submittalType: form.submittalType,
        specSection: form.specSection || undefined,
        submittedTo: form.submittedTo || undefined,
        submittedDate: form.submittedDate || undefined,
        requiredDate: form.requiredDate || undefined,
        description: form.description || undefined,
        internalNotes: form.internalNotes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newSub: Submittal = {
        id: res.id!, project_id: projectId, org_id: "", created_by: null,
        number: submittals.length + 1,
        number_display: `SUB-${String(submittals.length + 1).padStart(3, "0")}`,
        title: form.title, spec_section: form.specSection || null,
        submittal_type: form.submittalType, status: "draft",
        submitted_to: form.submittedTo || null,
        submitted_date: form.submittedDate || null,
        required_date: form.requiredDate || null,
        returned_date: null, revision: 1,
        description: form.description || null,
        review_notes: null, internal_notes: form.internalNotes || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setSubmittals((prev) => [newSub, ...prev]);
      setShowForm(false);
      setForm({ title: "", submittalType: "shop_drawings", specSection: "", submittedTo: "", submittedDate: "", requiredDate: "", description: "", internalNotes: "" });
    });
  }

  function handleSubmit(id: string) {
    startTransition(async () => {
      await updateSubmittalStatus(id, projectId, "submitted");
      setSubmittals((prev) => prev.map((s) => s.id === id ? { ...s, status: "submitted", submitted_date: new Date().toISOString().slice(0,10) } : s));
    });
  }

  function handleReview() {
    if (!selectedId) return;
    startTransition(async () => {
      await updateSubmittalStatus(selectedId, projectId, reviewStatus, reviewNotes, new Date().toISOString().slice(0,10));
      setSubmittals((prev) => prev.map((s) => s.id === selectedId
        ? { ...s, status: reviewStatus, review_notes: reviewNotes, returned_date: new Date().toISOString().slice(0,10) } : s));
      setShowReview(false); setReviewNotes(""); setSelectedId(null);
    });
  }

  function handleResubmit(id: string) {
    startTransition(async () => {
      await resubmitSubmittal(id, projectId);
      setSubmittals((prev) => prev.map((s) => s.id === id
        ? { ...s, status: "submitted", revision: s.revision + 1, submitted_date: new Date().toISOString().slice(0,10) } : s));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Submittals</h1>
          <p className="text-sm text-muted-foreground">Rysunki warsztatowe, próbki, certyfikaty — workflow przeglądu i zatwierdzania</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-1 h-4 w-4" />Nowy submittal</Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">W przeglądzie</p><p className="text-2xl font-bold text-blue-600">{stats.open}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Zatwierdzone</p><p className="text-2xl font-bold text-green-600">{stats.approved}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Do poprawy</p><p className="text-2xl font-bold text-orange-600">{stats.action}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Przeterminowane</p><p className="text-2xl font-bold text-red-600">{stats.overdue}</p></CardContent></Card>
      </div>

      {/* REVIEW DIALOG */}
      {showReview && selected && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Przegląd: {selected.number_display} — {selected.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">Decyzja</label>
              <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value as SubmittalStatus)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                {(["approved","approved_as_noted","revise_resubmit","rejected"] as SubmittalStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Uwagi recenzenta</label>
              <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
                placeholder="Szczegółowe uwagi, wymagane poprawki..." />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleReview} disabled={pending}>Zapisz decyzję</Button>
              <Button variant="outline" onClick={() => setShowReview(false)}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* NEW FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowy submittal</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="text-sm font-medium">Tytuł *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="np. Rysunki zbrojenia stropu S1" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Typ</label>
                <select value={form.submittalType} onChange={(e) => setForm({ ...form, submittalType: e.target.value as SubmittalType })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Sekcja specyfikacji</label>
                <Input value={form.specSection} onChange={(e) => setForm({ ...form, specSection: e.target.value })} placeholder="np. 03 30 00" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Osoba sprawdzająca</label>
                <Input value={form.submittedTo} onChange={(e) => setForm({ ...form, submittedTo: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Wymagana data zatwierdzenia</label>
                <Input type="date" value={form.requiredDate} onChange={(e) => setForm({ ...form, requiredDate: e.target.value })} className="mt-1" /></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Opis</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" /></div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Tworzenie..." : "Utwórz"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LIST */}
      {submittals.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
          <FileCheck className="mx-auto h-12 w-12 opacity-20 mb-3" />
          <p className="font-medium">Brak submittals</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {submittals.map((sub) => {
            const cfg = STATUS_CONFIG[sub.status];
            const StatusIcon = cfg.icon;
            const isOverdue = sub.required_date && !["approved","approved_as_noted","void"].includes(sub.status) && new Date(sub.required_date) < new Date();
            return (
              <Card key={sub.id} className={isOverdue ? "border-red-200" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{sub.number_display}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />{cfg.label}
                        </span>
                        {sub.revision > 1 && <span className="text-xs bg-muted rounded px-1.5 py-0.5">Rev.{sub.revision}</span>}
                        {isOverdue && <span className="text-xs text-red-600 font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Przeterminowany</span>}
                      </div>
                      <p className="font-semibold">{sub.title}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span>{TYPE_LABELS[sub.submittal_type]}</span>
                        {sub.spec_section && <span>{sub.spec_section}</span>}
                        {sub.submitted_to && <span>Do: {sub.submitted_to}</span>}
                        {sub.required_date && <span>Termin: {new Date(sub.required_date).toLocaleDateString("pl-PL")}</span>}
                      </div>
                      {sub.review_notes && (
                        <p className="mt-1 text-xs text-muted-foreground border-l-2 border-muted pl-2">{sub.review_notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                      {sub.status === "draft" && (
                        <Button size="sm" onClick={() => handleSubmit(sub.id)} disabled={pending}>
                          <Send className="mr-1 h-3 w-3" />Złóż
                        </Button>
                      )}
                      {["submitted","under_review"].includes(sub.status) && (
                        <Button size="sm" variant="outline" onClick={() => { setSelectedId(sub.id); setShowReview(true); }}>
                          Przeglądaj
                        </Button>
                      )}
                      {sub.status === "revise_resubmit" && (
                        <Button size="sm" variant="outline" onClick={() => handleResubmit(sub.id)} disabled={pending}>
                          <RotateCcw className="mr-1 h-3 w-3" />Złóż ponownie
                        </Button>
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
