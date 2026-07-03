"use client";

import { useState, useTransition } from "react";
import {
  logTimeEntry,
  addExpense,
  deleteTimeEntry,
  deleteExpense,
  type WorkerPayrollRow,
} from "@/lib/actions/finance";
import type { TimeEntry, ProjectExpense, Worker } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function fmt(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(n);
}

function PnLCard({
  budget,
  laborCost,
  expensesCost,
  totalCost,
  profit,
  margin,
}: {
  budget: number | null;
  laborCost: number;
  expensesCost: number;
  totalCost: number;
  profit: number | null;
  margin: number | null;
}) {
  const marginColor =
    margin == null
      ? "text-muted-foreground"
      : margin >= 20
      ? "text-green-600 dark:text-green-400"
      : margin >= 0
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-red-600 dark:text-red-400";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {[
        { label: "Budżet", value: fmt(budget) },
        { label: "Robocizna", value: fmt(laborCost) },
        { label: "Wydatki", value: fmt(expensesCost) },
        { label: "Koszty ogółem", value: fmt(totalCost) },
        {
          label: "Zysk",
          value: fmt(profit),
          cls: profit != null && profit < 0 ? "text-red-600" : "text-green-600",
        },
        {
          label: "Marża",
          value: margin != null ? `${margin.toFixed(1)} %` : "—",
          cls: marginColor,
        },
      ].map(({ label, value, cls }) => (
        <div
          key={label}
          className="rounded-lg border bg-card p-4 shadow-sm"
        >
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`mt-1 text-xl font-semibold ${cls ?? ""}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

const CATEGORIES: { value: string; label: string }[] = [
  { value: "labor",     label: "Robocizna" },
  { value: "material",  label: "Materiały" },
  { value: "equipment", label: "Sprzęt" },
  { value: "other",     label: "Inne" },
];

export function FinancePanel({
  projectId,
  initialPnL,
  initialTimeEntries,
  initialExpenses,
  workers,
}: {
  projectId: string;
  initialPnL: {
    budget: number | null;
    laborCost: number;
    expensesCost: number;
    totalCost: number;
    profit: number | null;
    margin: number | null;
    workerBreakdown: WorkerPayrollRow[];
  };
  initialTimeEntries: TimeEntry[];
  initialExpenses: ProjectExpense[];
  workers: Worker[];
}) {
  const [pnl, setPnl] = useState(initialPnL);
  const [entries, setEntries] = useState(initialTimeEntries);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [pending, startT] = useTransition();

  const [timeForm, setTimeForm] = useState({
    workerId: workers[0]?.id ?? "",
    hours: "",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  });
  const [expForm, setExpForm] = useState({
    category: "other",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  });
  const [msg, setMsg] = useState("");

  async function handleLogTime(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    startT(async () => {
      const res = await logTimeEntry({
        projectId,
        workerId: timeForm.workerId,
        hours: Number(timeForm.hours),
        entryDate: timeForm.date,
        note: timeForm.note,
      });
      if (!res.ok) {
        setMsg(res.error ?? "Error");
        return;
      }
      // Optimistic add
      setEntries((prev) => [
        {
          id: res.id!,
          project_id: projectId,
          worker_id: timeForm.workerId,
          crew_id: null,
          entry_date: timeForm.date,
          hours: Number(timeForm.hours),
          note: timeForm.note || null,
          created_by: null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setTimeForm((f) => ({ ...f, hours: "", note: "" }));
    });
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    startT(async () => {
      const res = await addExpense({
        projectId,
        category: expForm.category,
        amount: Number(expForm.amount),
        expenseDate: expForm.date,
        note: expForm.note,
      });
      if (!res.ok) {
        setMsg(res.error ?? "Error");
        return;
      }
      setExpenses((prev) => [
        {
          id: res.id!,
          project_id: projectId,
          category: expForm.category,
          amount: Number(expForm.amount),
          note: expForm.note || null,
          expense_date: expForm.date,
          created_by: null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setExpForm((f) => ({ ...f, amount: "", note: "" }));
    });
  }

  async function removeEntry(id: string) {
    startT(async () => {
      await deleteTimeEntry(id, projectId);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    });
  }

  async function removeExpense(id: string) {
    startT(async () => {
      await deleteExpense(id, projectId);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    });
  }

  const workerName = (id: string) =>
    workers.find((w) => w.id === id)?.full_name ?? id.slice(0, 8);

  return (
    <div className="space-y-8">
      {/* P&L summary */}
      <PnLCard {...pnl} />

      {/* Payroll breakdown */}
      {pnl.workerBreakdown.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">Wynagrodzenia pracowników</h3>
          <div className="overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  {["Pracownik", "Specjalizacja", "Godziny", "Stawka / h", "Koszt pracy"].map(
                    (h) => (
                      <th key={h} className="px-4 py-2 text-left">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {pnl.workerBreakdown.map((r) => (
                  <tr key={r.workerId} className="border-t">
                    <td className="px-4 py-2">{r.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {r.specialty ?? "—"}
                    </td>
                    <td className="px-4 py-2">{r.hours.toFixed(1)}</td>
                    <td className="px-4 py-2">
                      {r.hourlyRate != null ? fmt(r.hourlyRate) : "—"}
                    </td>
                    <td className="px-4 py-2 font-medium">
                      {fmt(r.laborCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Log time */}
        <div className="space-y-3">
          <h3 className="font-semibold">Ewidencja czasu pracy</h3>
          <form onSubmit={handleLogTime} className="space-y-2">
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={timeForm.workerId}
              onChange={(e) =>
                setTimeForm((f) => ({ ...f, workerId: e.target.value }))
              }
              required
            >
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.full_name}
                  {w.hourly_rate != null ? ` (${w.hourly_rate} / h)` : ""}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0.5"
                step="0.5"
                placeholder="Godziny"
                value={timeForm.hours}
                onChange={(e) =>
                  setTimeForm((f) => ({ ...f, hours: e.target.value }))
                }
                required
              />
              <Input
                type="date"
                value={timeForm.date}
                onChange={(e) =>
                  setTimeForm((f) => ({ ...f, date: e.target.value }))
                }
                required
              />
            </div>
            <Input
              placeholder="Uwagi (opcjonalnie)"
              value={timeForm.note}
              onChange={(e) =>
                setTimeForm((f) => ({ ...f, note: e.target.value }))
              }
            />
            <Button type="submit" size="sm" disabled={pending}>
              Zapisz godziny
            </Button>
          </form>

          {entries.length > 0 && (
            <div className="overflow-auto rounded-lg border text-sm">
              <table className="w-full">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    {["Data", "Pracownik", "Godziny", "Uwagi", ""].map((h) => (
                      <th key={h} className="px-3 py-1.5 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="px-3 py-1.5">{e.entry_date}</td>
                      <td className="px-3 py-1.5">{workerName(e.worker_id)}</td>
                      <td className="px-3 py-1.5">{Number(e.hours).toFixed(1)}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {e.note ?? "—"}
                      </td>
                      <td className="px-3 py-1.5">
                        <button
                          onClick={() => removeEntry(e.id)}
                          className="text-red-500 hover:text-red-700"
                          disabled={pending}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add expense */}
        <div className="space-y-3">
          <h3 className="font-semibold">Dodaj wydatek</h3>
          <form onSubmit={handleAddExpense} className="space-y-2">
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={expForm.category}
              onChange={(e) =>
                setExpForm((f) => ({ ...f, category: e.target.value }))
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="Kwota (PLN)"
                value={expForm.amount}
                onChange={(e) =>
                  setExpForm((f) => ({ ...f, amount: e.target.value }))
                }
                required
              />
              <Input
                type="date"
                value={expForm.date}
                onChange={(e) =>
                  setExpForm((f) => ({ ...f, date: e.target.value }))
                }
                required
              />
            </div>
            <Input
              placeholder="Uwagi (opcjonalnie)"
              value={expForm.note}
              onChange={(e) =>
                setExpForm((f) => ({ ...f, note: e.target.value }))
              }
            />
            <Button type="submit" size="sm" disabled={pending}>
              Dodaj wydatek
            </Button>
          </form>

          {expenses.length > 0 && (
            <div className="overflow-auto rounded-lg border text-sm">
              <table className="w-full">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    {["Data", "Kategoria", "Kwota", "Uwagi", ""].map((h) => (
                      <th key={h} className="px-3 py-1.5 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((ex) => (
                    <tr key={ex.id} className="border-t">
                      <td className="px-3 py-1.5">{ex.expense_date}</td>
                      <td className="px-3 py-1.5 capitalize">{ex.category}</td>
                      <td className="px-3 py-1.5">{fmt(Number(ex.amount))}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {ex.note ?? "—"}
                      </td>
                      <td className="px-3 py-1.5">
                        <button
                          onClick={() => removeExpense(ex.id)}
                          className="text-red-500 hover:text-red-700"
                          disabled={pending}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {msg && <p className="text-sm text-red-500">{msg}</p>}
    </div>
  );
}
