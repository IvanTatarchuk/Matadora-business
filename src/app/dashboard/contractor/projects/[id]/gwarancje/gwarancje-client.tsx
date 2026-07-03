"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, ShieldCheck, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import {
  createWarranty, claimWarranty, resolveWarranty,
  type WarrantyRecord, type WarrantyCategory, type WarrantyStatus,
} from "@/lib/actions/warranty";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import React from "react";

const CATEGORY_LABELS: Record<WarrantyCategory, string> = {
  workmanship:  "Wykonawstwo",
  materials:    "Materiały",
  equipment:    "Urządzenia / Instalacje",
  structural:   "Konstrukcja",
  waterproofing:"Hydroizolacja",
  electrical:   "Elektryka",
  plumbing:     "Instalacja wod-kan",
  hvac:         "HVAC / Wentylacja",
  other:        "Inne",
};

const STATUS_CONFIG: Record<WarrantyStatus, { label: string; color: string; icon: React.ElementType }> = {
  active:   { label: "Aktywna",       color: "bg-green-100 text-green-700",   icon: ShieldCheck },
  claimed:  { label: "Roszczenie",    color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  resolved: { label: "Rozwiązana",    color: "bg-teal-100 text-teal-700",     icon: CheckCircle2 },
  expired:  { label: "Wygasła",       color: "bg-slate-100 text-slate-500",   icon: Clock },
  void:     { label: "Anulowana",     color: "bg-slate-100 text-slate-400",   icon: XCircle },
};

export function GwarancjeClient({ projectId, initialWarranties }: { projectId: string; initialWarranties: WarrantyRecord[] }) {
  const [warranties, setWarranties] = useState<WarrantyRecord[]>(initialWarranties);
  const [showForm, setShowForm] = useState(false);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [claimText, setClaimText] = useState("");
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveText, setResolveText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", category: "workmanship" as WarrantyCategory,
    description: "", responsibleParty: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "", documentRef: "", notes: "",
  });

  const now = new Date();
  const stats = {
    active: warranties.filter((w) => w.status === "active").length,
    claimed: warranties.filter((w) => w.status === "claimed").length,
    expiring30: warranties.filter((w) => w.status === "active" && w.end_date && Math.floor((new Date(w.end_date).getTime() - now.getTime()) / 86400000) <= 30).length,
    expired: warranties.filter((w) => w.status === "expired" || (w.status === "active" && w.end_date && new Date(w.end_date) < now)).length,
  };

  function handleCreate() {
    if (!form.title.trim() || !form.endDate) { setError("Tytuł i data końcowa są wymagane"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createWarranty({
        projectId, title: form.title, category: form.category,
        description: form.description || undefined,
        responsibleParty: form.responsibleParty || undefined,
        startDate: form.startDate, endDate: form.endDate,
        documentRef: form.documentRef || undefined, notes: form.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newW: WarrantyRecord = {
        id: res.id!, project_id: projectId, org_id: "", created_by: null,
        title: form.title, category: form.category,
        description: form.description || null,
        responsible_party: form.responsibleParty || null,
        start_date: form.startDate, end_date: form.endDate, warranty_months: null,
        status: "active", claim_date: null, claim_description: null,
        resolution_date: null, resolution_notes: null,
        document_ref: form.documentRef || null, notes: form.notes || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setWarranties((prev) => [newW, ...prev].sort((a, b) => a.end_date.localeCompare(b.end_date)));
      setShowForm(false);
      setForm({ title: "", category: "workmanship", description: "", responsibleParty: "", startDate: new Date().toISOString().slice(0, 10), endDate: "", documentRef: "", notes: "" });
    });
  }

  function handleClaim() {
    if (!claimId || !claimText.trim()) return;
    startTransition(async () => {
      await claimWarranty(claimId, projectId, claimText);
      setWarranties((prev) => prev.map((w) => w.id === claimId ? { ...w, status: "claimed" as const, claim_description: claimText } : w));
      setClaimId(null); setClaimText("");
    });
  }

  function handleResolve() {
    if (!resolveId || !resolveText.trim()) return;
    startTransition(async () => {
      await resolveWarranty(resolveId, projectId, resolveText);
      setWarranties((prev) => prev.map((w) => w.id === resolveId ? { ...w, status: "resolved" as const, resolution_notes: resolveText } : w));
      setResolveId(null); setResolveText("");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Gwarancje</h1>
          <p className="text-sm text-muted-foreground">Rejestr gwarancji na roboty i materiały — alerty o wygaśnięciu</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-1 h-4 w-4" />Dodaj gwarancję</Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Aktywne</p><p className="text-2xl font-bold text-green-600">{stats.active}</p></CardContent></Card>
        <Card className={stats.expiring30 > 0 ? "border-yellow-200" : ""}><CardContent className="p-4"><p className="text-xs text-muted-foreground">Wygasają w 30 dni</p><p className="text-2xl font-bold text-yellow-600">{stats.expiring30}</p></CardContent></Card>
        <Card className={stats.claimed > 0 ? "border-orange-200" : ""}><CardContent className="p-4"><p className="text-xs text-muted-foreground">Roszczenia</p><p className="text-2xl font-bold text-orange-600">{stats.claimed}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Wygasłe</p><p className="text-2xl font-bold text-slate-500">{stats.expired}</p></CardContent></Card>
      </div>

      {/* CLAIM DIALOG */}
      {claimId && (
        <Card className="border-orange-200">
          <CardHeader className="pb-3"><CardTitle className="text-base text-orange-700">Zgłoś roszczenie gwarancyjne</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <textarea value={claimText} onChange={(e) => setClaimText(e.target.value)} rows={3} placeholder="Opis usterki / wady..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
            <div className="flex gap-2">
              <Button onClick={handleClaim} disabled={pending}>Zgłoś roszczenie</Button>
              <Button variant="outline" onClick={() => { setClaimId(null); setClaimText(""); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* RESOLVE DIALOG */}
      {resolveId && (
        <Card className="border-teal-200">
          <CardHeader className="pb-3"><CardTitle className="text-base text-teal-700">Zamknij roszczenie</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <textarea value={resolveText} onChange={(e) => setResolveText(e.target.value)} rows={3} placeholder="Opis działań naprawczych..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
            <div className="flex gap-2">
              <Button onClick={handleResolve} disabled={pending}>Zapisz rozwiązanie</Button>
              <Button variant="outline" onClick={() => { setResolveId(null); setResolveText(""); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowa gwarancja</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="text-sm font-medium">Tytuł *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="np. Gwarancja na izolację dachu" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Kategoria</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as WarrantyCategory })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Odpowiedzialny / Podwykonawca</label>
                <Input value={form.responsibleParty} onChange={(e) => setForm({ ...form, responsibleParty: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Data początkowa *</label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Data końcowa *</label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Nr dokumentu / certyfikatu</label>
                <Input value={form.documentRef} onChange={(e) => setForm({ ...form, documentRef: e.target.value })} className="mt-1" /></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Opis</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" /></div>
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
      {warranties.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
          <ShieldCheck className="mx-auto h-12 w-12 opacity-20 mb-3" />
          <p className="font-medium">Brak gwarancji</p>
          <p className="text-sm mt-1">Rejestruj gwarancje na wykonane roboty i dostarczone materiały</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {warranties.map((w) => {
            const cfg = STATUS_CONFIG[w.status];
            const Icon = cfg.icon;
            const daysLeft = w.end_date ? Math.floor((new Date(w.end_date).getTime() - now.getTime()) / 86400000) : null;
            const isExpiringSoon = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0 && w.status === "active";
            return (
              <Card key={w.id} className={`${w.status === "claimed" ? "border-orange-200" : ""} ${isExpiringSoon ? "border-yellow-200" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                          <Icon className="h-3 w-3" />{cfg.label}
                        </span>
                        <span className="text-xs bg-muted rounded px-1.5 py-0.5">{CATEGORY_LABELS[w.category]}</span>
                        {isExpiringSoon && <span className="text-xs text-yellow-700 font-medium">⚠ Wygasa za {daysLeft} dni</span>}
                        {daysLeft !== null && daysLeft < 0 && w.status === "active" && (
                          <span className="text-xs text-slate-500 font-medium">Wygasła {Math.abs(daysLeft)} dni temu</span>
                        )}
                      </div>
                      <p className="font-semibold">{w.title}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        {w.responsible_party && <span>{w.responsible_party}</span>}
                        <span>Od: {new Date(w.start_date).toLocaleDateString("pl-PL")}</span>
                        <span>Do: {new Date(w.end_date).toLocaleDateString("pl-PL")}</span>
                        {w.warranty_months !== null && <span>({w.warranty_months} mies.)</span>}
                        {w.document_ref && <span>Dok: {w.document_ref}</span>}
                      </div>
                      {w.claim_description && <p className="text-xs text-orange-700 mt-1 border-l-2 border-orange-300 pl-2">Roszczenie: {w.claim_description}</p>}
                      {w.resolution_notes && <p className="text-xs text-teal-700 mt-1 border-l-2 border-teal-300 pl-2">Rozwiązanie: {w.resolution_notes}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {w.status === "active" && (
                        <Button size="sm" variant="outline" onClick={() => setClaimId(w.id)} disabled={pending}>
                          <AlertTriangle className="mr-1 h-3 w-3" />Roszczenie
                        </Button>
                      )}
                      {w.status === "claimed" && (
                        <Button size="sm" onClick={() => setResolveId(w.id)} disabled={pending}>
                          <CheckCircle2 className="mr-1 h-3 w-3" />Rozwiąż
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
