"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  createPunchItem,
  updatePunchStatus,
  deletePunchItem,
  uploadPunchPhoto,
  type PunchItem,
  type PunchStatus,
} from "@/lib/actions/punch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<PunchStatus, string> = {
  open: "Otwarte",
  in_progress: "W trakcie",
  resolved: "Naprawione",
};

const STATUS_COLOR: Record<PunchStatus, string> = {
  open: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const NEXT_STATUS: Record<PunchStatus, PunchStatus | null> = {
  open: "in_progress",
  in_progress: "resolved",
  resolved: null,
};

const NEXT_LABEL: Record<PunchStatus, string> = {
  open: "Przypisz do naprawy",
  in_progress: "Oznacz jako naprawione",
  resolved: "",
};

interface Props {
  projectId: string;
  initialItems: PunchItem[];
  canCreate?: boolean;
}

export function PunchList({ projectId, initialItems, canCreate = true }: Props) {
  const [items, setItems] = useState(initialItems);
  const [pending, startT] = useTransition();
  const [filter, setFilter] = useState<PunchStatus | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    photoUrl: "",
  });
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  const shown =
    filter === "all" ? items : items.filter((i) => i.status === filter);

  const counts: Record<PunchStatus | "all", number> = {
    all: items.length,
    open: items.filter((i) => i.status === "open").length,
    in_progress: items.filter((i) => i.status === "in_progress").length,
    resolved: items.filter((i) => i.status === "resolved").length,
  };

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("photo", file);
    const res = await uploadPunchPhoto(fd);
    setUploading(false);
    if (res.ok && res.id) setForm((f) => ({ ...f, photoUrl: res.id! }));
    else setMsg(res.error ?? "Błąd wgrywania zdjęcia");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setMsg("Tytuł jest wymagany"); return; }
    setMsg("");
    startT(async () => {
      const res = await createPunchItem({
        projectId,
        title: form.title,
        description: form.description || undefined,
        photoUrl: form.photoUrl || null,
        dueDate: form.dueDate || null,
      });
      if (!res.ok) { setMsg(res.error ?? "Błąd zapisu"); return; }
      setItems((prev) => [
        {
          id: res.id!,
          project_id: projectId,
          title: form.title,
          description: form.description || null,
          photo_url: form.photoUrl || null,
          plan_x: null, plan_y: null, floor_plan_url: null,
          status: "open",
          assigned_to: null,
          due_date: form.dueDate || null,
          resolved_at: null,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setForm({ title: "", description: "", dueDate: "", photoUrl: "" });
      setShowForm(false);
    });
  }

  function advanceStatus(item: PunchItem) {
    const next = NEXT_STATUS[item.status];
    if (!next) return;
    startT(async () => {
      await updatePunchStatus(item.id, projectId, next);
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: next, resolved_at: next === "resolved" ? new Date().toISOString() : null }
            : i
        )
      );
    });
  }

  function remove(id: string) {
    startT(async () => {
      await deletePunchItem(id, projectId);
      setItems((prev) => prev.filter((i) => i.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Lista usterek</h2>
          <p className="text-sm text-muted-foreground">
            Śledzenie usterek i uwag do projektu
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowForm((v) => !v)} size="sm">
            {showForm ? "Anuluj" : "+ Nowa usterka"}
          </Button>
        )}
      </div>

      {/* New item form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="space-y-3 rounded-xl border bg-card p-4 shadow-sm"
        >
          <h3 className="font-medium">Nowa usterka</h3>
          <Input
            placeholder="Nazwa usterki *"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            rows={3}
            placeholder="Opis (opcjonalnie)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="flex gap-2">
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="w-auto"
            />
            <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
              <span>{uploading ? "Wgrywanie..." : "📷 Zdjęcie"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
            </label>
          </div>
          {form.photoUrl && (
            <div className="relative h-32 w-32 overflow-hidden rounded-lg border">
              <Image src={form.photoUrl} alt="preview" fill className="object-cover" unoptimized />
            </div>
          )}
          {msg && <p className="text-sm text-red-500">{msg}</p>}
          <Button type="submit" size="sm" disabled={pending || uploading}>
            Zapisz usterkę
          </Button>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "open", "in_progress", "resolved"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === s
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
          >
            {s === "all" ? "Wszystkie" : STATUS_LABEL[s]} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Items */}
      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          Brak usterek
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-start"
            >
              {/* Photo thumbnail */}
              {item.photo_url && (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border">
                  <Image
                    src={item.photo_url}
                    alt={item.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.title}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[item.status]}`}
                  >
                    {STATUS_LABEL[item.status]}
                  </span>
                  {item.due_date && (
                    <span className="text-xs text-muted-foreground">
                      До: {item.due_date}
                    </span>
                  )}
                  {item.resolved_at && (
                    <span className="text-xs text-green-600">
                      ✓ {new Date(item.resolved_at).toLocaleDateString("pl-PL")}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {NEXT_STATUS[item.status] && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => advanceStatus(item)}
                    disabled={pending}
                  >
                    {NEXT_LABEL[item.status]}
                  </Button>
                )}
                <button
                  onClick={() => remove(item.id)}
                  className="text-muted-foreground hover:text-destructive"
                  disabled={pending}
                  aria-label="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
