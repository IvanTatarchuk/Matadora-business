"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, FileText, CheckCircle2, Clock, XCircle,
  AlertTriangle, Download, Send, Trash2, X, TrendingUp, TrendingDown,
} from "lucide-react";
import {
  createChangeOrder,
  submitChangeOrder,
  approveChangeOrder,
  rejectChangeOrder,
  withdrawChangeOrder,
  deleteChangeOrder,
  type ChangeOrder,
  type ChangeOrderReason,
} from "@/lib/actions/change-orders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const REASON_LABELS: Record<ChangeOrderReason, string> = {
  client_request:       "Żądanie zamawiającego",
  scope_change:         "Zmiana zakresu robót",
  design_change:        "Zmiana projektu / dokumentacji",
  unforeseen_conditions:"Roboty nieprzewidziane",
  material_price_change:"Wzrost cen materiałów",
  force_majeure:        "Siła wyższa",
  site_conditions:      "Warunki gruntowe / terenowe",
  regulatory_change:    "Zmiana przepisów prawa",
  other:                "Inny powód",
};

const STATUS_CONFIG: Record<ChangeOrder["status"], { label: string; color: string; icon: React.ElementType }> = {
  draft:            { label: "Szkic",               color: "bg-slate-100 text-slate-600",   icon: FileText },
  pending_approval: { label: "Oczekuje akceptacji", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  approved:         { label: "Zatwierdzony",         color: "bg-green-100 text-green-700",   icon: CheckCircle2 },
  rejected:         { label: "Odrzucony",            color: "bg-red-100 text-red-700",       icon: XCircle },
  withdrawn:        { label: "Wycofany",             color: "bg-slate-100 text-slate-400",   icon: X },
};

function fmt(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(n);
}

function generateAneksText(co: ChangeOrder): string {
  const today = new Date().toLocaleDateString("pl-PL");
  const vat = co.amount_net * co.vat_rate / 100;
  const reasonLabel = REASON_LABELS[co.reason] ?? co.reason;
  return [
    `ANEKS NR ${co.number_display} DO UMOWY`,
    `Data: ${today}`,
    ``,
    `Tytuł: ${co.title}`,
    ``,
    co.description ? `Opis zmiany:\n${co.description}\n` : "",
    `Powód zmiany: ${reasonLabel}`,
    `Rodzaj: ${co.change_type === "additive" ? "Roboty dodatkowe" : co.change_type === "deductive" ? "Roboty zaniechane" : "Zmiana neutralna"}`,
    ``,
    `ZMIANA WYNAGRODZENIA:`,
    `Kwota netto:   ${fmt(co.amount_net)}`,
    `VAT ${co.vat_rate}%:     ${fmt(vat)}`,
    `Kwota brutto:  ${fmt(co.amount_gross)}`,
    ``,
    co.schedule_days !== 0 ? `WPŁYW NA HARMONOGRAM: ${co.schedule_days > 0 ? "+" : ""}${co.schedule_days} dni roboczych\n` : "",
    `Podstawa prawna: ${co.legal_basis === "art_630_kc" ? "Art. 630 KC (zmiana wynagrodzenia ryczałtowego)" : "Art. 632 §2 KC (rażąca strata)"}`,
    ``,
    `___________________________    ___________________________`,
    `Wykonawca                      Zamawiający`,
  ].join("\n");
}

import React from "react";

export function AneksyClient({
  projectId,
  initialOrders,
}: {
  projectId: string;
  initialOrders: ChangeOrder[];
}) {
  const [orders, setOrders] = useState<ChangeOrder[]>(initialOrders);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [form, setForm] = useState<{
    title: string;
    description: string;
    reason: ChangeOrderReason;
    changeType: "additive" | "deductive" | "neutral";
    amountNet: string;
    vatRate: string;
    scheduleDays: string;
    legalBasis: string;
  }>({
    title: "", description: "", reason: "client_request",
    changeType: "additive", amountNet: "", vatRate: "23",
    scheduleDays: "0", legalBasis: "art_630_kc",
  });

  const totalApproved = orders
    .filter((o) => o.status === "approved")
    .reduce((s, o) => s + o.amount_gross, 0);
  const totalPending = orders
    .filter((o) => o.status === "pending_approval")
    .reduce((s, o) => s + o.amount_gross, 0);
  const daysImpact = orders
    .filter((o) => o.status === "approved")
    .reduce((s, o) => s + o.schedule_days, 0);

  function handleAdd() {
    if (!form.title.trim()) { setError("Tytuł jest wymagany"); return; }
    if (!form.amountNet || Number(form.amountNet) <= 0) { setError("Kwota musi być większa od 0"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createChangeOrder({
        projectId,
        title: form.title,
        description: form.description || undefined,
        reason: form.reason,
        changeType: form.changeType,
        amountNet: Number(form.amountNet),
        vatRate: Number(form.vatRate),
        scheduleDays: Number(form.scheduleDays),
        legalBasis: form.legalBasis,
      });
      if (!res.ok) { setError(res.error ?? "Błąd zapisu"); return; }
      const gross = Number(form.amountNet) * (1 + Number(form.vatRate) / 100);
      const newOrder: ChangeOrder = {
        id: res.id!,
        project_id: projectId,
        contractor_id: "",
        number: orders.length + 1,
        number_display: `ANU-${String(orders.length + 1).padStart(3, "0")}`,
        title: form.title,
        description: form.description || null,
        reason: form.reason,
        change_type: form.changeType,
        amount_net: Number(form.amountNet),
        vat_rate: Number(form.vatRate),
        amount_gross: gross,
        schedule_days: Number(form.scheduleDays),
        status: "draft",
        submitted_at: null,
        approved_at: null,
        approved_by: null,
        rejection_reason: null,
        legal_basis: form.legalBasis,
        previous_contract_value: null,
        new_contract_value: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setOrders((prev) => [newOrder, ...prev]);
      setShowForm(false);
      setForm({ title: "", description: "", reason: "client_request", changeType: "additive", amountNet: "", vatRate: "23", scheduleDays: "0", legalBasis: "art_630_kc" });
    });
  }

  function handleSubmit(id: string) {
    startTransition(async () => {
      await submitChangeOrder(id, projectId);
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "pending_approval", submitted_at: new Date().toISOString() } : o));
    });
  }

  function handleApprove(id: string) {
    startTransition(async () => {
      await approveChangeOrder(id, projectId);
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "approved", approved_at: new Date().toISOString() } : o));
    });
  }

  function handleReject() {
    if (!rejectId) return;
    startTransition(async () => {
      await rejectChangeOrder(rejectId, projectId, rejectReason);
      setOrders((prev) => prev.map((o) => o.id === rejectId ? { ...o, status: "rejected", rejection_reason: rejectReason } : o));
      setRejectId(null);
      setRejectReason("");
    });
  }

  function handleWithdraw(id: string) {
    startTransition(async () => {
      await withdrawChangeOrder(id, projectId);
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "withdrawn" } : o));
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteChangeOrder(id, projectId);
      setOrders((prev) => prev.filter((o) => o.id !== id));
    });
  }

  function downloadAneks(co: ChangeOrder) {
    const text = generateAneksText(co);
    const blob = new Blob(["\uFEFF" + text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aneks-${co.number_display}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Aneksy do umowy</h1>
          <p className="text-sm text-muted-foreground">
            Rejestr zmian zakresu, robót dodatkowych i aneksów — pełny workflow akceptacji
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="mr-1 h-4 w-4" /> Nowy aneks
        </Button>
      </div>

      {/* LEGAL NOTE */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4 text-xs text-blue-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
          <div className="space-y-0.5">
            <p><strong>Art. 630 KC:</strong> Wykonawca może żądać podwyższenia wynagrodzenia, gdy zamawiający zmienił zakres lub sposób robót.</p>
            <p><strong>Art. 632 §2 KC:</strong> Przy rażącej stracie — sądowe podwyższenie wynagrodzenia ryczałtowego.</p>
            <p><strong>Art. 647¹ KC:</strong> Każda zmiana zakresu wobec podwykonawców wymaga pisemnej zgody inwestora.</p>
            <p className="font-semibold mt-1">Zawsze dokumentuj zmiany aneksem PRZED wykonaniem robót.</p>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Zatwierdzone zmiany wartości</p>
            <p className="mt-1 text-xl font-bold text-green-600 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />{fmt(totalApproved)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{orders.filter((o) => o.status === "approved").length} aneksów</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Oczekuje akceptacji</p>
            <p className="mt-1 text-xl font-bold text-yellow-600">{fmt(totalPending)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{orders.filter((o) => o.status === "pending_approval").length} aneksów</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Wpływ na harmonogram</p>
            <p className={`mt-1 text-xl font-bold flex items-center gap-1 ${daysImpact > 0 ? "text-orange-600" : daysImpact < 0 ? "text-green-600" : "text-muted-foreground"}`}>
              {daysImpact > 0 ? <TrendingUp className="h-4 w-4" /> : daysImpact < 0 ? <TrendingDown className="h-4 w-4" /> : null}
              {daysImpact > 0 ? "+" : ""}{daysImpact} dni
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">skumulowany wpływ</p>
          </CardContent>
        </Card>
      </div>

      {/* ADD FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowy aneks do umowy</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tytuł aneksu *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="np. Roboty dodatkowe — izolacja fundamentów"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Opis zmiany</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Szczegółowy opis zakresu zmiany, okoliczności, uzasadnienie..."
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Powód zmiany</label>
                <select
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value as ChangeOrderReason })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {Object.entries(REASON_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Rodzaj</label>
                <select
                  value={form.changeType}
                  onChange={(e) => setForm({ ...form, changeType: e.target.value as "additive" | "deductive" | "neutral" })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="additive">Roboty dodatkowe (+)</option>
                  <option value="deductive">Roboty zaniechane (−)</option>
                  <option value="neutral">Zmiana neutralna (0)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Kwota netto (PLN) *</label>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={form.amountNet}
                  onChange={(e) => setForm({ ...form, amountNet: e.target.value })}
                  placeholder="np. 12000"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Stawka VAT</label>
                <select
                  value={form.vatRate}
                  onChange={(e) => setForm({ ...form, vatRate: e.target.value })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="23">23% (standardowa)</option>
                  <option value="8">8% (budownictwo mieszkalne)</option>
                  <option value="0">0% (zwolnienie)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Wpływ na harmonogram (dni)</label>
                <Input
                  type="number"
                  value={form.scheduleDays}
                  onChange={(e) => setForm({ ...form, scheduleDays: e.target.value })}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Podstawa prawna</label>
                <select
                  value={form.legalBasis}
                  onChange={(e) => setForm({ ...form, legalBasis: e.target.value })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="art_630_kc">Art. 630 KC (zmiana wynagrodzenia)</option>
                  <option value="art_632_kc">Art. 632 §2 KC (rażąca strata)</option>
                  <option value="other">Inna podstawa</option>
                </select>
              </div>
            </div>
            {form.amountNet && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">Podgląd wartości aneksu:</p>
                <p>Netto: {fmt(Number(form.amountNet))}</p>
                <p>VAT ({form.vatRate}%): {fmt(Number(form.amountNet) * Number(form.vatRate) / 100)}</p>
                <p className="font-semibold">Brutto: {fmt(Number(form.amountNet) * (1 + Number(form.vatRate) / 100))}</p>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={pending}>
                {pending ? "Zapisywanie..." : "Zapisz aneks (szkic)"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* REJECT MODAL */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader><CardTitle className="text-base">Powód odrzucenia</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Opisz powód odrzucenia aneksu..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleReject} disabled={pending} className="flex-1">
                  Odrzuć aneks
                </Button>
                <Button variant="outline" onClick={() => setRejectId(null)}>Anuluj</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* LIST */}
      {orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Brak aneksów</p>
            <p className="text-sm mt-1">Dodaj pierwszy aneks klikając &quot;Nowy aneks&quot;</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((co) => {
            const cfg = STATUS_CONFIG[co.status];
            const StatusIcon = cfg.icon;
            return (
              <Card key={co.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-semibold text-muted-foreground">{co.number_display}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${co.change_type === "additive" ? "bg-green-50 text-green-700" : co.change_type === "deductive" ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-600"}`}>
                          {co.change_type === "additive" ? "Dodatkowe" : co.change_type === "deductive" ? "Zaniechane" : "Neutralne"}
                        </span>
                        <span className="text-xs text-muted-foreground">{REASON_LABELS[co.reason]}</span>
                      </div>
                      <p className="font-semibold">{co.title}</p>
                      {co.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{co.description}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-sm flex-wrap">
                        <span className={`font-semibold ${co.change_type === "deductive" ? "text-red-600" : "text-primary"}`}>
                          {co.change_type === "deductive" ? "−" : "+"}{fmt(co.amount_gross)} brutto
                        </span>
                        {co.schedule_days !== 0 && (
                          <span className="text-muted-foreground">
                            {co.schedule_days > 0 ? "+" : ""}{co.schedule_days} dni
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          {new Date(co.created_at).toLocaleDateString("pl-PL")}
                        </span>
                      </div>
                      {co.approved_at && (
                        <p className="text-xs text-green-700 mt-1">
                          ✓ Zatwierdzono {new Date(co.approved_at).toLocaleDateString("pl-PL")}
                          {co.approver_name ? ` przez ${co.approver_name}` : ""}
                        </p>
                      )}
                      {co.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1">Powód odrzucenia: {co.rejection_reason}</p>
                      )}
                      {co.new_contract_value && co.previous_contract_value && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Wartość kontraktu: {fmt(co.previous_contract_value)} → {fmt(co.new_contract_value)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0 items-end">
                      {co.status === "draft" && (
                        <>
                          <Button size="sm" onClick={() => handleSubmit(co.id)} disabled={pending}>
                            <Send className="mr-1 h-3 w-3" /> Wyślij do akceptacji
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(co.id)} disabled={pending}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </>
                      )}
                      {co.status === "pending_approval" && (
                        <>
                          <Button size="sm" variant="outline" className="text-green-600 border-green-300" onClick={() => handleApprove(co.id)} disabled={pending}>
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Zatwierdź
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={() => setRejectId(co.id)} disabled={pending}>
                            <XCircle className="mr-1 h-3 w-3" /> Odrzuć
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleWithdraw(co.id)} disabled={pending}>
                            <X className="h-3 w-3" /> Wycofaj
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="outline" onClick={() => downloadAneks(co)}>
                        <Download className="mr-1 h-3 w-3" /> Pobierz
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
