"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, Banknote, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { createRetention, releaseRetention, type RetentionPayment, type RetentionStatus, type RetentionDirection } from "@/lib/actions/retention";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import React from "react";

const STATUS_CONFIG: Record<RetentionStatus, { label: string; color: string; icon: React.ElementType }> = {
  held:               { label: "Zatrzymana",         color: "bg-blue-100 text-blue-700",    icon: Clock },
  partially_released: { label: "Częściowo zwrócona", color: "bg-orange-100 text-orange-700",icon: AlertTriangle },
  released:           { label: "Zwrócona",           color: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  disputed:           { label: "Sporna",             color: "bg-red-100 text-red-700",      icon: AlertTriangle },
};

function fmt(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(n);
}

export function KaucjaClient({ projectId, initialRetentions }: { projectId: string; initialRetentions: RetentionPayment[] }) {
  const [retentions, setRetentions] = useState<RetentionPayment[]>(initialRetentions);
  const [showForm, setShowForm] = useState(false);
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const [releaseAmount, setReleaseAmount] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", description: "", partyName: "", direction: "held" as RetentionDirection,
    contractValue: "", retentionPct: "5",
    releaseCondition: "", releaseDate: "", notes: "",
  });

  const totalHeld = retentions.filter((r) => r.status !== "released").reduce((s, r) => s + (r.retention_amount ?? 0), 0);
  const totalReleased = retentions.filter((r) => r.status === "released").reduce((s, r) => s + (r.released_amount ?? r.retention_amount ?? 0), 0);
  const dueForRelease = retentions.filter((r) => r.status === "held" && r.release_date && new Date(r.release_date) <= new Date()).length;

  function handleCreate() {
    if (!form.title.trim() || !form.partyName.trim() || !form.contractValue) { setError("Tytuł, strona i wartość umowy są wymagane"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createRetention({
        projectId, title: form.title, description: form.description || undefined,
        partyName: form.partyName, direction: form.direction,
        contractValue: Number(form.contractValue), retentionPct: Number(form.retentionPct),
        releaseCondition: form.releaseCondition || undefined,
        releaseDate: form.releaseDate || undefined, notes: form.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const pct = Number(form.retentionPct);
      const cv = Number(form.contractValue);
      const newR: RetentionPayment = {
        id: res.id!, project_id: projectId, org_id: "", created_by: null,
        title: form.title, description: form.description || null,
        party_name: form.partyName, direction: form.direction,
        contract_value: cv, retention_pct: pct,
        retention_amount: Math.round(cv * pct / 100 * 100) / 100,
        release_condition: form.releaseCondition || null, release_date: form.releaseDate || null,
        released_at: null, released_amount: null, status: "held", notes: form.notes || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setRetentions((prev) => [newR, ...prev]);
      setShowForm(false);
      setForm({ title: "", description: "", partyName: "", direction: "held", contractValue: "", retentionPct: "5", releaseCondition: "", releaseDate: "", notes: "" });
    });
  }

  function handleRelease() {
    if (!releaseId || !releaseAmount) return;
    startTransition(async () => {
      const ret = retentions.find((r) => r.id === releaseId);
      await releaseRetention(releaseId, projectId, Number(releaseAmount), releaseNotes || undefined);
      const isFullRelease = ret ? Number(releaseAmount) >= (ret.retention_amount ?? 0) : false;
      setRetentions((prev) => prev.map((r) => r.id === releaseId
        ? { ...r, status: isFullRelease ? "released" as const : "partially_released" as const, released_amount: Number(releaseAmount), released_at: new Date().toISOString().slice(0, 10) }
        : r));
      setReleaseId(null); setReleaseAmount(""); setReleaseNotes("");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Kaucja gwarancyjna</h1>
          <p className="text-sm text-muted-foreground">Rejestr kaucji gwarancyjnych wg art. 647¹ KC — zatrzymania i zwroty</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-1 h-4 w-4" />Dodaj kaucję</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-blue-200"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Zatrzymane łącznie</p><p className="text-2xl font-bold text-blue-700">{fmt(totalHeld)}</p></CardContent></Card>
        <Card className={dueForRelease > 0 ? "border-orange-200" : ""}><CardContent className="p-4"><p className="text-xs text-muted-foreground">Gotowe do zwrotu</p><p className="text-2xl font-bold text-orange-600">{dueForRelease}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Zwrócone</p><p className="text-2xl font-bold text-green-600">{fmt(totalReleased)}</p></CardContent></Card>
      </div>

      {releaseId && (
        <Card className="border-green-200">
          <CardHeader className="pb-3"><CardTitle className="text-base text-green-700">Zwróć kaucję</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="text-sm font-medium">Kwota zwrotu (PLN) *</label>
                <Input type="number" value={releaseAmount} onChange={(e) => setReleaseAmount(e.target.value)} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Uwagi</label>
                <Input value={releaseNotes} onChange={(e) => setReleaseNotes(e.target.value)} className="mt-1" /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleRelease} disabled={pending}>Zapisz zwrot</Button>
              <Button variant="outline" onClick={() => setReleaseId(null)}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowa kaucja gwarancyjna</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="text-sm font-medium">Tytuł *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="np. Kaucja za roboty murarskie — etap 1" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Strona (kto zatrzymuje/płaci) *</label>
                <Input value={form.partyName} onChange={(e) => setForm({ ...form, partyName: e.target.value })} placeholder="np. Jan Kowalski — Inwestor" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Kierunek</label>
                <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as RetentionDirection })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="held">Zatrzymujemy (od podwykonawcy)</option>
                  <option value="paid_out">Płacimy (do inwestora)</option>
                </select></div>
              <div><label className="text-sm font-medium">Wartość umowy (PLN) *</label>
                <Input type="number" value={form.contractValue} onChange={(e) => setForm({ ...form, contractValue: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Procent kaucji (%)</label>
                <Input type="number" value={form.retentionPct} onChange={(e) => setForm({ ...form, retentionPct: e.target.value })} step="0.5" className="mt-1" /></div>
              {form.contractValue && form.retentionPct && (
                <div className="sm:col-span-2 bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
                  <span className="font-medium">Kwota kaucji: </span>
                  <span className="text-blue-700 font-bold">{fmt(Number(form.contractValue) * Number(form.retentionPct) / 100)}</span>
                </div>
              )}
              <div className="sm:col-span-2"><label className="text-sm font-medium">Warunek zwrotu</label>
                <Input value={form.releaseCondition} onChange={(e) => setForm({ ...form, releaseCondition: e.target.value })} placeholder="np. 60 dni po podpisaniu protokołu odbioru końcowego" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Data zwrotu</label>
                <Input type="date" value={form.releaseDate} onChange={(e) => setForm({ ...form, releaseDate: e.target.value })} className="mt-1" /></div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Zapisywanie..." : "Dodaj"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {retentions.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
          <Banknote className="mx-auto h-12 w-12 opacity-20 mb-3" />
          <p className="font-medium">Brak kaucji gwarancyjnych</p>
          <p className="text-sm mt-1">Rejestruj kaucje wg art. 647¹ KC — zarówno zatrzymywane przez nas jak i przez inwestora</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {retentions.map((r) => {
            const cfg = STATUS_CONFIG[r.status];
            const Icon = cfg.icon;
            const isDueForRelease = r.status === "held" && r.release_date && new Date(r.release_date) <= new Date();
            return (
              <Card key={r.id} className={isDueForRelease ? "border-orange-200 bg-orange-50/20" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                          <Icon className="h-3 w-3" />{cfg.label}
                        </span>
                        <span className="text-xs bg-muted rounded px-1.5 py-0.5">{r.direction === "held" ? "Zatrzymujemy" : "Płacimy"}</span>
                        {isDueForRelease && <span className="text-xs text-orange-600 font-semibold">⚠ Termin zwrotu minął</span>}
                      </div>
                      <p className="font-semibold">{r.title}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span>{r.party_name}</span>
                        <span>Umowa: {fmt(r.contract_value)}</span>
                        <span className="font-medium text-foreground">Kaucja ({r.retention_pct}%): {fmt(r.retention_amount ?? 0)}</span>
                        {r.release_date && <span>Termin zwrotu: {new Date(r.release_date).toLocaleDateString("pl-PL")}</span>}
                      </div>
                      {r.release_condition && <p className="text-xs text-muted-foreground mt-0.5">Warunek: {r.release_condition}</p>}
                      {r.released_amount && <p className="text-xs text-green-700 mt-0.5">Zwrócono: {fmt(r.released_amount)}</p>}
                    </div>
                    {(r.status === "held" || r.status === "partially_released") && (
                      <Button size="sm" onClick={() => { setReleaseId(r.id); setReleaseAmount(String(r.retention_amount ?? "")); }} disabled={pending}>
                        <Banknote className="mr-1 h-3 w-3" />Zwróć
                      </Button>
                    )}
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
