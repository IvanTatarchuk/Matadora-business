"use client";

import { useState, useTransition } from "react";
import { Workflow, Plus, Play, Pause, Clock, CheckCircle2, AlertCircle, X, Search, Filter, ChevronDown, ChevronUp, ListChecks } from "lucide-react";
import {
  createWorkflowDefinition, toggleWorkflow, triggerWorkflow,
  listWorkflowSteps, createWorkflowStep,
  type WorkflowDefinition, type WorkflowExecution, type WorkflowTrigger,
  type WorkflowStep, type WorkflowStepType,
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

const STEP_TYPE_LABELS: Record<WorkflowStepType, string> = {
  action: "Akcja",
  condition: "Warunek",
  notification: "Powiadomienie",
  approval: "Zatwierdzenie",
  delay: "Opóźnienie",
  integration: "Integracja",
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

  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set());
  const [workflowSteps, setWorkflowSteps] = useState<Record<string, WorkflowStep[]>>({});
  const [stepsLoading, setStepsLoading] = useState<Set<string>>(new Set());
  const [addStepFor, setAddStepFor] = useState<string | null>(null);
  const [stepForm, setStepForm] = useState({ name: "", description: "", stepType: "action" as WorkflowStepType });

  function handleCreateWorkflow() {
    if (!workflowForm.name) { setError("Nazwa jest wymagana"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createWorkflowDefinition(workflowForm);
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
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
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      // Reload workflows
      const newWorkflows = await fetch("/api/workflows/definitions").then(r => r.json());
      setWorkflows(newWorkflows);
    });
  }

  function handleTriggerWorkflow(workflowId: string) {
    setError(null);
    startTransition(async () => {
      const res = await triggerWorkflow(workflowId);
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      // Reload executions
      const newExecutions = await fetch("/api/workflows/executions").then(r => r.json());
      setExecutions(newExecutions);
    });
  }

  function toggleExpanded(workflowId: string) {
    setExpandedWorkflows((prev) => {
      const next = new Set(prev);
      if (next.has(workflowId)) {
        next.delete(workflowId);
      } else {
        next.add(workflowId);
        if (!workflowSteps[workflowId]) {
          setStepsLoading((p) => new Set(p).add(workflowId));
          listWorkflowSteps(workflowId).then((steps) => {
            setWorkflowSteps((p) => ({ ...p, [workflowId]: steps }));
            setStepsLoading((p) => {
              const n = new Set(p);
              n.delete(workflowId);
              return n;
            });
          });
        }
      }
      return next;
    });
  }

  function handleAddStep(workflowId: string) {
    if (!stepForm.name) { setError("Nazwa kroku jest wymagana"); return; }
    setError(null);
    startTransition(async () => {
      const existing = workflowSteps[workflowId] ?? [];
      const res = await createWorkflowStep({
        workflowId,
        stepOrder: existing.length,
        name: stepForm.name,
        description: stepForm.description || undefined,
        stepType: stepForm.stepType,
        stepConfig: {},
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      setStepForm({ name: "", description: "", stepType: "action" });
      setAddStepFor(null);
      const steps = await listWorkflowSteps(workflowId);
      setWorkflowSteps((p) => ({ ...p, [workflowId]: steps }));
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
          Automatyzacja procesów roboczych
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Zarządzanie workflow i automatyzacja procesów biznesowych
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
              <p className="text-sm text-muted-foreground">Wykonania</p>
              <Play className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{stats.totalExecutions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Zakończone sukcesem</p>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{stats.completedExecutions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Błędy</p>
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
          Nowy workflow
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj workflow..."
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
          <option value="all">Wszystkie statusy</option>
          <option value="active">Aktywne</option>
          <option value="inactive">Nieaktywne</option>
        </select>
      </div>

      {/* Workflow Form */}
      {showWorkflowForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Utwórz workflow</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowWorkflowForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nazwa</label>
              <Input value={workflowForm.name} onChange={(e) => setWorkflowForm({ ...workflowForm, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Opis</label>
              <Input value={workflowForm.description} onChange={(e) => setWorkflowForm({ ...workflowForm, description: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Typ wyzwalacza</label>
              <select
                value={workflowForm.triggerType}
                onChange={(e) => setWorkflowForm({ ...workflowForm, triggerType: e.target.value as any })}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="manual">Ręczny</option>
                <option value="scheduled">Wg harmonogramu</option>
                <option value="event_based">Zdarzeniowy</option>
                <option value="webhook">Webhook</option>
                <option value="condition">Warunkowy</option>
              </select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreateWorkflow} disabled={pending}>{pending ? "Tworzenie..." : "Utwórz"}</Button>
              <Button variant="outline" onClick={() => { setShowWorkflowForm(false); setError(null); }}>Anuluj</Button>
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
              Brak workflow
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWorkflows.map((workflow) => {
                const isExpanded = expandedWorkflows.has(workflow.id);
                const steps = workflowSteps[workflow.id] ?? [];
                const isLoadingSteps = stepsLoading.has(workflow.id);
                return (
                  <div key={workflow.id} className="rounded-lg border">
                    <div className="flex items-center justify-between p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{workflow.name}</p>
                          {workflow.is_active ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Pause className="h-4 w-4 text-gray-400" />}
                        </div>
                        <p className="text-sm text-muted-foreground">{workflow.trigger_type}</p>
                        <p className="text-xs text-muted-foreground">{new Date(workflow.created_at).toLocaleString("pl-PL")}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => toggleExpanded(workflow.id)}>
                          <ListChecks className="h-4 w-4 mr-1" />
                          Kroki
                          {isExpanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                        </Button>
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

                    {isExpanded && (
                      <div className="border-t bg-muted/30 p-3 space-y-2">
                        {isLoadingSteps ? (
                          <p className="text-sm text-muted-foreground">Wczytywanie kroków...</p>
                        ) : steps.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Brak zdefiniowanych kroków.</p>
                        ) : (
                          <ol className="space-y-1.5">
                            {steps.map((step, idx) => (
                              <li key={step.id} className="flex items-start gap-2 rounded-md bg-background p-2 text-sm">
                                <span className="mt-0.5 shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-medium">{step.name}</p>
                                    <span className="text-xs text-muted-foreground">{STEP_TYPE_LABELS[step.step_type]}</span>
                                  </div>
                                  {step.description && (
                                    <p className="text-xs text-muted-foreground">{step.description}</p>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ol>
                        )}

                        {addStepFor === workflow.id ? (
                          <div className="space-y-2 rounded-md border bg-background p-2.5">
                            <Input
                              placeholder="Nazwa kroku"
                              value={stepForm.name}
                              onChange={(e) => setStepForm({ ...stepForm, name: e.target.value })}
                              className="h-8 text-sm"
                            />
                            <Input
                              placeholder="Opis (opcjonalnie)"
                              value={stepForm.description}
                              onChange={(e) => setStepForm({ ...stepForm, description: e.target.value })}
                              className="h-8 text-sm"
                            />
                            <select
                              value={stepForm.stepType}
                              onChange={(e) => setStepForm({ ...stepForm, stepType: e.target.value as WorkflowStepType })}
                              className="h-8 w-full rounded-md border bg-background px-2 text-sm"
                            >
                              {(Object.keys(STEP_TYPE_LABELS) as WorkflowStepType[]).map((type) => (
                                <option key={type} value={type}>{STEP_TYPE_LABELS[type]}</option>
                              ))}
                            </select>
                            <div className="flex gap-2">
                              <Button size="sm" disabled={pending} onClick={() => handleAddStep(workflow.id)}>
                                {pending ? "Dodawanie..." : "Dodaj krok"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setAddStepFor(null); setStepForm({ name: "", description: "", stepType: "action" }); setError(null); }}
                              >
                                Anuluj
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setAddStepFor(workflow.id)}>
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Dodaj krok
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Executions */}
      <Card>
        <CardHeader>
          <CardTitle>Wykonania</CardTitle>
        </CardHeader>
        <CardContent>
          {executions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak wykonań
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
                      <p className="text-sm font-medium">Krok {execution.current_step}</p>
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
