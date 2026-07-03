"use client";

import { useState, useTransition } from "react";
import { Workflow, Plus, Play, Pause, Clock, CheckCircle2, AlertCircle, X, Search, Filter } from "lucide-react";
import {
  createWorkflowDefinition, toggleWorkflow, triggerWorkflow,
  type WorkflowDefinition, type WorkflowExecution, type WorkflowTrigger,
} from "@/lib/actions/workflows";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  initialWorkflows: WorkflowDefinition[];
  initialExecutions: WorkflowExecution[];
  initialStats: {
    totalWorkflows: number;
    activeWorkflows: number;
    totalExecutions: number;
    runningExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
  };
};

export function WorkflowsClient({ initialWorkflows, initialExecutions, initialStats }: Props) {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>(initialWorkflows);
  const [executions, setExecutions] = useState<WorkflowExecution[]>(initialExecutions);
  const [stats, setStats] = useState(initialStats);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [showWorkflowForm, setShowWorkflowForm] = useState(false);
  const [workflowForm, setWorkflowForm] = useState({
    name: "",
    description: "",
    triggerType: "manual" as WorkflowTrigger,
    triggerConfig: {},
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  function handleCreateWorkflow() {
    if (!workflowForm.name) { setError("Назва є обов'язковою"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createWorkflowDefinition(workflowForm);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      setShowWorkflowForm(false);
      setWorkflowForm({ name: "", description: "", triggerType: "manual", triggerConfig: {} });
      // Reload workflows
      const newWorkflows = await fetch("/api/workflows/definitions").then(r => r.json());
      setWorkflows(newWorkflows);
    });
  }

  function handleToggleWorkflow(workflowId: string) {
    setError(null);
    startTransition(async () => {
      const res = await toggleWorkflow(workflowId);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      // Reload workflows
      const newWorkflows = await fetch("/api/workflows/definitions").then(r => r.json());
      setWorkflows(newWorkflows);
    });
  }

  function handleTriggerWorkflow(workflowId: string) {
    setError(null);
    startTransition(async () => {
      const res = await triggerWorkflow(workflowId);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      // Reload executions
      const newExecutions = await fetch("/api/workflows/executions").then(r => r.json());
      setExecutions(newExecutions);
    });
  }

  const filteredWorkflows = workflows.filter((w) => {
    const matchesSearch = !searchQuery || w.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && w.is_active) ||
      (filterStatus === "inactive" && !w.is_active);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Workflow className="h-6 w-6" />
          Автоматизація робочих процесів
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Керування workflow та автоматизація бізнес-процесів
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Workflow</p>
              <Workflow className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{stats.activeWorkflows}/{stats.totalWorkflows}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Виконання</p>
              <Play className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{stats.totalExecutions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Успішні</p>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{stats.completedExecutions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Помилки</p>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold">{stats.failedExecutions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setShowWorkflowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Новий workflow
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Шукати workflow..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "inactive")}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Всі статуси</option>
          <option value="active">Активні</option>
          <option value="inactive">Неактивні</option>
        </select>
      </div>

      {/* Workflow Form */}
      {showWorkflowForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Створити workflow</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowWorkflowForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Назва</label>
              <Input value={workflowForm.name} onChange={(e) => setWorkflowForm({ ...workflowForm, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Опис</label>
              <Input value={workflowForm.description} onChange={(e) => setWorkflowForm({ ...workflowForm, description: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Тип тригера</label>
              <select
                value={workflowForm.triggerType}
                onChange={(e) => setWorkflowForm({ ...workflowForm, triggerType: e.target.value as any })}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="manual">Ручний</option>
                <option value="scheduled">За розкладом</option>
                <option value="event_based">Подійний</option>
                <option value="webhook">Webhook</option>
                <option value="condition">Умовний</option>
              </select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreateWorkflow} disabled={pending}>{pending ? "Створення..." : "Створити"}</Button>
              <Button variant="outline" onClick={() => { setShowWorkflowForm(false); setError(null); }}>Скасувати</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflows */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredWorkflows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Немає workflow
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWorkflows.map((workflow) => (
                <div key={workflow.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{workflow.name}</p>
                      {workflow.is_active ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Pause className="h-4 w-4 text-gray-400" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{workflow.trigger_type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(workflow.created_at).toLocaleString("pl-PL")}</p>
                  </div>
                  <div className="flex gap-1">
                    {workflow.is_active && (
                      <Button variant="outline" size="sm" onClick={() => handleTriggerWorkflow(workflow.id)}>
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleToggleWorkflow(workflow.id)}>
                      {workflow.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Executions */}
      <Card>
        <CardHeader>
          <CardTitle>Виконання</CardTitle>
        </CardHeader>
        <CardContent>
          {executions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Немає виконань
            </div>
          ) : (
            <div className="space-y-2">
              {executions.slice(0, 20).map((execution) => (
                <div key={execution.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        execution.status === "completed" ? "bg-green-100 text-green-700" :
                        execution.status === "running" ? "bg-blue-100 text-blue-700" :
                        execution.status === "failed" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {execution.status}
                      </span>
                      <p className="text-sm font-medium">Крок {execution.current_step}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(execution.started_at).toLocaleString("pl-PL")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
