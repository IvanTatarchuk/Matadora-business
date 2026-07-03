"use client";

import { useState, useTransition } from "react";
import { Plus, X, Receipt, CheckCircle2, Clock, AlertTriangle, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import {
  createInvoice, markInvoicePaid, updateInvoiceStatus,
  type Invoice, type InvoiceDirection, type InvoiceType, type InvoiceStatus,
} from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import React from "react";

const TYPE_LABELS: Record<InvoiceType, string> = {
  vat:        "Faktura VAT",
  proforma:   "Pro-forma",
  advance:    "Faktura zaliczkowa",
  correction: "Faktura korygująca",
  note:       "Nota obciążeniowa",
  other:      "Inne",
};

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft:          { label: "Szkic",              color: "bg-slate-100 text-slate-500",   icon: Receipt },
  sent:           { label: "Wysłana",            color: "bg-blue-100 text-blue-700",     icon: ArrowUpRight },
  unpaid:         { label: "Nieopłacona",        color: "bg-yellow-100 text-yellow-700", icon: Clock },
  partially_paid: { label: "Częściowo zapł.",    color: "bg-orange-100 text-orange-700", icon: Clock },
  paid:           { label: "Opłacona",           color: "bg-green-100 text-green-700",   icon: CheckCircle2 },
  overdue:        { label: "Przeterminowana",    color: "bg-red-100 text-red-700",       icon: AlertTriangle },
  cancelled:      { label: "Anulowana",          color: "bg-slate-100 text-slate-400",   icon: X },
};

const VAT_RATES = [0, 5, 8, 23];

function fmt(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(n);
}

export function FakturyClient({ initialInvoices }: { initialInvoices: Invoice[] }) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [showForm, setShowForm] = useState(false);
  const [filterDir, setFilterDir] = useState<"all" | InvoiceDirection>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "unpaid" | "overdue">("all");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    invoiceNumber: "", direction: "outgoing" as InvoiceDirection, type: "vat" as InvoiceType,
    counterparty: "", nip: "", issueDate: new Date().toISOString().slice(0, 10),
    saleDate: "", dueDate: "", netAmount: "", vatRate: "23", currency: "PLN",
    paymentMethod: "transfer", bankAccount: "", description: "", notes: "",
  });

  const now = new Date();
  const outgoing = invoices.filter((i) => i.direction === "outgoing");
  const incoming = invoices.filter((i) => i.direction === "incoming");

  const stats = {
    totalReceivable: outgoing.filter((i) => !["paid","cancelled","draft"].includes(i.status)).reduce((s, i) => s + (i.gross_amount ?? 0), 0),
    totalPayable: incoming.filter((i) => !["paid","cancelled","draft"].includes(i.status)).reduce((s, i) => s + (i.gross_amount ?? 0), 0),
    overdue: invoices.filter((i) => i.due_date && new Date(i.due_date) < now && !["paid","cancelled"].includes(i.status)).length,
    paid: invoices.filter((i) => i.status === "paid").length,
  };

  const filtered = invoices.filter((i) => {
    if (filterDir !== "all" && i.direction !== filterDir) return false;
    if (filterStatus === "unpaid" && !["unpaid","partially_paid"].includes(i.status)) return false;
    if (filterStatus === "overdue" && !(i.due_date && new Date(i.due_date) < now && !["paid","cancelled"].includes(i.status))) return false;
    return true;
  });

  function handleCreate() {
    if (!form.invoiceNumber.trim() || !form.counterparty.trim() || !form.netAmount) {
      setError("Numer, kontrahent i kwota netto są wymagane"); return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createInvoice({
        invoiceNumber: form.invoiceNumber, direction: form.direction, type: form.type,
        counterparty: form.counterparty, nip: form.nip || undefined,
        issueDate: form.issueDate, saleDate: form.saleDate || undefined,
        dueDate: form.dueDate || undefined, netAmount: Number(form.netAmount),
        vatRate: Number(form.vatRate), currency: form.currency,
        paymentMethod: form.paymentMethod, bankAccount: form.bankAccount || undefined,
        description: form.description || undefined, notes: form.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const net = Number(form.netAmount);
      const vatAmt = net * Number(form.vatRate) / 100;
      const newInv: Invoice = {
        id: res.id!, project_id: null, org_id: "", created_by: null,
        invoice_number: form.invoiceNumber, direction: form.direction, type: form.type,
        counterparty: form.counterparty, nip: form.nip || null,
        issue_date: form.issueDate, sale_date: form.saleDate || null,
        due_date: form.dueDate || null, paid_date: null,
        net_amount: net, vat_rate: Number(form.vatRate),
        vat_amount: vatAmt, gross_amount: net + vatAmt,
        currency: form.currency, status: "unpaid",
        ksef_reference: null, payment_method: form.paymentMethod,
        bank_account: form.bankAccount || null,
        description: form.description || null, notes: form.notes || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setInvoices((prev) => [newInv, ...prev]);
      setShowForm(false);
      setForm({ invoiceNumber: "", direction: "outgoing", type: "vat", counterparty: "", nip: "", issueDate: new Date().toISOString().slice(0, 10), saleDate: "", dueDate: "", netAmount: "", vatRate: "23", currency: "PLN", paymentMethod: "transfer", bankAccount: "", description: "", notes: "" });
    });
  }

  function handleMarkPaid(id: string) {
    startTransition(async () => {
      await markInvoicePaid(id);
      setInvoices((prev) => prev.map((i) => i.id === id ? { ...i, status: "paid" as const, paid_date: new Date().toISOString().slice(0, 10) } : i));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6" />Faktury</h1>
          <p className="text-sm text-muted-foreground">Rejestr faktur przychodzących i wychodzących — gotowy do integracji KSeF</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-1 h-4 w-4" />Nowa faktura</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="border-green-200"><CardContent className="p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />Do otrzymania</p><p className="text-xl font-bold text-green-700">{fmt(stats.totalReceivable)}</p></CardContent></Card>
        <Card className="border-orange-200"><CardContent className="p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowDownLeft className="h-3 w-3" />Do zapłaty</p><p className="text-xl font-bold text-orange-700">{fmt(stats.totalPayable)}</p></CardContent></Card>
        <Card className={stats.overdue > 0 ? "border-red-200" : ""}><CardContent className="p-4"><p className="text-xs text-muted-foreground">Przeterminowane</p><p className="text-2xl font-bold text-red-600">{stats.overdue}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Opłacone</p><p className="text-2xl font-bold text-green-600">{stats.paid}</p></CardContent></Card>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowa faktura</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className="text-sm font-medium">Numer faktury *</label>
                <Input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="np. FV/2025/001" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Kierunek</label>
                <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as InvoiceDirection })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="outgoing">Wychodząca (przychodowa)</option>
                  <option value="incoming">Przychodząca (kosztowa)</option>
                </select></div>
              <div><label className="text-sm font-medium">Typ</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as InvoiceType })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Kontrahent *</label>
                <Input value={form.counterparty} onChange={(e) => setForm({ ...form, counterparty: e.target.value })} placeholder="Nazwa firmy / osoby" className="mt-1" /></div>
              <div><label className="text-sm font-medium">NIP</label>
                <Input value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} placeholder="000-000-00-00" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Data wystawienia *</label>
                <Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Data sprzedaży</label>
                <Input type="date" value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Termin płatności</label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Kwota netto (PLN) *</label>
                <Input type="number" value={form.netAmount} onChange={(e) => setForm({ ...form, netAmount: e.target.value })} step="0.01" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Stawka VAT (%)</label>
                <select value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {VAT_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                </select></div>
              {form.netAmount && (
                <div className="bg-muted/40 rounded-md p-3 text-sm">
                  <p>Netto: <strong>{fmt(Number(form.netAmount))}</strong></p>
                  <p>VAT: <strong>{fmt(Number(form.netAmount) * Number(form.vatRate) / 100)}</strong></p>
                  <p className="text-base font-bold">Brutto: {fmt(Number(form.netAmount) * (1 + Number(form.vatRate) / 100))}</p>
                </div>
              )}
              <div><label className="text-sm font-medium">Sposób płatności</label>
                <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="transfer">Przelew</option>
                  <option value="cash">Gotówka</option>
                  <option value="card">Karta</option>
                  <option value="barter">Barter</option>
                  <option value="other">Inne</option>
                </select></div>
              <div><label className="text-sm font-medium">Nr konta bankowego</label>
                <Input value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} placeholder="PL00 0000 0000..." className="mt-1" /></div>
              <div className="sm:col-span-3"><label className="text-sm font-medium">Opis</label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Zapisywanie..." : "Dodaj fakturę"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FILTERS */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex rounded-md border overflow-hidden text-sm">
          {(["all", "outgoing", "incoming"] as const).map((d) => (
            <button key={d} onClick={() => setFilterDir(d)}
              className={`px-3 py-1.5 ${filterDir === d ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>
              {d === "all" ? "Wszystkie" : d === "outgoing" ? "Wychodzące" : "Przychodzące"}
            </button>
          ))}
        </div>
        <div className="flex rounded-md border overflow-hidden text-sm">
          {(["all", "unpaid", "overdue"] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>
              {s === "all" ? "Wszystkie" : s === "unpaid" ? "Nieopłacone" : "Przeterminowane"}
            </button>
          ))}
        </div>
        <p className="self-center text-xs text-muted-foreground ml-2">{filtered.length} faktur</p>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
          <Receipt className="mx-auto h-12 w-12 opacity-20 mb-3" />
          <p className="font-medium">Brak faktur</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => {
            const stCfg = STATUS_CONFIG[inv.status];
            const StIcon = stCfg.icon;
            const isOverdue = inv.due_date && new Date(inv.due_date) < now && !["paid","cancelled"].includes(inv.status);
            return (
              <Card key={inv.id} className={`${isOverdue ? "border-red-200" : ""} ${inv.direction === "incoming" ? "border-l-4 border-l-orange-300" : "border-l-4 border-l-green-300"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-sm font-bold">{inv.invoice_number}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${stCfg.color}`}>
                          <StIcon className="h-3 w-3" />{stCfg.label}
                        </span>
                        <span className="text-xs bg-muted rounded px-1.5 py-0.5">{TYPE_LABELS[inv.type]}</span>
                        {inv.direction === "outgoing"
                          ? <span className="text-xs text-green-600 flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3" />Wychodząca</span>
                          : <span className="text-xs text-orange-600 flex items-center gap-0.5"><ArrowDownLeft className="h-3 w-3" />Przychodząca</span>}
                        {isOverdue && <span className="text-xs text-red-600 font-medium">⚠ Przeterminowana</span>}
                      </div>
                      <p className="font-semibold">{inv.counterparty}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        {inv.nip && <span>NIP: {inv.nip}</span>}
                        <span>Wystawiona: {new Date(inv.issue_date).toLocaleDateString("pl-PL")}</span>
                        {inv.due_date && <span className={isOverdue ? "text-red-600 font-medium" : ""}>Termin: {new Date(inv.due_date).toLocaleDateString("pl-PL")}</span>}
                        {inv.paid_date && <span className="text-green-600">Zapłacona: {new Date(inv.paid_date).toLocaleDateString("pl-PL")}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Netto: {fmt(inv.net_amount)}</p>
                      <p className="text-xs text-muted-foreground">VAT {inv.vat_rate}%: {fmt(inv.vat_amount)}</p>
                      <p className="font-bold text-base">{fmt(inv.gross_amount)}</p>
                      {!["paid","cancelled"].includes(inv.status) && (
                        <Button size="sm" className="mt-1" onClick={() => handleMarkPaid(inv.id)} disabled={pending}>
                          <CheckCircle2 className="mr-1 h-3 w-3" />Opłacona
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
