"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Edit2, Check } from "lucide-react";
import {
  upsertForecastEntry,
  type BudgetForecastEntry, type ForecastCategory,
} from "@/lib/actions/budget-forecast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const MONTHS_PL = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];
const MONTHS_FULL = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];

const CATEGORY_CONFIG: Record<ForecastCategory, { label: string; color: string }> = {
  labor:       { label: "Robocizna",     color: "bg-blue-100 text-blue-700" },
  materials:   { label: "Materiały",     color: "bg-green-100 text-green-700" },
  equipment:   { label: "Sprzęt",        color: "bg-purple-100 text-purple-700" },
  subcontract: { label: "Podwykonawcy",  color: "bg-orange-100 text-orange-700" },
  overhead:    { label: "Koszty ogólne", color: "bg-slate-100 text-slate-600" },
  revenue:     { label: "Przychód",      color: "bg-teal-100 text-teal-700" },
  other:       { label: "Inne",          color: "bg-slate-100 text-slate-500" },
};

function fmt(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(n);
}

export function BudzetClient({
  projectId, initialForecast, initialYear,
}: {
  projectId: string;
  initialForecast: BudgetForecastEntry[];
  initialYear: number;
}) {
  const [forecast, setForecast] = useState<BudgetForecastEntry[]>(initialForecast);
  const [year, setYear] = useState(initialYear);
  const [editCell, setEditCell] = useState<{ month: number; category: ForecastCategory; field: "plannedCost" | "actualCost" | "plannedRevenue" | "actualRevenue" } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function prevYear() { setYear((y) => y - 1); }
  function nextYear() { setYear((y) => y + 1); }

  function getEntry(month: number, category: ForecastCategory) {
    return forecast.find((e) => e.month === month && e.category === category);
  }

  function handleEdit(month: number, category: ForecastCategory, field: "plannedCost" | "actualCost" | "plannedRevenue" | "actualRevenue") {
    const entry = getEntry(month, category);
    let value = "";
    if (entry) {
      if (field === "plannedCost") value = (entry.planned_cost ?? "").toString();
      if (field === "actualCost") value = (entry.actual_cost ?? "").toString();
      if (field === "plannedRevenue") value = (entry.planned_revenue ?? "").toString();
      if (field === "actualRevenue") value = (entry.actual_revenue ?? "").toString();
    }
    setEditCell({ month, category, field });
    setEditValue(value);
  }

  function handleSave() {
    if (!editCell) return;
    const { month, category, field } = editCell;
    const numValue = parseFloat(editValue);
    if (isNaN(numValue)) { setError("Wartość musi być liczbą"); return; }
    setError(null);

    const entry = getEntry(month, category);

    startTransition(async () => {
      const res = await upsertForecastEntry({
        projectId, year, month, category,
        plannedCost: field === "plannedCost" ? numValue : entry?.planned_cost ?? 0,
        actualCost: field === "actualCost" ? numValue : (entry?.actual_cost ?? undefined),
        plannedRevenue: field === "plannedRevenue" ? numValue : (entry?.planned_revenue ?? undefined),
        actualRevenue: field === "actualRevenue" ? numValue : (entry?.actual_revenue ?? undefined),
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      setEditCell(null);
      setEditValue("");
      // Refresh forecast data (in real app, would revalidate)
    });
  }

  function handleCancel() {
    setEditCell(null);
    setEditValue("");
    setError(null);
  }

  const categories = Object.keys(CATEGORY_CONFIG) as ForecastCategory[];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const totalPlannedCost = forecast.reduce((s, e) => s + (e.planned_cost ?? 0), 0);
  const totalActualCost = forecast.reduce((s, e) => s + (e.actual_cost ?? 0), 0);
  const totalPlannedRevenue = forecast.reduce((s, e) => s + (e.planned_revenue ?? 0), 0);
  const totalActualRevenue = forecast.reduce((s, e) => s + (e.actual_revenue ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/contractor/projects/${projectId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Prognoza budżetowa</h1>
            <p className="text-sm text-muted-foreground mt-1">Planowanie kosztów i przychodów</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={prevYear} variant="outline" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-lg font-medium w-20 text-center">{year}</span>
          <Button onClick={nextYear} variant="outline" size="icon"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Planowane koszty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalPlannedCost)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rzeczywiste koszty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalActualCost)}</div>
            {totalActualCost > 0 && (
              <div className={`text-xs mt-1 flex items-center gap-1 ${totalActualCost > totalPlannedCost ? "text-red-600" : "text-green-600"}`}>
                {totalActualCost > totalPlannedCost ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {((totalActualCost / totalPlannedCost) * 100).toFixed(1)}% planu
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Planowane przychody</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalPlannedRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rzeczywiste przychody</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalActualRevenue)}</div>
            {totalActualRevenue > 0 && (
              <div className={`text-xs mt-1 flex items-center gap-1 ${totalActualRevenue < totalPlannedRevenue ? "text-red-600" : "text-green-600"}`}>
                {totalActualRevenue < totalPlannedRevenue ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                {((totalActualRevenue / totalPlannedRevenue) * 100).toFixed(1)}% planu
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Forecast Table */}
      <Card>
        <CardHeader>
          <CardTitle>Szczegółowa prognoza miesięczna</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Kategoria</th>
                  {months.map((m) => (
                    <th key={m} className="text-center p-2 font-medium min-w-[100px]">{MONTHS_PL[m - 1]}</th>
                  ))}
                  <th className="text-center p-2 font-medium min-w-[100px]">Razem</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  const catTotal = forecast.filter((e) => e.category === cat).reduce((s, e) => s + (e.planned_cost ?? 0) + (e.actual_cost ?? 0), 0);
                  return (
                    <tr key={cat} className="border-b">
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_CONFIG[cat].color}`}>
                          {CATEGORY_CONFIG[cat].label}
                        </span>
                      </td>
                      {months.map((m) => {
                        const entry = getEntry(m, cat);
                        const isEditing = editCell?.month === m && editCell?.category === cat;
                        return (
                          <td key={m} className="p-2 text-center">
                            {isEditing && editCell?.field === "plannedCost" ? (
                              <div className="flex items-center justify-center gap-1">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-20 h-8 text-xs"
                                  autoFocus
                                />
                                <Button size="sm" variant="ghost" onClick={handleSave} className="h-8 w-8 p-0"><Check className="h-3 w-3" /></Button>
                                <Button size="sm" variant="ghost" onClick={handleCancel} className="h-8 w-8 p-0"><X className="h-3 w-3" /></Button>
                              </div>
                            ) : (
                              <div
                                className="cursor-pointer hover:bg-muted p-1 rounded"
                                onClick={() => handleEdit(m, cat, "plannedCost")}
                                title="Kliknij aby edytować"
                              >
                                <div className="font-medium">{fmt(entry?.planned_cost ?? 0)}</div>
                                <div className="text-xs text-muted-foreground">{fmt(entry?.actual_cost ?? null)}</div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-2 text-center font-medium">{fmt(catTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
      )}
    </div>
  );
}
