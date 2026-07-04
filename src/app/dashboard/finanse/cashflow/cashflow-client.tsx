"use client";

import { useState, useTransition } from "react";
import { Plus, X, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Trash2, Search, Filter } from "lucide-react";
import {
  createCashflowEntry, updateCashflowActual, deleteCashflowEntry,
  type CashflowEntry, type CashflowType, type CashflowCategory,
} from "@/lib/actions/cashflow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const MONTHS_PL = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];
const MONTHS_FULL = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];

const CATEGORY_LABELS: Record<CashflowCategory, string> = {
  invoice_income:        "Przychód z faktury",
  advance_income:        "Zaliczka",
  retention_release:     "Zwrot kaucji",
  subcontractor_payment: "Płatność dla podwykonawcy",
  material_payment:      "Zakup materiałów",
  labor_payment:         "Wynagrodzenia",
  equipment_payment:     "Najem sprzętu",
  overhead:              "Koszty ogólne",
  tax:                   "Podatki",
  loan:                  "Kredyt / pożyczka",
  other:                 "Inne",
};

function fmt(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(n);
}

export function CashflowClient({ initialEntries, initialYear }: { initialEntries: CashflowEntry[]; initialYear: number }) {
  const [entries, setEntries] = useState<CashflowEntry[]>(initialEntries);
  const [year, setYear] = useState(initialYear);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<CashflowType | "all">("all");
  const [filterCategory, setFilterCategory] = useState<CashflowCategory | "all">("all");

  const [form, setForm] = useState({
    type: "inflow" as CashflowType, category: "invoice_income" as CashflowCategory,
    description: "", month: String(new Date().getMonth() + 1),
    plannedAmount: "", notes: "",
  });

  // Build 12-month summary
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const inflows = entries.filter((e) => e.period_month === month && e.type === "inflow");
    const outflows = entries.filter((e) => e.period_month === month && e.type === "outflow");
    const plannedIn = inflows.reduce((s, e) => s + e.planned_amount, 0);
    const plannedOut = outflows.reduce((s, e) => s + e.planned_amount, 0);
    const actualIn = inflows.reduce((s, e) => s + (e.actual_amount ?? 0), 0);
    const actualOut = outflows.reduce((s, e) => s + (e.actual_amount ?? 0), 0);
    return {
      month, label: MONTHS_PL[i],
      plannedIn, plannedOut, plannedBalance: plannedIn - plannedOut,
      actualIn, actualOut, actualBalance: actualIn - actualOut,
      hasData: inflows.length + outflows.length > 0,
    };
  });

  const totals = {
    plannedIn: monthlyData.reduce((s, m) => s + m.plannedIn, 0),
    plannedOut: monthlyData.reduce((s, m) => s + m.plannedOut, 0),
    actualIn: monthlyData.reduce((s, m) => s + m.actualIn, 0),
    actualOut: monthlyData.reduce((s, m) => s + m.actualOut, 0),
  };

  // Running balance for chart
  let running = 0;
  const runningBalances = monthlyData.map((m) => {
    running += m.plannedBalance;
    return running;
  });

  const maxBalance = Math.max(...runningBalances.map(Math.abs), 1);

  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  
  const filteredEntries = entries.filter((e) => {
    const matchesSearch = !searchQuery || 
      e.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || e.type === filterType;
    const matchesCategory = filterCategory === "all" || e.category === filterCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  const monthEntries = selectedMonth ? filteredEntries.filter((e) => e.period_month === selectedMonth) : filteredEntries;

  function handleCreate() {
    if (!form.description.trim() || !form.plannedAmount) { setError("Opis i kwota są wymagane"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createCashflowEntry({
        periodYear: year, periodMonth: Number(form.month),
        type: form.type, category: form.category,
        description: form.description, plannedAmount: Number(form.plannedAmount),
        notes: form.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newE: CashflowEntry = {
        id: res.id!, project_id: null, org_id: "", created_by: null,
        period_year: year, period_month: Number(form.month),
        type: form.type, category: form.category,
        description: form.description, planned_amount: Number(form.plannedAmount),
        actual_amount: null, is_confirmed: false, notes: form.notes || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setEntries((prev) => [...prev, newE]);
      setShowForm(false);
      setForm({ type: "inflow", category: "invoice_income", description: "", month: String(new Date().getMonth() + 1), plannedAmount: "", notes: "" });
    });
  }

  function handleUpdateActual(id: string) {
    if (!editAmount) return;
    startTransition(async () => {
      await updateCashflowActual(id, Number(editAmount));
      setEntries((prev) => prev.map((e) => e.id === id ? { ...e, actual_amount: Number(editAmount), is_confirmed: true } : e));
      setEditId(null); setEditAmount("");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCashflowEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6" />Przepływy pieniężne</h1>
          <p className="text-sm text-muted-foreground">Cash Flow — prognoza wpływów i wydatków po miesiącach (wzorowane na Procore, InEight)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setYear((y) => y - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-bold text-lg px-2">{year}</span>
          <Button variant="outline" size="sm" onClick={() => setYear((y) => y + 1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button onClick={() => setShowForm(true)}><Plus className="mr-1 h-4 w-4" />Dodaj</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="border-green-200"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Plan wpływów rocznie</p><p className="text-xl font-bold text-green-700">{fmt(totals.plannedIn)}</p><p className="text-xs text-muted-foreground">Rzecz: {fmt(totals.actualIn)}</p></CardContent></Card>
        <Card className="border-red-200"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Plan wydatków rocznie</p><p className="text-xl font-bold text-red-700">{fmt(totals.plannedOut)}</p><p className="text-xs text-muted-foreground">Rzecz: {fmt(totals.actualOut)}</p></CardContent></Card>
        <Card className={(totals.plannedIn - totals.plannedOut) >= 0 ? "border-green-200" : "border-red-200"}>
          <CardContent className="p-4"><p className="text-xs text-muted-foreground">Saldo planowane</p>
            <p className={`text-xl font-bold ${(totals.plannedIn - totals.plannedOut) >= 0 ? "text-green-700" : "text-red-700"}`}>
              {fmt(totals.plannedIn - totals.plannedOut)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Saldo rzeczywiste</p>
          <p className={`text-xl font-bold ${(totals.actualIn - totals.actualOut) >= 0 ? "text-green-700" : "text-red-700"}`}>
            {fmt(totals.actualIn - totals.actualOut)}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Шукати записи..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as CashflowType | "all")}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Всі типи</option>
          <option value="inflow">Впливи</option>
          <option value="outflow">Видатки</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as CashflowCategory | "all")}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Всі категорії</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* MONTHLY BAR CHART */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Prognoza saldo kumulatywne — {year}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-1.5 h-36 pt-4">
            {monthlyData.map((m, i) => {
              const balance = runningBalances[i] ?? 0;
              const height = Math.abs((balance / maxBalance) * 100);
              const isPositive = balance >= 0;
              const isSelected = selectedMonth === m.month;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
                  onClick={() => setSelectedMonth(isSelected ? null : m.month)}>
                  <div className="w-full flex flex-col justify-end" style={{ height: "120px" }}>
                    {m.hasData && (
                      <div
                        className={`w-full rounded-sm transition-all ${isPositive ? "bg-green-400" : "bg-red-400"} ${isSelected ? "opacity-100 ring-2 ring-offset-1 ring-primary" : "opacity-70 hover:opacity-100"}`}
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                    )}
                    {!m.hasData && <div className="w-full h-1 bg-muted rounded-sm" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded-sm inline-block" />Dodatnie</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded-sm inline-block" />Ujemne</span>
            {selectedMonth && <span className="text-primary font-medium">Filtr: {MONTHS_FULL[selectedMonth - 1]} — kliknij aby wyczyścić</span>}
          </div>
        </CardContent>
      </Card>

      {/* MONTHLY TABLE */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-2 py-2">Miesiąc</th>
              <th className="text-right px-2 py-2 text-green-700">Plan wpływy</th>
              <th className="text-right px-2 py-2 text-red-700">Plan wydatki</th>
              <th className="text-right px-2 py-2 font-bold">Saldo planu</th>
              <th className="text-right px-2 py-2 text-green-600">Rzecz. wpływy</th>
              <th className="text-right px-2 py-2 text-red-600">Rzecz. wydatki</th>
              <th className="text-right px-2 py-2 font-bold">Saldo rzecz.</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((m) => (
              <tr key={m.month} className={`border-t hover:bg-muted/20 cursor-pointer ${selectedMonth === m.month ? "bg-primary/5" : ""}`}
                onClick={() => setSelectedMonth(selectedMonth === m.month ? null : m.month)}>
                <td className="px-2 py-1.5 font-medium">{MONTHS_FULL[m.month - 1]}</td>
                <td className="px-2 py-1.5 text-right text-green-700">{m.plannedIn > 0 ? fmt(m.plannedIn) : "—"}</td>
                <td className="px-2 py-1.5 text-right text-red-700">{m.plannedOut > 0 ? fmt(m.plannedOut) : "—"}</td>
                <td className={`px-2 py-1.5 text-right font-bold ${m.plannedBalance >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {m.hasData ? fmt(m.plannedBalance) : "—"}</td>
                <td className="px-2 py-1.5 text-right text-green-600">{m.actualIn > 0 ? fmt(m.actualIn) : "—"}</td>
                <td className="px-2 py-1.5 text-right text-red-600">{m.actualOut > 0 ? fmt(m.actualOut) : "—"}</td>
                <td className={`px-2 py-1.5 text-right font-bold ${m.actualBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {m.actualIn > 0 || m.actualOut > 0 ? fmt(m.actualBalance) : "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/30 border-t-2">
            <tr>
              <td className="px-2 py-2 font-bold">RAZEM</td>
              <td className="px-2 py-2 text-right font-bold text-green-700">{fmt(totals.plannedIn)}</td>
              <td className="px-2 py-2 text-right font-bold text-red-700">{fmt(totals.plannedOut)}</td>
              <td className={`px-2 py-2 text-right font-bold ${totals.plannedIn - totals.plannedOut >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(totals.plannedIn - totals.plannedOut)}</td>
              <td className="px-2 py-2 text-right font-bold text-green-600">{fmt(totals.actualIn)}</td>
              <td className="px-2 py-2 text-right font-bold text-red-600">{fmt(totals.actualOut)}</td>
              <td className={`px-2 py-2 text-right font-bold ${totals.actualIn - totals.actualOut >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(totals.actualIn - totals.actualOut)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ADD FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Dodaj wpis Cash Flow</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className="text-sm font-medium">Typ</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CashflowType })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="inflow">Wpływ (+)</option>
                  <option value="outflow">Wydatek (−)</option>
                </select></div>
              <div><label className="text-sm font-medium">Kategoria</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as CashflowCategory })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Miesiąc</label>
                <select value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {MONTHS_FULL.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Opis *</label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Kwota plan. (PLN) *</label>
                <Input type="number" value={form.plannedAmount} onChange={(e) => setForm({ ...form, plannedAmount: e.target.value })} className="mt-1" /></div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Dodawanie..." : "Dodaj"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ENTRIES LIST */}
      {monthEntries.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2 text-sm">
            {selectedMonth ? `${MONTHS_FULL[selectedMonth - 1]} ${year}` : `Wszystkie wpisy ${year}`}
            <span className="text-muted-foreground font-normal ml-2">({monthEntries.length})</span>
          </h3>
          <div className="space-y-1.5">
            {monthEntries.map((e) => (
              <Card key={e.id} className="shadow-none">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {e.type === "inflow"
                        ? <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
                        : <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{e.description}</p>
                        <p className="text-xs text-muted-foreground">{MONTHS_PL[e.period_month - 1]} — {CATEGORY_LABELS[e.category]}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className={`text-sm font-bold ${e.type === "inflow" ? "text-green-700" : "text-red-700"}`}>{fmt(e.planned_amount)}</p>
                        {e.actual_amount != null && <p className="text-xs text-muted-foreground">Rzecz: {fmt(e.actual_amount)}</p>}
                      </div>
                      {editId === e.id ? (
                        <div className="flex gap-1 items-center">
                          <Input type="number" value={editAmount} onChange={(e2) => setEditAmount(e2.target.value)} className="h-7 w-24 text-xs" />
                          <Button size="sm" className="h-7 text-xs" onClick={() => handleUpdateActual(e.id)} disabled={pending}>✓</Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditId(null)}><X className="h-3 w-3" /></Button>
                        </div>
                      ) : (
                        <button className="text-xs text-muted-foreground hover:text-foreground underline"
                          onClick={() => { setEditId(e.id); setEditAmount(String(e.actual_amount ?? e.planned_amount)); }}>
                          {e.actual_amount != null ? "Edytuj" : "Rzecz."}
                        </button>
                      )}
                      <button onClick={() => handleDelete(e.id)} disabled={pending}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
