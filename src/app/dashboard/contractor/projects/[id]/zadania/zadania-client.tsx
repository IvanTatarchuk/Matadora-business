"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, CheckCircle2, Circle, Clock, AlertTriangle, Trash2 } from "lucide-react";
import {
  createTaskCard, moveTaskCard, deleteTaskCard,
  type TaskCard, type TaskStatus, type TaskPriority, type TaskCategory,
} from "@/lib/actions/task-board";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import React from "react";

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "backlog",     label: "Backlog",      color: "bg-slate-100" },
  { status: "todo",        label: "Do zrobienia", color: "bg-blue-50" },
  { status: "in_progress", label: "W trakcie",    color: "bg-yellow-50" },
  { status: "review",      label: "Przegląd",     color: "bg-purple-50" },
  { status: "done",        label: "Gotowe",       color: "bg-green-50" },
];

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; icon: React.ElementType }> = {
  low:    { label: "Niski",    color: "text-slate-400",   icon: Circle },
  medium: { label: "Średni",   color: "text-blue-500",    icon: Circle },
  high:   { label: "Wysoki",   color: "text-orange-500",  icon: AlertTriangle },
  urgent: { label: "Pilny",    color: "text-red-600",     icon: AlertTriangle },
};

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  general:     "Ogólne",
  technical:   "Techniczne",
  admin:       "Administracja",
  procurement: "Zaopatrzenie",
  safety:      "BHP",
  quality:     "Jakość",
  other:       "Inne",
};

export function ZadaniaClient({ projectId, initialTasks }: { projectId: string; initialTasks: TaskCard[] }) {
  const [tasks, setTasks] = useState<TaskCard[]>(initialTasks);
  const [showForm, setShowForm] = useState<TaskStatus | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", description: "", priority: "medium" as TaskPriority,
    category: "general" as TaskCategory, dueDate: "", estimatedHours: "",
  });

  const tasksByStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status);

  const stats = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "done").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    overdue: tasks.filter((t) => t.due_date && t.status !== "done" && new Date(t.due_date) < new Date()).length,
  };

  function handleCreate(status: TaskStatus) {
    if (!form.title.trim()) { setError("Tytuł jest wymagany"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createTaskCard({
        projectId, title: form.title, status,
        priority: form.priority, category: form.category,
        description: form.description || undefined,
        dueDate: form.dueDate || undefined,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newTask: TaskCard = {
        id: res.id!, project_id: projectId, org_id: "", created_by: null, assigned_to: null,
        title: form.title, description: form.description || null,
        status, priority: form.priority, category: form.category,
        due_date: form.dueDate || null,
        estimated_hours: form.estimatedHours ? Number(form.estimatedHours) : null,
        actual_hours: null, position: tasks.length * 10, tags: [], completed_at: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setTasks((prev) => [...prev, newTask]);
      setShowForm(null);
      setForm({ title: "", description: "", priority: "medium", category: "general", dueDate: "", estimatedHours: "" });
    });
  }

  function handleMove(id: string, newStatus: TaskStatus) {
    startTransition(async () => {
      await moveTaskCard(id, projectId, newStatus);
      setTasks((prev) => prev.map((t) => t.id === id
        ? { ...t, status: newStatus, completed_at: newStatus === "done" ? new Date().toISOString() : null }
        : t));
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteTaskCard(id, projectId);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Tablica zadań</h1>
          <p className="text-sm text-muted-foreground">Kanban board — zarządzanie zadaniami projektu</p>
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span className="bg-muted rounded px-2 py-1">{stats.done}/{stats.total} gotowe</span>
          {stats.overdue > 0 && <span className="bg-red-100 text-red-700 rounded px-2 py-1">⚠ {stats.overdue} po terminie</span>}
          {stats.inProgress > 0 && <span className="bg-yellow-100 text-yellow-700 rounded px-2 py-1">{stats.inProgress} w trakcie</span>}
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(200px, 1fr))` }}>
        {COLUMNS.map((col) => {
          const colTasks = tasksByStatus(col.status);
          return (
            <div key={col.status} className={`rounded-lg ${col.color} p-3 min-h-[400px]`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{col.label}</p>
                  <span className="bg-white/60 text-xs font-medium rounded-full px-1.5 py-0.5">{colTasks.length}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-white/50"
                  onClick={() => setShowForm(col.status === showForm ? null : col.status)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* QUICK ADD FORM */}
              {showForm === col.status && (
                <Card className="mb-2 shadow-sm">
                  <CardContent className="p-3 space-y-2">
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Tytuł zadania..." className="h-7 text-xs" autoFocus />
                    <div className="grid grid-cols-2 gap-1.5">
                      <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                        className="rounded border bg-background px-1.5 py-1 text-xs">
                        {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                        className="h-7 text-xs" />
                    </div>
                    {error && <p className="text-xs text-destructive">{error}</p>}
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-6 text-xs flex-1" onClick={() => handleCreate(col.status)} disabled={pending}>Dodaj</Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setShowForm(null); setError(null); }}><X className="h-3 w-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* TASK CARDS */}
              <div className="space-y-2">
                {colTasks.map((task) => {
                  const pCfg = PRIORITY_CONFIG[task.priority];
                  const PIcon = pCfg.icon;
                  const isOverdue = task.due_date && task.status !== "done" && new Date(task.due_date) < new Date();
                  return (
                    <Card key={task.id} className={`shadow-sm hover:shadow-md transition-shadow cursor-default ${isOverdue ? "border-red-200" : ""}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-1.5 mb-2">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {task.status === "done"
                              ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                              : <PIcon className={`h-3.5 w-3.5 shrink-0 ${pCfg.color}`} />}
                            <p className={`text-xs font-medium leading-tight ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                          </div>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 shrink-0 opacity-0 group-hover:opacity-100"
                            onClick={() => handleDelete(task.id)} disabled={pending}>
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                        <div className="flex gap-1 flex-wrap mb-2">
                          <span className="text-[10px] bg-muted rounded px-1 py-0.5">{CATEGORY_LABELS[task.category]}</span>
                          {task.due_date && (
                            <span className={`text-[10px] rounded px-1 py-0.5 flex items-center gap-0.5 ${isOverdue ? "bg-red-100 text-red-700" : "bg-muted"}`}>
                              <Clock className="h-2.5 w-2.5" />
                              {new Date(task.due_date).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}
                            </span>
                          )}
                          {task.estimated_hours && (
                            <span className="text-[10px] bg-muted rounded px-1 py-0.5">{task.estimated_hours}h</span>
                          )}
                        </div>
                        {/* MOVE BUTTONS */}
                        <div className="flex gap-1 flex-wrap">
                          {col.status !== "done" && (
                            <select defaultValue="" onChange={(e) => { if (e.target.value) handleMove(task.id, e.target.value as TaskStatus); }}
                              className="rounded border bg-background px-1 py-0.5 text-[10px] text-muted-foreground flex-1 min-w-0">
                              <option value="" disabled>Przenieś →</option>
                              {COLUMNS.filter((c) => c.status !== col.status).map((c) => (
                                <option key={c.status} value={c.status}>{c.label}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {colTasks.length === 0 && (
                  <div className="text-center py-8 text-xs text-muted-foreground/50">
                    Brak zadań
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
