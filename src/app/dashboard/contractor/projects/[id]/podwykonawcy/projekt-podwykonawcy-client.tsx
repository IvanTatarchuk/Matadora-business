"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, HardHat, CheckCircle2, XCircle } from "lucide-react";
import {
  createSubcontractorContract, updateContractStatus, updateContractPayment,
  type Subcontractor, type SubcontractorContract,
} from "@/lib/actions/subcontractors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const CONTRACT_STATUS_CONFIG: Record<SubcontractorContract["status"], { label: string; color: string }> = {
  draft:      { label: "Szkic",       color: "bg-slate-100 text-slate-600" },
  active:     { label: "Aktywna",     color: "bg-green-100 text-green-700" },
  completed:  { label: "Ukończona",   color: "bg-blue-100 text-blue-700" },
  terminated: { label: "Rozwiązana",  color: "bg-red-100 text-red-700" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(n);
}

export function ProjektPodwykonawcyClient({
  projectId,
  allSubcontractors,
  initialContracts,
}: {
  projectId: string;
  allSubcontractors: Subcontractor[];
  initialContracts: SubcontractorContract[];
}) {
  const [contracts, setContracts] = useState<SubcontractorContract[]>(initialContracts);
  const [showForm, setShowForm] = useState(false);
  const [editPayment, setEditPayment] = useState<string | null>(null);
  const [paymentValue, setPaymentValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    subcontractorId: allSubcontractors[0]?.id ?? "",
    scopeDescription: "", contractNumber: "",
    startDate: "", endDate: "", contractValue: "",
    retentionPercent: "10", notes: "",
  });

  const totalValue = contracts.reduce((s, c) => s + c.contract_value, 0);
  const totalPaid = contracts.reduce((s, c) => s + c.paid_to_date, 0);
  const totalRetention = contracts.reduce((s, c) => s + (c.contract_value - c.paid_to_date) * c.retention_percent / 100, 0);

  function handleCreate() {
    if (!form.subcontractorId || !form.scopeDescription.trim() || !form.contractValue) {
      setError("Podwykonawca, zakres i wartość są wymagane"); return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createSubcontractorContract({
        projectId, subcontractorId: form.subcontractorId,
        scopeDescription: form.scopeDescription,
        contractNumber: form.contractNumber || undefined,
        startDate: form.startDate || undefined, endDate: form.endDate || undefined,
        contractValue: Number(form.contractValue),
        retentionPercent: Number(form.retentionPercent),
        notes: form.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const sub = allSubcontractors.find((s) => s.id === form.subcontractorId);
      const newContract: SubcontractorContract = {
        id: res.id!, project_id: projectId, subcontractor_id: form.subcontractorId,
        org_id: "", contract_number: form.contractNumber || null,
        scope_description: form.scopeDescription,
        start_date: form.startDate || null, end_date: form.endDate || null,
        contract_value: Number(form.contractValue), paid_to_date: 0,
        retention_percent: Number(form.retentionPercent), status: "draft",
        notes: form.notes || null, created_at: new Date().toISOString(),
        subcontractor_name: sub?.name ?? undefined,
      };
      setContracts((prev) => [newContract, ...prev]);
      setShowForm(false);
      setForm({ subcontractorId: allSubcontractors[0]?.id ?? "", scopeDescription: "", contractNumber: "", startDate: "", endDate: "", contractValue: "", retentionPercent: "10", notes: "" });
    });
  }

  function handleStatusChange(id: string, status: SubcontractorContract["status"]) {
    startTransition(async () => {
      await updateContractStatus(id, projectId, status);
      setContracts((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
    });
  }

  function handlePaymentUpdate(id: string) {
    startTransition(async () => {
      await updateContractPayment(id, projectId, Number(paymentValue));
      setContracts((prev) => prev.map((c) => c.id === id ? { ...c, paid_to_date: Number(paymentValue) } : c));
      setEditPayment(null); setPaymentValue("");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Podwykonawcy projektu</h1>
          <p className="text-sm text-muted-foreground">Umowy z podwykonawcami, rozliczenia i kaucje gwarancyjne</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={allSubcontractors.length === 0}>
          <Plus className="mr-1 h-4 w-4" /> Dodaj umowę
        </Button>
      </div>

      {allSubcontractors.length === 0 && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          Brak podwykonawców w katalogu.{" "}
          <Link href="/dashboard/podwykonawcy" className="font-medium underline">Dodaj podwykonawców</Link> przed przypisaniem do projektu.
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Wartość umów</p><p className="text-xl font-bold">{fmt(totalValue)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Zapłacono łącznie</p><p className="text-xl font-bold text-green-600">{fmt(totalPaid)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Kaucja gwarancyjna</p><p className="text-xl font-bold text-orange-600">{fmt(totalRetention)}</p></CardContent></Card>
      </div>

      {/* FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowa umowa z podwykonawcą</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Podwykonawca *</label>
                <select value={form.subcontractorId} onChange={(e) => setForm({ ...form, subcontractorId: e.target.value })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {allSubcontractors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Zakres robót *</label>
                <textarea value={form.scopeDescription} onChange={(e) => setForm({ ...form, scopeDescription: e.target.value })}
                  rows={2} placeholder="np. Wykonanie instalacji elektrycznej wewnętrznej, rozdzielnie, okablowanie"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
              </div>
              <div><label className="text-sm font-medium">Nr umowy</label>
                <Input value={form.contractNumber} onChange={(e) => setForm({ ...form, contractNumber: e.target.value })} placeholder="np. ZP/2024/001" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Wartość umowy (PLN netto) *</label>
                <Input type="number" min={0} value={form.contractValue} onChange={(e) => setForm({ ...form, contractValue: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Data rozpoczęcia</label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Data zakończenia</label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Kaucja gwarancyjna (%)</label>
                <Input type="number" min={0} max={30} value={form.retentionPercent} onChange={(e) => setForm({ ...form, retentionPercent: e.target.value })} className="mt-1" /></div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Zapisywanie..." : "Zapisz umowę"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CONTRACTS LIST */}
      {contracts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <HardHat className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Brak umów z podwykonawcami</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => {
            const cfg = CONTRACT_STATUS_CONFIG[c.status];
            const remaining = c.contract_value - c.paid_to_date;
            const retention = remaining * c.retention_percent / 100;
            const progress = c.contract_value > 0 ? (c.paid_to_date / c.contract_value) * 100 : 0;
            return (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                        {c.contract_number && <span className="text-xs font-mono text-muted-foreground">{c.contract_number}</span>}
                      </div>
                      <p className="font-semibold">{c.subcontractor_name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{c.scope_description}</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-4 text-sm">
                        <div><p className="text-xs text-muted-foreground">Wartość umowy</p><p className="font-semibold">{fmt(c.contract_value)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Zapłacono</p><p className="font-semibold text-green-600">{fmt(c.paid_to_date)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Pozostało</p><p className="font-semibold">{fmt(remaining)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Kaucja ({c.retention_percent}%)</p><p className="font-semibold text-orange-600">{fmt(retention)}</p></div>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
                          <span>Postęp rozliczeń</span><span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                        </div>
                      </div>
                      {editPayment === c.id && (
                        <div className="flex gap-2 mt-2">
                          <Input type="number" min={0} max={c.contract_value} value={paymentValue}
                            onChange={(e) => setPaymentValue(e.target.value)}
                            placeholder={`Max ${fmt(c.contract_value)}`} className="max-w-xs" />
                          <Button size="sm" onClick={() => handlePaymentUpdate(c.id)} disabled={pending}>Zapisz</Button>
                          <Button size="sm" variant="outline" onClick={() => { setEditPayment(null); setPaymentValue(""); }}>Anuluj</Button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {c.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(c.id, "active")} disabled={pending}>
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Aktywuj
                        </Button>
                      )}
                      {c.status === "active" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(c.id, "completed")} disabled={pending}>
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Ukończ
                        </Button>
                      )}
                      {["active","draft"].includes(c.status) && (
                        <Button size="sm" variant="outline" onClick={() => { setEditPayment(c.id); setPaymentValue(String(c.paid_to_date)); }}>
                          Rozlicz
                        </Button>
                      )}
                      {c.status === "active" && (
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleStatusChange(c.id, "terminated")} disabled={pending}>
                          <XCircle className="mr-1 h-3 w-3" /> Rozwiąż
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
