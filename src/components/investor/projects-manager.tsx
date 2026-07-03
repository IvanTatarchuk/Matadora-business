"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Upload, EyeOff, Users, Activity } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPLN } from "@/lib/utils";
import { PROJECT_CATEGORIES } from "@/lib/project-meta";
import {
  createProject,
  publishProject,
  unpublishProject,
  deleteProject,
  type CreateProjectPayload,
} from "@/lib/actions/projects";
import type { Project } from "@/types/database";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning"> = {
  draft: "secondary",
  open: "warning",
  in_progress: "default",
  completed: "success",
  cancelled: "secondary",
};

export type ProjectWithBids = Project & { bidCount: number };

const EMPTY: CreateProjectPayload = {
  title: "",
  description: "",
  address: "",
  category: "Renovation",
  surfaceArea: undefined,
  budgetMin: undefined,
  budgetMax: undefined,
  deadline: "",
};

export function ProjectsManager({ projects }: { projects: ProjectWithBids[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateProjectPayload>(EMPTY);

  function patch(p: Partial<CreateProjectPayload>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  function submit(publish: boolean) {
    setError(null);
    if (!form.title.trim()) {
      setError("Project title is required.");
      return;
    }
    startTransition(async () => {
      const res = await createProject({ ...form, publish });
      if (!res.ok) {
        setError(res.error ?? "Something went wrong");
        return;
      }
      setForm(EMPTY);
      router.refresh();
    });
  }

  function runAction(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Action failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Apartment renovation — Mokotów"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description ?? ""}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Scope of work, expectations, constraints…"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address ?? ""}
                onChange={(e) => patch({ address: e.target.value })}
                placeholder="ul. Przykładowa 1, Warszawa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => patch({ category: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {PROJECT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="surface">Surface area (m²)</Label>
              <Input
                id="surface"
                type="number"
                min={0}
                value={form.surfaceArea ?? ""}
                onChange={(e) =>
                  patch({ surfaceArea: Number(e.target.value) || undefined })
                }
                placeholder="68"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={form.deadline ?? ""}
                onChange={(e) => patch({ deadline: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgetMin">Budget min (PLN)</Label>
              <Input
                id="budgetMin"
                type="number"
                min={0}
                value={form.budgetMin ?? ""}
                onChange={(e) =>
                  patch({ budgetMin: Number(e.target.value) || undefined })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgetMax">Budget max (PLN)</Label>
              <Input
                id="budgetMax"
                type="number"
                min={0}
                value={form.budgetMax ?? ""}
                onChange={(e) =>
                  patch({ budgetMax: Number(e.target.value) || undefined })
                }
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button onClick={() => submit(true)} disabled={pending}>
              <Upload className="h-4 w-4" /> Publish to marketplace
            </Button>
            <Button
              variant="outline"
              onClick={() => submit(false)}
              disabled={pending}
            >
              <Plus className="h-4 w-4" /> Save as draft
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My projects ({projects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No projects yet. Create one above and publish it so contractors can bid.
            </p>
          ) : (
            <div className="divide-y">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{p.title}</p>
                      <Badge variant={STATUS_VARIANT[p.status] ?? "secondary"}>
                        {p.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.category ?? "—"}
                      {p.budget_min || p.budget_max
                        ? ` · ${formatPLN(Number(p.budget_min ?? 0))}–${formatPLN(Number(p.budget_max ?? 0))}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {(p.status === "in_progress" || p.status === "completed") && (
                      <Link
                        href={`/dashboard/investor/projects/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                      >
                        <Activity className="h-4 w-4" /> Progress
                      </Link>
                    )}
                    <Link
                      href={`/dashboard/marketplace/${p.id}`}
                      className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                    >
                      <Users className="h-4 w-4" /> {p.bidCount} bid
                      {p.bidCount === 1 ? "" : "s"}
                    </Link>

                    {p.status === "draft" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runAction(() => publishProject(p.id))}
                        disabled={pending}
                      >
                        <Upload className="h-4 w-4" /> Publish
                      </Button>
                    ) : p.status === "open" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runAction(() => unpublishProject(p.id))}
                        disabled={pending}
                      >
                        <EyeOff className="h-4 w-4" /> Unpublish
                      </Button>
                    ) : null}

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => runAction(() => deleteProject(p.id))}
                      disabled={pending}
                      aria-label="Delete project"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
