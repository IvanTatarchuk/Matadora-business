"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Trash2, Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createTask,
  updateTask,
  deleteTask,
  addUpdate,
  uploadProjectPhoto,
  setProjectStatus,
} from "@/lib/actions/execution";
import type {
  ProjectTask,
  ProjectTaskStatus,
  ProjectUpdate,
} from "@/types/database";

const selectClass =
  "h-9 rounded-md border border-input bg-background px-2 text-sm";

const STATUS_LABELS: Record<ProjectTaskStatus, string> = {
  todo: "Do wykonania",
  in_progress: "W trakcie",
  blocked: "Zablokowane",
  done: "Gotowe",
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  draft: "Szkic",
  open: "Otwarty",
  in_progress: "W trakcie",
  completed: "Zakończony",
  cancelled: "Anulowany",
};

type Project = {
  id: string;
  title: string;
  address: string | null;
  status: string;
};

export function ExecutionBoard({
  project,
  tasks,
  updates,
  crews,
}: {
  project: Project;
  tasks: ProjectTask[];
  updates: ProjectUpdate[];
  crews: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const overall =
    tasks.length > 0
      ? Math.round(
          tasks.reduce((sum, t) => sum + (t.progress ?? 0), 0) / tasks.length
        )
      : 0;

  const crewName = (id: string | null) =>
    id ? crews.find((c) => c.id === id)?.name ?? "—" : null;

  // Add-task form
  const [newTitle, setNewTitle] = useState("");
  const [newCrew, setNewCrew] = useState("");
  const [newDue, setNewDue] = useState("");

  function addTask() {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      await createTask({
        projectId: project.id,
        title: newTitle,
        crewId: newCrew || null,
        dueDate: newDue || null,
      });
      setNewTitle("");
      setNewCrew("");
      setNewDue("");
      router.refresh();
    });
  }

  function patchTask(id: string, patch: Parameters<typeof updateTask>[2]) {
    startTransition(async () => {
      await updateTask(id, project.id, patch);
      router.refresh();
    });
  }

  function removeTask(id: string) {
    startTransition(async () => {
      await deleteTask(id, project.id);
      router.refresh();
    });
  }

  function changeStatus(status: "in_progress" | "completed") {
    startTransition(async () => {
      await setProjectStatus(project.id, status);
      router.refresh();
    });
  }

  // Update feed
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [updateProgress, setUpdateProgress] = useState("");
  const [feedError, setFeedError] = useState<string | null>(null);

  function postUpdate() {
    setFeedError(null);
    const file = fileRef.current?.files?.[0];
    if (!note.trim() && !file) {
      setFeedError("Dodaj notatkę lub zdjęcie");
      return;
    }
    startTransition(async () => {
      let photoUrl: string | null = null;
      if (file) {
        const fd = new FormData();
        fd.append("photo", file);
        const up = await uploadProjectPhoto(fd);
        if (!up.ok) {
          setFeedError(up.error ?? "Błąd wgrywania");
          return;
        }
        photoUrl = up.url ?? null;
      }
      const res = await addUpdate({
        projectId: project.id,
        note,
        progress: updateProgress ? Number(updateProgress) : null,
        photoUrl,
      });
      if (!res.ok) {
        setFeedError(res.error ?? "Failed");
        return;
      }
      setNote("");
      setUpdateProgress("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <Badge
              variant={project.status === "completed" ? "success" : "default"}
            >
              {PROJECT_STATUS_LABELS[project.status] ?? project.status}
            </Badge>
          </div>
          {project.address && (
            <p className="text-sm text-muted-foreground">{project.address}</p>
          )}
        </div>
        <div className="flex gap-2">
          {project.status !== "in_progress" &&
            project.status !== "completed" && (
              <Button
                variant="outline"
                onClick={() => changeStatus("in_progress")}
                disabled={pending}
              >
                Rozpocznij
              </Button>
            )}
          {project.status !== "completed" && (
            <Button onClick={() => changeStatus("completed")} disabled={pending}>
              Oznacz jako ukończony
            </Button>
          )}
        </div>
      </div>

      {/* Overall progress */}
      <Card>
        <CardContent className="py-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium">Postęp ogólny</span>
            <span className="text-muted-foreground">{overall}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${overall}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Tasks */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Zadania ({tasks.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add task */}
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
              <div className="space-y-1">
                <Label>Nowe zadanie</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="np. Wylewka fundamentowa"
                />
              </div>
              <select
                className={selectClass}
                value={newCrew}
                onChange={(e) => setNewCrew(e.target.value)}
              >
                <option value="">Brak brygady</option>
                {crews.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                className="w-auto"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
              />
              <Button onClick={addTask} disabled={pending} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak zadań. Dodaj pierwsze zadanie powyżej.</p>
            ) : (
              <div className="divide-y">
                {tasks.map((t) => (
                  <div key={t.id} className="space-y-2 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{t.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTask(t.id)}
                        disabled={pending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <select
                        className={selectClass}
                        value={t.status}
                        onChange={(e) =>
                          patchTask(t.id, {
                            status: e.target.value as ProjectTaskStatus,
                          })
                        }
                      >
                        {(
                          ["todo", "in_progress", "blocked", "done"] as const
                        ).map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <select
                        className={selectClass}
                        value={t.crew_id ?? ""}
                        onChange={(e) =>
                          patchTask(t.id, { crew_id: e.target.value || null })
                        }
                      >
                        <option value="">Brak brygady</option>
                        {crews.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="h-9 w-20"
                          defaultValue={t.progress}
                          onBlur={(e) =>
                            patchTask(t.id, {
                              progress: Number(e.target.value),
                            })
                          }
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                      {t.crew_id && (
                        <span className="text-xs text-muted-foreground">
                          {crewName(t.crew_id)}
                        </span>
                      )}
                      {t.due_date && (
                        <span className="text-xs text-muted-foreground">
                          Termin: {new Date(t.due_date).toLocaleDateString("pl-PL")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Updates / photo reports */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Raporty i zdjęcia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Co się dziś działo na budowie?"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  className="h-9 w-24"
                  value={updateProgress}
                  onChange={(e) => setUpdateProgress(e.target.value)}
                  placeholder="%"
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="text-sm"
                />
              </div>
              {feedError && (
                <p className="text-sm text-destructive">{feedError}</p>
              )}
              <Button onClick={postUpdate} disabled={pending} size="sm">
                <Camera className="mr-1 h-4 w-4" /> Dodaj aktualizację
              </Button>
            </div>

            <div className="space-y-3">
              {updates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Brak aktualizacji. Dodaj pierwszy raport z budowy.</p>
              ) : (
                updates.map((u) => (
                  <div key={u.id} className="border-b pb-3 last:border-0">
                    {u.photo_url && (
                      <Image
                        src={u.photo_url}
                        alt="Site photo"
                        width={400}
                        height={300}
                        unoptimized
                        className="mb-2 h-40 w-full rounded-md object-cover"
                      />
                    )}
                    {u.note && <p className="text-sm">{u.note}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {typeof u.progress === "number" && `${u.progress}% · `}
                      {new Date(u.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
