"use client";

import type { ProjectTask } from "@/types/database";

const STATUS_COLOR: Record<string, string> = {
  todo: "bg-muted",
  in_progress: "bg-blue-500",
  done: "bg-green-500",
  blocked: "bg-red-500",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "До виконання",
  in_progress: "В роботі",
  done: "Виконано",
  blocked: "Заблоковано",
};

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
}

export function GanttView({
  tasks,
  projectStart,
}: {
  tasks: ProjectTask[];
  projectStart?: string | null;
}) {
  // Determine timeline span from task dates or default to 30-day window.
  const today = new Date();
  const tasksWithDates = tasks.filter((t) => t.start_date || t.due_date);

  let timelineStart: Date;
  let timelineEnd: Date;

  if (tasksWithDates.length > 0) {
    const allDates = tasksWithDates.flatMap((t) => [
      t.start_date ? new Date(t.start_date) : null,
      t.due_date ? new Date(t.due_date) : null,
    ]).filter(Boolean) as Date[];

    timelineStart = addDays(
      new Date(Math.min(...allDates.map((d) => d.getTime()))),
      -2
    );
    timelineEnd = addDays(
      new Date(Math.max(...allDates.map((d) => d.getTime()))),
      3
    );
  } else {
    timelineStart = projectStart ? addDays(new Date(projectStart), 0) : today;
    timelineEnd = addDays(timelineStart, 30);
  }

  const totalDays = daysBetween(timelineStart, timelineEnd) || 1;

  // Generate tick marks for the header (every 7 days or less).
  const tickStep = totalDays <= 14 ? 1 : totalDays <= 60 ? 7 : 14;
  const ticks: Date[] = [];
  for (let i = 0; i <= totalDays; i += tickStep) {
    ticks.push(addDays(timelineStart, i));
  }

  function barLeft(start: Date) {
    const d = daysBetween(timelineStart, start);
    return `${Math.max(0, Math.min(100, (d / totalDays) * 100)).toFixed(2)}%`;
  }

  function barWidth(start: Date, end: Date) {
    const duration = Math.max(1, daysBetween(start, end));
    return `${Math.min(100, (duration / totalDays) * 100).toFixed(2)}%`;
  }

  const todayPct = `${Math.max(0, Math.min(100, (daysBetween(timelineStart, today) / totalDays) * 100)).toFixed(2)}%`;

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
        Немає задач для відображення на Gantt
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${STATUS_COLOR[k]}`} />
            {v}
          </span>
        ))}
      </div>

      <div className="overflow-auto rounded-xl border bg-card shadow-sm">
        <div className="min-w-[700px]">
          {/* Timeline header */}
          <div className="relative flex border-b bg-muted/50">
            <div className="w-48 shrink-0 border-r px-3 py-2 text-xs font-medium text-muted-foreground">
              Задача
            </div>
            <div className="relative flex-1 py-2">
              {ticks.map((tick) => (
                <span
                  key={tick.toISOString()}
                  className="absolute -translate-x-1/2 text-xs text-muted-foreground"
                  style={{ left: barLeft(tick) }}
                >
                  {fmtDate(tick)}
                </span>
              ))}
            </div>
          </div>

          {/* Rows */}
          {tasks.map((task) => {
            const start = task.start_date
              ? new Date(task.start_date)
              : timelineStart;
            const end = task.due_date
              ? new Date(task.due_date)
              : addDays(start, 3);

            return (
              <div
                key={task.id}
                className="flex items-center border-b last:border-0 hover:bg-muted/20"
              >
                <div className="flex w-48 shrink-0 items-center gap-2 border-r px-3 py-3">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${STATUS_COLOR[task.status]}`}
                  />
                  <span className="truncate text-sm">{task.title}</span>
                </div>

                <div className="relative flex-1 py-3 pr-2">
                  {/* Today marker */}
                  <div
                    className="absolute bottom-0 top-0 w-px bg-orange-400/60"
                    style={{ left: todayPct }}
                  />

                  {/* Bar */}
                  <div
                    className={`absolute top-1/2 h-5 -translate-y-1/2 rounded-md opacity-90 ${STATUS_COLOR[task.status]}`}
                    style={{
                      left: barLeft(start),
                      width: barWidth(start, end),
                    }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center truncate px-1.5 text-[10px] font-medium text-white">
                      {task.progress}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
