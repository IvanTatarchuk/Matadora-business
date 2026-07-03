"use client";

import { useState, useTransition } from "react";
import { Plus, X, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Users } from "lucide-react";
import {
  createDispatchAssignment, updateDispatchStatus, deleteDispatchAssignment,
  type DispatchAssignment, type DispatchStatus,
} from "@/lib/actions/dispatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import React from "react";

const STATUS_CONFIG: Record<DispatchStatus, { label: string; color: string }> = {
  planned:   { label: "Planowane",  color: "bg-blue-100 text-blue-700" },
  confirmed: { label: "Potwierdzone", color: "bg-teal-100 text-teal-700" },
  completed: { label: "Wykonano",   color: "bg-green-100 text-green-700" },
  absent:    { label: "Nieobecny",  color: "bg-red-100 text-red-700" },
  cancelled: { label: "Odwołano",   color: "bg-slate-100 text-slate-400" },
};

const DAYS_PL = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

export function PlanowanieClient({ initialAssignments, initialStart }: { initialAssignments: DispatchAssignment[]; initialStart: string }) {
  const [assignments, setAssignments] = useState<DispatchAssignment[]>(initialAssignments);
  const [weekStart, setWeekStart] = useState(initialStart);
  const [showForm, setShowForm] = useState<string | null>(null); // date for which we're adding
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ workerName: "", projectId: "", taskDescription: "", startTime: "07:00", endTime: "15:00", notes: "" });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function prevWeek() { setWeekStart((s) => addDays(s, -7)); }
  function nextWeek() { setWeekStart((s) => addDays(s, 7)); }

  const byDay = (date: string) => assignments.filter((a) => a.work_date === date);

  function handleCreate(date: string) {
    if (!form.workerName.trim() || !form.projectId.trim()) { setError("Pracownik i ID projektu są wymagane"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createDispatchAssignment({
        projectId: form.projectId, workerName: form.workerName,
        workDate: date, startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        taskDescription: form.taskDescription || undefined,
        notes: form.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newA: DispatchAssignment = {
        id: res.id!, org_id: "", project_id: form.projectId, created_by: null,
        worker_id: null, worker_name: form.workerName,
        work_date: date, start_time: form.startTime || null, end_time: form.endTime || null,
        task_description: form.taskDescription || null, location_note: null,
        status: "planned", notes: form.notes || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setAssignments((prev) => [...prev, newA]);
      setShowForm(null);
      setForm({ workerName: "", projectId: "", taskDescription: "", startTime: "07:00", endTime: "15:00", notes: "" });
    });
  }

  function handleStatus(id: string, status: DispatchStatus) {
    startTransition(async () => {
      await updateDispatchStatus(id, status);
      setAssignments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteDispatchAssignment(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    });
  }

  const totalPlanned = assignments.filter((a) => a.work_date >= weekStart && a.work_date <= addDays(weekStart, 6)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" />Planowanie brygad</h1>
          <p className="text-sm text-muted-foreground">Tygodniowy harmonogram pracy — {totalPlanned} przypisań w tym tygodniu</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevWeek}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium px-2">
            {formatDay(weekStart)} — {formatDay(addDays(weekStart, 6))}
          </span>
          <Button variant="outline" size="sm" onClick={nextWeek}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid gap-2 min-w-[700px]" style={{ gridTemplateColumns: `repeat(7, minmax(140px, 1fr))` }}>
          {weekDays.map((date, dayIdx) => {
            const dayAssignments = byDay(date);
            const isToday = date === new Date().toISOString().slice(0, 10);
            return (
              <div key={date} className={`rounded-lg border p-2 min-h-[200px] ${isToday ? "border-primary/40 bg-primary/5" : "bg-muted/20"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className={`text-xs font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>{DAYS_PL[dayIdx]}</p>
                    <p className={`text-sm font-bold ${isToday ? "text-primary" : ""}`}>{formatDay(date)}</p>
                  </div>
                  <button className="h-6 w-6 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center"
                    onClick={() => setShowForm(showForm === date ? null : date)}>
                    <Plus className="h-3.5 w-3.5 text-primary" />
                  </button>
                </div>

                {showForm === date && (
                  <div className="mb-2 space-y-1.5 bg-background rounded border p-2">
                    <Input value={form.workerName} onChange={(e) => setForm({ ...form, workerName: e.target.value })} placeholder="Pracownik *" className="h-7 text-xs" />
                    <Input value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} placeholder="ID projektu *" className="h-7 text-xs" />
                    <Input value={form.taskDescription} onChange={(e) => setForm({ ...form, taskDescription: e.target.value })} placeholder="Zadanie" className="h-7 text-xs" />
                    <div className="grid grid-cols-2 gap-1">
                      <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="h-7 text-xs" />
                      <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="h-7 text-xs" />
                    </div>
                    {error && <p className="text-[10px] text-destructive">{error}</p>}
                    <div className="flex gap-1">
                      <Button size="sm" className="h-6 text-xs flex-1" onClick={() => handleCreate(date)} disabled={pending}>Dodaj</Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setShowForm(null); setError(null); }}><X className="h-3 w-3" /></Button>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  {dayAssignments.map((a) => {
                    const cfg = STATUS_CONFIG[a.status];
                    return (
                      <Card key={a.id} className="shadow-none">
                        <CardContent className="p-2">
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{a.worker_name}</p>
                              {a.task_description && <p className="text-[10px] text-muted-foreground truncate">{a.task_description}</p>}
                              {a.start_time && <p className="text-[10px] text-muted-foreground">{a.start_time}–{a.end_time}</p>}
                              <span className={`inline-block rounded-full px-1.5 text-[9px] font-semibold mt-0.5 ${cfg.color}`}>{cfg.label}</span>
                            </div>
                            <div className="flex flex-col gap-0.5 shrink-0">
                              {a.status === "planned" && (
                                <button onClick={() => handleStatus(a.id, "completed")} disabled={pending} title="Wykonano">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                </button>
                              )}
                              {a.status === "planned" && (
                                <button onClick={() => handleStatus(a.id, "absent")} disabled={pending} title="Nieobecny">
                                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                                </button>
                              )}
                              <button onClick={() => handleDelete(a.id)} disabled={pending} title="Usuń">
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {dayAssignments.length === 0 && (
                    <p className="text-[10px] text-muted-foreground/40 text-center py-4">Brak przypisań</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
