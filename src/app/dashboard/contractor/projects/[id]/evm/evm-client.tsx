"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { createEvmSnapshot, type EvmSnapshot } from "@/lib/actions/evm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EvmSCurve } from "./evm-chart";

function fmt(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(n);
}

function fmtPct(n: number | null) {
  if (n == null) return "—";
  return `${n.toFixed(1)}%`;
}

function fmtIdx(n: number | null) {
  if (n == null) return "—";
  return n.toFixed(3);
}

function spiColor(spi: number | null) {
  if (!spi) return "";
  if (spi >= 0.95) return "text-green-600";
  if (spi >= 0.8) return "text-yellow-600";
  return "text-red-600";
}

export function EvmClient({ projectId, initialSnapshots }: { projectId: string; initialSnapshots: EvmSnapshot[] }) {
  const [snapshots, setSnapshots] = useState<EvmSnapshot[]>(initialSnapshots);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    snapshotDate: new Date().toISOString().slice(0, 10),
    periodLabel: "",
    bac: "", pv: "", ev: "", ac: "", notes: "",
  });

  const latest = snapshots[0];

  function handleCreate() {
    if (!form.bac || !form.pv || !form.ev || !form.ac) { setError("BAC, PV, EV i AC są wymagane"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createEvmSnapshot({
        projectId, snapshotDate: form.snapshotDate,
        periodLabel: form.periodLabel || undefined,
        bac: Number(form.bac), pv: Number(form.pv),
        ev: Number(form.ev), ac: Number(form.ac),
        notes: form.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const bac = Number(form.bac), pv = Number(form.pv), ev = Number(form.ev), ac = Number(form.ac);
      const newSnap: EvmSnapshot = {
        id: res.id!, project_id: projectId, org_id: "", created_by: null,
        snapshot_date: form.snapshotDate, period_label: form.periodLabel || null,
        bac, pv, ev, ac,
        sv: ev - pv, cv: ev - ac,
        spi: pv > 0 ? ev / pv : null, cpi: ac > 0 ? ev / ac : null,
        etc: ev > 0 ? (bac - ev) / (ev / ac) : bac - ev,
        eac: ac + (ev > 0 ? (bac - ev) / (ev / ac) : bac - ev),
        percent_complete: bac > 0 ? (ev / bac) * 100 : 0,
        notes: form.notes || null, created_at: new Date().toISOString(),
      };
      setSnapshots((prev) => [newSnap, ...prev]);
      setShowForm(false);
      setForm({ snapshotDate: new Date().toISOString().slice(0, 10), periodLabel: "", bac: "", pv: "", ev: "", ac: "", notes: "" });
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2"><Activity className="h-5 w-5" />Earned Value Analysis (EVM)</h1>
          <p className="text-sm text-muted-foreground">Analiza wartości wypracowanej — SPI, CPI, EAC według PMI PMBOK</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-1 h-4 w-4" />Nowy snapshot</Button>
      </div>

      {/* EVM LEGEND */}
      <Card className="bg-muted/30">
        <CardContent className="p-4 grid gap-2 sm:grid-cols-4 text-xs">
          <div><span className="font-bold">BAC</span> — Budget at Completion — całkowity budżet projektu</div>
          <div><span className="font-bold">PV</span> — Planned Value (BCWS) — ile miało być zrobione</div>
          <div><span className="font-bold">EV</span> — Earned Value (BCWP) — ile rzeczywiście zrobiono (wartość)</div>
          <div><span className="font-bold">AC</span> — Actual Cost (ACWP) — ile faktycznie wydano</div>
          <div><span className={`font-bold`}>SPI</span> — Schedule Performance Index = EV/PV. {">"}1 = przed harmonogramem</div>
          <div><span className="font-bold">CPI</span> — Cost Performance Index = EV/AC. {">"}1 = poniżej budżetu</div>
          <div><span className="font-bold">EAC</span> — Estimate at Completion — przewidywany koszt końcowy</div>
          <div><span className="font-bold">ETC</span> — Estimate to Complete — ile jeszcze zostało do wydania</div>
        </CardContent>
      </Card>

      {/* LATEST SNAPSHOT KPIs */}
      {latest && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Ostatni snapshot: {new Date(latest.snapshot_date).toLocaleDateString("pl-PL")} {latest.period_label ? `— ${latest.period_label}` : ""}</p>
          <div className="grid gap-3 sm:grid-cols-4">
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Postęp (%complete)</p>
              <p className="text-2xl font-bold">{fmtPct(latest.percent_complete)}</p>
              <div className="mt-1 h-1.5 bg-muted rounded-full"><div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(100, latest.percent_complete ?? 0)}%` }} /></div>
            </CardContent></Card>
            <Card className={latest.spi != null && latest.spi < 0.9 ? "border-red-200" : latest.spi != null && latest.spi >= 0.95 ? "border-green-200" : ""}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">SPI (harmonogram)</p>
                <p className={`text-2xl font-bold ${spiColor(latest.spi)}`}>{fmtIdx(latest.spi)}</p>
                <p className="text-xs text-muted-foreground">SV: {fmt(latest.sv)}</p>
              </CardContent>
            </Card>
            <Card className={latest.cpi != null && latest.cpi < 0.9 ? "border-red-200" : latest.cpi != null && latest.cpi >= 0.95 ? "border-green-200" : ""}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">CPI (koszty)</p>
                <p className={`text-2xl font-bold ${spiColor(latest.cpi)}`}>{fmtIdx(latest.cpi)}</p>
                <p className="text-xs text-muted-foreground">CV: {fmt(latest.cv)}</p>
              </CardContent>
            </Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">EAC (prognoza całkowita)</p>
              <p className="text-xl font-bold">{fmt(latest.eac)}</p>
              <p className="text-xs text-muted-foreground">BAC: {fmt(latest.bac)}</p>
            </CardContent></Card>
          </div>
          <div className="grid gap-3 sm:grid-cols-4 mt-3">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">PV (zaplanowano)</p><p className="text-lg font-bold">{fmt(latest.pv)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">EV (wypracowano)</p><p className={`text-lg font-bold ${(latest.ev ?? 0) >= (latest.pv ?? 0) ? "text-green-700" : "text-orange-600"}`}>{fmt(latest.ev)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">AC (wydano)</p><p className={`text-lg font-bold ${(latest.ac ?? 0) <= (latest.ev ?? 0) ? "text-green-700" : "text-red-600"}`}>{fmt(latest.ac)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">ETC (do wydania)</p><p className="text-lg font-bold">{fmt(latest.etc)}</p></CardContent></Card>
          </div>
        </div>
      )}

      {/* S-CURVE CHART */}
      <EvmSCurve snapshots={snapshots} />

      {/* ADD FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowy snapshot EVM</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className="text-sm font-medium">Data snapshotu *</label>
                <Input type="date" value={form.snapshotDate} onChange={(e) => setForm({ ...form, snapshotDate: e.target.value })} className="mt-1" /></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Etykieta okresu</label>
                <Input value={form.periodLabel} onChange={(e) => setForm({ ...form, periodLabel: e.target.value })} placeholder="np. Tydzień 22, Maj 2025" className="mt-1" /></div>
              <div><label className="text-sm font-medium">BAC (PLN) *</label>
                <Input type="number" value={form.bac} onChange={(e) => setForm({ ...form, bac: e.target.value })} placeholder="Całkowity budżet" className="mt-1" /></div>
              <div><label className="text-sm font-medium">PV (PLN) *</label>
                <Input type="number" value={form.pv} onChange={(e) => setForm({ ...form, pv: e.target.value })} placeholder="Planned Value" className="mt-1" /></div>
              <div><label className="text-sm font-medium">EV (PLN) *</label>
                <Input type="number" value={form.ev} onChange={(e) => setForm({ ...form, ev: e.target.value })} placeholder="Earned Value" className="mt-1" /></div>
              <div><label className="text-sm font-medium">AC (PLN) *</label>
                <Input type="number" value={form.ac} onChange={(e) => setForm({ ...form, ac: e.target.value })} placeholder="Actual Cost" className="mt-1" /></div>
              {form.bac && form.pv && form.ev && form.ac && (
                <div className="sm:col-span-3 grid grid-cols-4 gap-2 bg-muted/40 rounded-md p-3 text-sm">
                  {[
                    ["SPI", (Number(form.pv) > 0 ? Number(form.ev) / Number(form.pv) : null)?.toFixed(3)],
                    ["CPI", (Number(form.ac) > 0 ? Number(form.ev) / Number(form.ac) : null)?.toFixed(3)],
                    ["SV", `${((Number(form.ev) - Number(form.pv)) / 1000).toFixed(0)}k PLN`],
                    ["CV", `${((Number(form.ev) - Number(form.ac)) / 1000).toFixed(0)}k PLN`],
                  ].map(([label, val]) => (
                    <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="font-bold">{val}</p></div>
                  ))}
                </div>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Zapisywanie..." : "Zapisz snapshot"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* HISTORY TABLE */}
      {snapshots.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
          <Activity className="mx-auto h-12 w-12 opacity-20 mb-3" />
          <p className="font-medium">Brak snapshots EVM</p>
          <p className="text-sm mt-1">Dodaj pierwszy snapshot, aby śledzić wskaźniki EVM w czasie</p>
        </CardContent></Card>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-2 py-2">Data</th>
                <th className="text-left px-2 py-2">Okres</th>
                <th className="text-right px-2 py-2">%</th>
                <th className="text-right px-2 py-2">SPI</th>
                <th className="text-right px-2 py-2">CPI</th>
                <th className="text-right px-2 py-2">PV</th>
                <th className="text-right px-2 py-2">EV</th>
                <th className="text-right px-2 py-2">AC</th>
                <th className="text-right px-2 py-2">EAC</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s, i) => {
                const prev = snapshots[i + 1];
                const spiTrend = prev && s.spi != null && prev.spi != null ? s.spi - prev.spi : null;
                return (
                  <tr key={s.id} className="border-t hover:bg-muted/20">
                    <td className="px-2 py-1.5">{new Date(s.snapshot_date).toLocaleDateString("pl-PL")}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{s.period_label ?? "—"}</td>
                    <td className="px-2 py-1.5 text-right font-medium">{fmtPct(s.percent_complete)}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${spiColor(s.spi)}`}>
                      {fmtIdx(s.spi)}
                      {spiTrend != null && (spiTrend > 0 ? <TrendingUp className="inline h-2.5 w-2.5 ml-0.5 text-green-500" /> : <TrendingDown className="inline h-2.5 w-2.5 ml-0.5 text-red-500" />)}
                    </td>
                    <td className={`px-2 py-1.5 text-right font-bold ${spiColor(s.cpi)}`}>{fmtIdx(s.cpi)}</td>
                    <td className="px-2 py-1.5 text-right">{fmt(s.pv)}</td>
                    <td className="px-2 py-1.5 text-right">{fmt(s.ev)}</td>
                    <td className="px-2 py-1.5 text-right">{fmt(s.ac)}</td>
                    <td className="px-2 py-1.5 text-right font-medium">{fmt(s.eac)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
