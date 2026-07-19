"use client";

import { useState, useTransition } from "react";
import { GitBranch, ExternalLink, Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  createAgentTask,
  updateAgentTaskStatus,
  type AgentTask,
  type AgentTaskStatus,
} from "@/lib/actions/agent-tasks";

const STATUS_LABEL: Record<AgentTaskStatus, string> = {
  idle: "W kolejce",
  processing: "W trakcie",
  awaiting_review: "Czeka na review",
  completed: "Ukończone",
  blocked: "Zablokowane",
  error: "Błąd",
};

const STATUS_VARIANT: Record<
  AgentTaskStatus,
  "default" | "warning" | "success" | "secondary" | "destructive"
> = {
  idle: "secondary",
  processing: "warning",
  awaiting_review: "warning",
  completed: "success",
  blocked: "destructive",
  error: "destructive",
};

const STATUS_OPTIONS: AgentTaskStatus[] = [
  "idle",
  "processing",
  "awaiting_review",
  "completed",
  "blocked",
  "error",
];

type Agent = { id: string; name: string; category: string };

export function AgentStudioClient({
  tasks,
  agents,
}: {
  tasks: AgentTask[];
  agents: Agent[];
}) {
  return (
    <div className="space-y-6">
      <NewTaskForm agents={agents} />
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Brak zadań w kolejce.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewTaskForm({ agents }: { agents: Agent[] }) {
  const [pending, startTransition] = useTransition();
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [type, setType] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!agentId || !type.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await createAgentTask({ agentId, type: type.trim() });
      if (res.ok) {
        setType("");
      } else {
        setError(res.error ?? "Nie udało się dodać zadania.");
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-sm font-semibold">Dodaj zadanie do kolejki</p>
        <p className="text-xs text-muted-foreground">
          To wyłącznie kolejkuje zadanie (status: „W kolejce”) — uruchomienie agenta na tym
          zadaniu nadal odbywa się ręcznie w aplikacji desktopowej Matadora Agent Studio.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            disabled={pending || agents.length === 0}
            className="rounded-md border px-2 py-2 text-sm sm:w-56"
          >
            {agents.length === 0 && <option value="">Brak agentów w rejestrze</option>}
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.category})
              </option>
            ))}
          </select>
          <Textarea
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="Opis zadania (np. „region/quarter columns for cost_items admin form”)"
            rows={2}
            className="flex-1"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button size="sm" onClick={submit} disabled={pending || !agentId || !type.trim()}>
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Dodaj do kolejki
        </Button>
      </CardContent>
    </Card>
  );
}

function TaskRow({ task }: { task: AgentTask }) {
  const [pending, startTransition] = useTransition();

  function changeStatus(status: AgentTaskStatus) {
    startTransition(async () => {
      await updateAgentTaskStatus(task.id, status);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {task.agents?.name ?? task.agent_id}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {task.agents?.category ?? "?"}
              </Badge>
              <Badge variant={STATUS_VARIANT[task.status]}>{STATUS_LABEL[task.status]}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Utworzono: {new Date(task.created_at).toLocaleString("pl-PL")}
              {task.completed_at &&
                ` · Zakończono: ${new Date(task.completed_at).toLocaleString("pl-PL")}`}
            </p>
          </div>
          <select
            value={task.status}
            onChange={(e) => changeStatus(e.target.value as AgentTaskStatus)}
            disabled={pending}
            className="rounded-md border px-2 py-1 text-xs"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <p className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">
          {task.type}
        </p>

        {task.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <p className="font-semibold uppercase tracking-wide">Błąd</p>
            <p className="mt-1 whitespace-pre-wrap">{task.error}</p>
          </div>
        )}

        {task.branch && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <GitBranch className="h-3.5 w-3.5 shrink-0" />
            <span className="font-semibold">{task.branch}</span>
            {task.compare_url && (
              <a
                href={task.compare_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-amber-900 underline"
              >
                Compare URL <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
