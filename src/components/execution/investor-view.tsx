"use client";

import Link from "next/link";
import Image from "next/image";
import type { ProjectTask, ProjectUpdate } from "@/types/database";

interface Props {
  project: {
    id: string;
    title: string;
    address: string | null;
    status: string;
  };
  tasks: ProjectTask[];
  updates: (ProjectUpdate & { photoUrl?: string })[];
  budget: number | null;
  totalCost: number;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Szkic", open: "Otwarte", in_progress: "W realizacji",
  completed: "Zakończone", cancelled: "Anulowane",
};

const STATUS_COLOR: Record<string, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  blocked: "bg-red-100 text-red-700",
};

const TASK_STATUS_LABEL: Record<string, string> = {
  todo: "Do zrobienia", in_progress: "W toku", done: "Gotowe", blocked: "Zablokowane",
};

function fmt(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(n);
}

export function InvestorView({ project, tasks, updates, budget, totalCost }: Props) {
  const done = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const latest = [...updates]
    .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
    .slice(0, 20);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          {project.address && <p className="text-sm text-muted-foreground">{project.address}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
            {STATUS_LABEL[project.status] ?? project.status}
          </span>
          <Link
            href={`/dashboard/investor/projects/${project.id}/wiadomosci`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Wiadomości i zatwierdzenia
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Postęp", value: `${pct}%` },
          { label: "Zadania", value: `${done} / ${total}` },
          { label: "Wartość kontraktu", value: fmt(budget) },
          { label: "Koszty (szac.)", value: fmt(totalCost), cls: budget != null && totalCost > budget ? "text-red-600" : "" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="rounded-lg border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`mt-1 text-2xl font-semibold ${cls ?? ""}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>Postęp ogólny</span>
          <span>{pct}%</span>
        </div>
        <div className="h-3 rounded-full bg-muted">
          <div className="h-3 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Tasks */}
      {tasks.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Plan robót</h2>
          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-start justify-between rounded-lg border bg-card p-3">
                <div>
                  <p className="font-medium">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
                  {t.due_date && <p className="mt-1 text-xs text-muted-foreground">Termin: {new Date(t.due_date).toLocaleDateString("pl-PL")}</p>}
                </div>
                <span className={`ml-4 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[t.status] ?? ""}`}>
                  {TASK_STATUS_LABEL[t.status] ?? t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo feed */}
      {latest.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Aktualizacje postępu</h2>
          <div className="space-y-4">
            {latest.map((u) => (
              <div key={u.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {u.progress != null ? `${u.progress}% ukończone` : "Aktualizacja"}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("pl-PL") : ""}
                  </span>
                </div>
                {u.note && <p className="mt-1 text-sm text-muted-foreground">{u.note}</p>}
                {u.photo_url && (
                  <div className="mt-3 overflow-hidden rounded-md">
                    <Image src={u.photo_url} alt="Zdjęcie z budowy" width={800} height={400} className="w-full object-cover" unoptimized />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && updates.length === 0 && (
        <p className="text-sm text-muted-foreground">Brak danych realizacji. Sprawdź ponownie po rozpoczęciu prac przez wykonawcę.</p>
      )}
    </div>
  );
}
