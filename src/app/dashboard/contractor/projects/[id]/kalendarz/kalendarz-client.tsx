"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, ChevronLeft, ChevronRight, CheckCircle2, Trash2 } from "lucide-react";
import {
  createCalendarEvent, updateEventStatus, deleteCalendarEvent, listCalendarEvents,
  type CalendarEvent, type EventType, type EventPriority,
} from "@/lib/actions/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const MONTHS_FULL = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
const DAYS_PL = ["Pn", "Wt", "Śr", "Czw", "Pt", "Sb", "Nd"];

const TYPE_CONFIG: Record<EventType, { label: string; color: string }> = {
  task:       { label: "Zadanie",      color: "#3b82f6" },
  milestone:  { label: "Kamień mil.", color: "#f59e0b" },
  meeting:    { label: "Spotkanie",    color: "#8b5cf6" },
  inspection: { label: "Inspekcja",   color: "#ef4444" },
  delivery:   { label: "Dostawa",     color: "#10b981" },
  deadline:   { label: "Termin",      color: "#f97316" },
  holiday:    { label: "Dni wolne",   color: "#6b7280" },
  other:      { label: "Inne",        color: "#64748b" },
};

const PRIORITY_CONFIG: Record<EventPriority, { label: string; dot: string }> = {
  low:      { label: "Niski",     dot: "bg-green-400" },
  medium:   { label: "Średni",    dot: "bg-yellow-400" },
  high:     { label: "Wysoki",    dot: "bg-orange-400" },
  critical: { label: "Krytyczny", dot: "bg-red-500" },
};

export function KalendarzClient({
  projectId, initialEvents, initialYear, initialMonth,
}: { projectId: string; initialEvents: CalendarEvent[]; initialYear: number; initialMonth: number }) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [showForm, setShowForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", type: "task" as EventType, priority: "medium" as EventPriority,
    startDate: new Date().toISOString().slice(0, 10), endDate: "",
    assigneeName: "", location: "", notes: "",
  });

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = lastDay.getDate();

  const grid: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  while (grid.length % 7 !== 0) grid.push(null);

  const today = new Date().toISOString().slice(0, 10);

  function dateStr(d: number) {
    return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function eventsForDay(d: number) {
    const ds = dateStr(d);
    return events.filter((e) => e.start_date <= ds && (e.end_date ?? e.start_date) >= ds);
  }

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
    loadEvents(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1);
  }

  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
    loadEvents(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1);
  }

  function loadEvents(y: number, m: number) {
    startTransition(async () => {
      const loaded = await listCalendarEvents(projectId, y, m);
      setEvents(loaded);
    });
  }

  function handleCreate() {
    if (!form.title.trim()) { setError("Tytuł jest wymagany"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createCalendarEvent({
        projectId, title: form.title, type: form.type, priority: form.priority,
        startDate: form.startDate || selectedDay || today,
        endDate: form.endDate || undefined,
        assigneeName: form.assigneeName || undefined, location: form.location || undefined,
        color: TYPE_CONFIG[form.type].color, notes: form.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newEv: CalendarEvent = {
        id: res.id!, project_id: projectId, org_id: "", created_by: null,
        title: form.title, description: null, type: form.type,
        color: TYPE_CONFIG[form.type].color,
        start_date: form.startDate || selectedDay || today,
        end_date: form.endDate || null, all_day: true,
        start_time: null, end_time: null,
        assignee_name: form.assigneeName || null, location: form.location || null,
        status: "planned", priority: form.priority, recurrence: null, notes: form.notes || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setEvents((prev) => [...prev, newEv]);
      setShowForm(false); setSelectedDay(null);
      setForm({ title: "", type: "task", priority: "medium", startDate: today, endDate: "", assigneeName: "", location: "", notes: "" });
    });
  }

  function handleComplete(id: string) {
    startTransition(async () => {
      await updateEventStatus(id, projectId, "completed");
      setEvents((prev) => prev.map((e) => e.id === id ? { ...e, status: "completed" as const } : e));
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCalendarEvent(id, projectId);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    });
  }

  const todayEvents = events.filter((e) => e.start_date <= today && (e.end_date ?? e.start_date) >= today);
  const upcoming = events.filter((e) => e.start_date > today).sort((a, b) => a.start_date.localeCompare(b.start_date)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Kalendarz projektu</h1>
          <p className="text-sm text-muted-foreground">Zadania, kamienie milowe, inspekcje i terminy w jednym widoku</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-semibold px-1">{MONTHS_FULL[month - 1]} {year}</span>
          <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-1 h-4 w-4" />Dodaj</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* CALENDAR GRID */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
            {DAYS_PL.map((d) => (
              <div key={d} className="bg-muted/50 text-center text-xs font-semibold py-2 text-muted-foreground">{d}</div>
            ))}
            {grid.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="bg-background min-h-[80px]" />;
              const ds = dateStr(day);
              const dayEvents = eventsForDay(day);
              const isToday = ds === today;
              const isSelected = selectedDay === ds;
              return (
                <div key={day}
                  className={`bg-background min-h-[80px] p-1.5 cursor-pointer hover:bg-muted/30 transition-colors border-t border-border/50 ${isToday ? "bg-primary/5 border-primary/30" : ""} ${isSelected ? "ring-2 ring-inset ring-primary" : ""}`}
                  onClick={() => { setSelectedDay(isSelected ? null : ds); setShowForm(false); }}>
                  <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>{day}</div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div key={ev.id} className={`text-[10px] truncate rounded px-1 py-0.5 text-white font-medium ${ev.status === "completed" ? "opacity-50 line-through" : ""}`}
                        style={{ backgroundColor: ev.color ?? "#3b82f6" }}>
                        {ev.type === "milestone" ? "◆ " : ""}{ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && <p className="text-[9px] text-muted-foreground">+{dayEvents.length - 3}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SIDEBAR: selected day + upcoming */}
        <div className="space-y-4">
          {selectedDay && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{new Date(selectedDay).toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {eventsForDay(Number(selectedDay.split("-")[2] ?? "0")).length === 0
                  ? <p className="text-xs text-muted-foreground">Brak zdarzeń</p>
                  : eventsForDay(Number(selectedDay.split("-")[2] ?? "0")).map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ev.color ?? "#3b82f6" }} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium ${ev.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{ev.title}</p>
                          <p className="text-[10px] text-muted-foreground">{TYPE_CONFIG[ev.type].label}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {ev.status !== "completed" && (
                          <button onClick={() => handleComplete(ev.id)} disabled={pending}>
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(ev.id)} disabled={pending}>
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </div>
                  ))}
                <Button size="sm" className="w-full mt-2" variant="outline" onClick={() => { setForm({ ...form, startDate: selectedDay }); setShowForm(true); }}>
                  <Plus className="h-3 w-3 mr-1" />Dodaj zdarzenie
                </Button>
              </CardContent>
            </Card>
          )}

          {todayEvents.length > 0 && (
            <Card className="border-primary/30">
              <CardHeader className="pb-2"><CardTitle className="text-xs text-primary">Dzisiaj ({todayEvents.length})</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {todayEvents.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ev.color ?? "#3b82f6" }} />
                    <p className="text-xs flex-1 truncate">{ev.title}</p>
                    <span className={`text-[9px] rounded-full px-1 py-0.5 ${PRIORITY_CONFIG[ev.priority].dot} bg-opacity-20 text-foreground`}>{PRIORITY_CONFIG[ev.priority].label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {upcoming.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Nadchodzące</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {upcoming.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ev.color ?? "#3b82f6" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{ev.title}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(ev.start_date).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ADD FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowe zdarzenie</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="text-sm font-medium">Tytuł *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Typ</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EventType })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Priorytet</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as EventPriority })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Data początku *</label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Data końca</label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Odpowiedzialny</label>
                <Input value={form.assigneeName} onChange={(e) => setForm({ ...form, assigneeName: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Lokalizacja</label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-1" /></div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Dodawanie..." : "Dodaj zdarzenie"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
