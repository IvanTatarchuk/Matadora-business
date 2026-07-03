"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, TrendingUp, TrendingDown, Trash2, Edit2, Check } from "lucide-react";
import {
  createJobCostItem, updateJobCostActuals, deleteJobCostItem,
  type JobCostItem, type CostCategory,
} from "@/lib/actions/job-costing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const CATEGORY_CONFIG: Record<CostCategory, { label: string; color: string }> = {
  labor:       { label: "Robocizna",     color: "bg-blue-100 text-blue-700" },
  materials:   { label: "Materiały",     color: "bg-green-100 text-green-700" },
  equipment:   { label: "Sprzęt",        color: "bg-purple-100 text-purple-700" },
  subcontract: { label: "Podwykonawcy",  color: "bg-orange-100 text-orange-700" },
  overhead:    { label: "Koszty ogólne", color: "bg-slate-100 text-slate-600" },
  contingency: { label: "Rezerwa",       color: "bg-yellow-100 text-yellow-700" },
  other:       { label: "Inne",          color: "bg-slate-100 text-slate-500" },
};

function fmt(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(n);
}

function pct(actual: number | null, planned: number | null) {
  if (!planned || !actual) return null;
  return Math.round((actual / planned) * 100);
}

export function KosztyClient({ projectId, initialItems }: { projectId: string; initialItems: JobCostItem[] }) {
  const [items, setItems] = useState<JobCostItem[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editActuals, setEditActuals] = useState({ quantityActual: "", unitCostActual: "", percentComplete: "" });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", category: "labor" as CostCategory,
    wbsCode: "", description: "", unit: "",
    quantityPlanned: "", unitCostPlanned: "", notes: "",
  });

  const totalPlanned = items.reduce((s, i) => s + (i.planned_total ?? 0), 0);
  const totalActual = items.reduce((s, i) => s + (i.actual_total ?? 0), 0);
  const totalVariance = totalPlanned - totalActual;
  const completedItems = items.filter((i) => i.percent_complete >= 100).length;

  const byCategory = Object.keys(CATEGORY_CONFIG).reduce((acc, cat) => {
    const catItems = items.filter((i) => i.category === cat);
    acc[cat as CostCategory] = {
      planned: catItems.reduce((s, i) => s + (i.planned_total ?? 0), 0),
      actual: catItems.reduce((s, i) => s + (i.actual_total ?? 0), 0),
    };
    return acc;
  }, {} as Record<CostCategory, { planned: number; actual: number }>);

  function handleCreate() {
    if (!form.name.trim()) { setError("Nazwa jest wymagana"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createJobCostItem({
        projectId, name: form.name, category: form.category,
        wbsCode: form.wbsCode || undefined, description: form.description || undefined,
        unit: form.unit || undefined,
        quantityPlanned: form.quantityPlanned ? Number(form.quantityPlanned) : undefined,
        unitCostPlanned: form.unitCostPlanned ? Number(form.unitCostPlanned) : undefined,
        notes: form.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const qp = form.quantityPlanned ? Number(form.quantityPlanned) : null;
      const cp = form.unitCostPlanned ? Number(form.unitCostPlanned) : null;
      const newItem: JobCostItem = {
        id: res.id!, project_id: projectId, org_id: "", created_by: null,
        wbs_code: form.wbsCode || null, name: form.name,
        description: form.description || null, category: form.category,
        unit: form.unit || null, quantity_planned: qp, unit_cost_planned: cp,
        planned_total: qp && cp ? qp * cp : null,
        quantity_actual: null, unit_cost_actual: null, actual_total: null,
        percent_complete: 0, variance: qp && cp ? qp * cp : null,
        parent_id: null, position: items.length * 10, notes: form.notes || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setItems((prev) => [...prev, newItem]);
      setShowForm(false);
      setForm({ name: "", category: "labor", wbsCode: "", description: "", unit: "", quantityPlanned: "", unitCostPlanned: "", notes: "" });
    });
  }

  function handleUpdateActuals(id: string) {
    startTransition(async () => {
      await updateJobCostActuals(id, projectId, {
        quantityActual: editActuals.quantityActual ? Number(editActuals.quantityActual) : undefined,
        unitCostActual: editActuals.unitCostActual ? Number(editActuals.unitCostActual) : undefined,
        percentComplete: editActuals.percentComplete ? Number(editActuals.percentComplete) : undefined,
      });
      const qa = editActuals.quantityActual ? Number(editActuals.quantityActual) : null;
      const ca = editActuals.unitCostActual ? Number(editActuals.unitCostActual) : null;
      setItems((prev) => prev.map((i) => i.id === id
        ? { ...i, quantity_actual: qa, unit_cost_actual: ca,
            actual_total: qa && ca ? qa * ca : null,
            percent_complete: editActuals.percentComplete ? Number(editActuals.percentComplete) : i.percent_complete }
        : i));
      setEditId(null);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteJobCostItem(id, projectId);
      setItems((prev) => prev.filter((i) => i.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Job Costing — Koszty projektu</h1>
          <p className="text-sm text-muted-foreground">Budżet planowany vs rzeczywisty na poziomie zadania (WBS)</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-1 h-4 w-4" />Dodaj pozycję</Button>
      </div>

      {/* BUDGET SUMMARY */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Budżet planowany</p><p className="text-xl font-bold">{fmt(totalPlanned)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Koszty rzeczywiste</p><p className="text-xl font-bold">{fmt(totalActual)}</p></CardContent></Card>
        <Card className={totalVariance < 0 ? "border-red-200" : "border-green-200"}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Odchylenie</p>
            <p className={`text-xl font-bold flex items-center gap-1 ${totalVariance < 0 ? "text-red-600" : "text-green-600"}`}>
              {totalVariance < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
              {fmt(Math.abs(totalVariance))}
            </p>
          </CardContent>
        </Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pozycje ukończone</p><p className="text-xl font-bold">{completedItems}/{items.length}</p></CardContent></Card>
      </div>

      {/* CATEGORY BREAKDOWN */}
      {items.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.entries(byCategory) as [CostCategory, { planned: number; actual: number }][])
            .filter(([, v]) => v.planned > 0 || v.actual > 0)
            .map(([cat, vals]) => {
              const cfg = CATEGORY_CONFIG[cat];
              const p = pct(vals.actual, vals.planned);
              return (
                <Card key={cat} className="shadow-none">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold rounded px-1.5 py-0.5 ${cfg.color}`}>{cfg.label}</span>
                      {p != null && <span className={`text-xs font-bold ${p > 100 ? "text-red-600" : ""}`}>{p}%</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{fmt(vals.planned)}</p>
                    <p className="text-sm font-bold">{fmt(vals.actual)}</p>
                    <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${p && p > 100 ? "bg-red-500" : "bg-primary"}`}
                        style={{ width: `${Math.min(100, p ?? 0)}%` }} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* CREATE FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowa pozycja kosztów</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className="text-sm font-medium">Kod WBS</label>
                <Input value={form.wbsCode} onChange={(e) => setForm({ ...form, wbsCode: e.target.value })} placeholder="np. 1.2.3" className="mt-1" /></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Nazwa pozycji *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="np. Zbrojenie stropu S3" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Kategoria</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as CostCategory })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select></div>
              <div><label className="text-sm font-medium">JM</label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="np. m², t, szt." className="mt-1" /></div>
              <div><label className="text-sm font-medium">Ilość plan.</label>
                <Input type="number" value={form.quantityPlanned} onChange={(e) => setForm({ ...form, quantityPlanned: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Cena jedn. plan. (PLN)</label>
                <Input type="number" value={form.unitCostPlanned} onChange={(e) => setForm({ ...form, unitCostPlanned: e.target.value })} className="mt-1" /></div>
              {form.quantityPlanned && form.unitCostPlanned && (
                <div className="sm:col-span-3 text-sm font-medium text-muted-foreground bg-muted/40 rounded px-3 py-2">
                  Budżet planowany: <span className="text-foreground font-bold">{fmt(Number(form.quantityPlanned) * Number(form.unitCostPlanned))}</span>
                </div>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Dodawanie..." : "Dodaj"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ITEMS TABLE */}
      {items.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
          <p className="font-medium">Brak pozycji kosztów</p>
          <p className="text-sm mt-1">Dodaj pozycje WBS, aby śledzić budżet plan vs rzeczywisty</p>
        </CardContent></Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-xs">WBS</th>
                <th className="text-left px-3 py-2 font-medium text-xs">Nazwa</th>
                <th className="text-left px-3 py-2 font-medium text-xs hidden sm:table-cell">Kat.</th>
                <th className="text-right px-3 py-2 font-medium text-xs">Plan</th>
                <th className="text-right px-3 py-2 font-medium text-xs">Rzecz.</th>
                <th className="text-right px-3 py-2 font-medium text-xs">Odch.</th>
                <th className="text-center px-3 py-2 font-medium text-xs">%</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const variance = item.variance;
                const isEditing = editId === item.id;
                return (
                  <tr key={item.id} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{item.wbs_code ?? "—"}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{item.name}</p>
                      {item.unit && <p className="text-xs text-muted-foreground">{item.quantity_planned} {item.unit}</p>}
                    </td>
                    <td className="px-3 py-2 hidden sm:table-cell">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${CATEGORY_CONFIG[item.category].color}`}>
                        {CATEGORY_CONFIG[item.category].label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-xs">{fmt(item.planned_total)}</td>
                    <td className="px-3 py-2 text-right text-xs">
                      {isEditing ? (
                        <div className="flex gap-1 justify-end">
                          <Input type="number" value={editActuals.unitCostActual}
                            onChange={(e) => setEditActuals({ ...editActuals, unitCostActual: e.target.value })}
                            placeholder="Cena" className="h-6 w-20 text-xs" />
                          <Input type="number" value={editActuals.quantityActual}
                            onChange={(e) => setEditActuals({ ...editActuals, quantityActual: e.target.value })}
                            placeholder="Ilość" className="h-6 w-16 text-xs" />
                        </div>
                      ) : fmt(item.actual_total)}
                    </td>
                    <td className={`px-3 py-2 text-right text-xs font-medium ${variance != null && variance < 0 ? "text-red-600" : "text-green-600"}`}>
                      {variance != null ? fmt(Math.abs(variance)) : "—"}
                      {variance != null && variance < 0 ? " ↑" : variance != null && variance > 0 ? " ↓" : ""}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isEditing ? (
                        <Input type="number" value={editActuals.percentComplete}
                          onChange={(e) => setEditActuals({ ...editActuals, percentComplete: e.target.value })}
                          placeholder="%" min="0" max="100" className="h-6 w-14 text-xs" />
                      ) : (
                        <div className="flex items-center gap-1 justify-center">
                          <div className="w-12 bg-muted rounded-full h-1.5 hidden sm:block">
                            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${item.percent_complete}%` }} />
                          </div>
                          <span className="text-xs">{item.percent_complete}%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-end">
                        {isEditing ? (
                          <button onClick={() => handleUpdateActuals(item.id)} disabled={pending}>
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </button>
                        ) : (
                          <button onClick={() => { setEditId(item.id); setEditActuals({ quantityActual: String(item.quantity_actual ?? ""), unitCostActual: String(item.unit_cost_actual ?? ""), percentComplete: String(item.percent_complete) }); }}>
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(item.id)} disabled={pending}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/30 border-t-2">
              <tr>
                <td colSpan={3} className="px-3 py-2 font-semibold text-sm">RAZEM</td>
                <td className="px-3 py-2 text-right font-bold text-sm">{fmt(totalPlanned)}</td>
                <td className="px-3 py-2 text-right font-bold text-sm">{fmt(totalActual)}</td>
                <td className={`px-3 py-2 text-right font-bold text-sm ${totalVariance < 0 ? "text-red-600" : "text-green-600"}`}>{fmt(Math.abs(totalVariance))}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
