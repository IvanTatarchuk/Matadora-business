"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, Wrench, RotateCcw } from "lucide-react";
import {
  assignEquipmentToProject, returnEquipment,
  type Equipment, type EquipmentAssignment,
} from "@/lib/actions/equipment";
import { EQUIPMENT_CATEGORY_LABELS } from "@/lib/constants/equipment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ProjektSprzętClient({
  projectId,
  allEquipment,
  initialAssignments,
}: {
  projectId: string;
  allEquipment: Equipment[];
  initialAssignments: EquipmentAssignment[];
}) {
  const [assignments, setAssignments] = useState<EquipmentAssignment[]>(initialAssignments);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const available = allEquipment.filter((e) => e.status === "available");
  const [form, setForm] = useState({
    equipmentId: available[0]?.id ?? "",
    assignedDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const activeAssignments = assignments.filter((a) => !a.returned_date);
  const totalDays = assignments.reduce((s, a) => s + (a.days_used ?? 0), 0);

  function handleAssign() {
    if (!form.equipmentId) { setError("Wybierz sprzęt"); return; }
    setError(null);
    startTransition(async () => {
      const res = await assignEquipmentToProject({
        equipmentId: form.equipmentId, projectId,
        assignedDate: form.assignedDate, notes: form.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const eq = allEquipment.find((e) => e.id === form.equipmentId);
      const newAssignment: EquipmentAssignment = {
        id: res.id!, equipment_id: form.equipmentId, project_id: projectId, org_id: "",
        assigned_date: form.assignedDate, returned_date: null,
        days_used: 0, cost: null, notes: form.notes || null,
        created_at: new Date().toISOString(),
        equipment_name: eq?.name ?? undefined,
      };
      setAssignments((prev) => [newAssignment, ...prev]);
      setShowForm(false);
      setForm({ equipmentId: available[0]?.id ?? "", assignedDate: new Date().toISOString().slice(0, 10), notes: "" });
    });
  }

  function handleReturn(a: EquipmentAssignment) {
    startTransition(async () => {
      await returnEquipment(a.id, projectId, a.equipment_id);
      const today = new Date().toISOString().slice(0, 10);
      const days = Math.max(0, Math.floor((new Date(today).getTime() - new Date(a.assigned_date).getTime()) / 86400000));
      setAssignments((prev) => prev.map((x) =>
        x.id === a.id ? { ...x, returned_date: today, days_used: days } : x
      ));
    });
  }

  const eq = (id: string) => allEquipment.find((e) => e.id === id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Sprzęt na projekcie</h1>
          <p className="text-sm text-muted-foreground">Przydziel sprzęt z katalogu do tego projektu i śledź czas użycia</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={available.length === 0}>
          <Plus className="mr-1 h-4 w-4" /> Przydziel sprzęt
        </Button>
      </div>

      {available.length === 0 && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          Brak dostępnego sprzętu.{" "}
          <Link href="/dashboard/sprzet" className="font-medium underline">Dodaj sprzęt do katalogu</Link>.
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Aktualnie na projekcie</p><p className="text-2xl font-bold">{activeAssignments.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Łącznie przydziałów</p><p className="text-2xl font-bold">{assignments.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Łączna liczba dni</p><p className="text-2xl font-bold">{totalDays}</p></CardContent></Card>
      </div>

      {/* FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Przydziel sprzęt do projektu</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Sprzęt (dostępny) *</label>
                <select value={form.equipmentId} onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {available.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}{e.brand ? ` (${e.brand}${e.model ? " " + e.model : ""})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Data przydziału</label>
                <Input type="date" value={form.assignedDate} onChange={(e) => setForm({ ...form, assignedDate: e.target.value })} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Uwagi</label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleAssign} disabled={pending}>{pending ? "Przydzielanie..." : "Przydziel"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LIST */}
      {assignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Wrench className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Brak przydzielonego sprzętu</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Active first, then returned */}
          {[...assignments].sort((a, b) => (a.returned_date ? 1 : 0) - (b.returned_date ? 1 : 0)).map((a) => {
            const eqItem = eq(a.equipment_id);
            const isActive = !a.returned_date;
            const days = a.days_used ?? 0;
            return (
              <Card key={a.id} className={isActive ? "" : "opacity-60"}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                          {isActive ? "Na projekcie" : "Zwrócony"}
                        </span>
                      </div>
                      <p className="font-semibold">{a.equipment_name ?? "Sprzęt"}</p>
                      {eqItem && (
                        <p className="text-xs text-muted-foreground">{EQUIPMENT_CATEGORY_LABELS[eqItem.category]}{eqItem.brand ? ` · ${eqItem.brand}` : ""}{eqItem.model ? ` ${eqItem.model}` : ""}</p>
                      )}
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>Od: {new Date(a.assigned_date).toLocaleDateString("pl-PL")}</span>
                        {a.returned_date && <span>Do: {new Date(a.returned_date).toLocaleDateString("pl-PL")}</span>}
                        <span>{days} {days === 1 ? "dzień" : "dni"}</span>
                        {eqItem?.daily_rate && days > 0 && (
                          <span className="font-medium text-foreground">
                            Koszt: {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(eqItem.daily_rate * days)}
                          </span>
                        )}
                      </div>
                      {a.notes && <p className="text-xs text-muted-foreground mt-1">{a.notes}</p>}
                    </div>
                    {isActive && (
                      <Button size="sm" variant="outline" onClick={() => handleReturn(a)} disabled={pending}>
                        <RotateCcw className="mr-1 h-3 w-3" /> Zwróć
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
