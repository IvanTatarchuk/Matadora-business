"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, X, Clock, CalendarDays,
  Users, Download, ChevronLeft, ChevronRight, AlertTriangle,
  UserCheck, MapPin,
} from "lucide-react";
import {
  upsertAttendanceRecord,
  approveAttendanceDay,
  exportAttendanceCSV,
  type AttendanceRecord,
  type AttendanceStatus,
} from "@/lib/actions/attendance";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Worker = {
  id: string;
  full_name: string;
  specialty: string | null;
  hourly_rate: number | null;
  is_active: boolean;
};

type MonthlySummary = {
  workers: {
    worker_id: string;
    name: string;
    specialty: string | null;
    hours: number;
    cost: number;
    days: number;
    statusCounts: Record<string, number>;
  }[];
  totalHours: number;
  totalCost: number;
  daysWorked: number;
};

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; short: string; color: string; bg: string }> = {
  present:       { label: "Obecny",        short: "O",  color: "text-green-700",   bg: "bg-green-100" },
  absent:        { label: "Nieobecny",     short: "N",  color: "text-red-700",     bg: "bg-red-100" },
  late:          { label: "Spóźniony",     short: "S",  color: "text-orange-700",  bg: "bg-orange-100" },
  half_day:      { label: "Pół dnia",      short: "P",  color: "text-yellow-700",  bg: "bg-yellow-100" },
  sick_leave:    { label: "Zwolnienie L4", short: "L4", color: "text-purple-700",  bg: "bg-purple-100" },
  annual_leave:  { label: "Urlop",         short: "U",  color: "text-blue-700",    bg: "bg-blue-100" },
  other_leave:   { label: "Inn. nieob.",   short: "IN", color: "text-slate-700",   bg: "bg-slate-100" },
  overtime:      { label: "Nadgodziny",    short: "NG", color: "text-indigo-700",  bg: "bg-indigo-100" },
  business_trip: { label: "Delegacja",     short: "D",  color: "text-teal-700",    bg: "bg-teal-100" },
};

const DEFAULT_HOURS: Record<AttendanceStatus, number> = {
  present: 8, late: 8, overtime: 10, half_day: 4,
  absent: 0, sick_leave: 0, annual_leave: 0, other_leave: 0, business_trip: 8,
};

function fmt(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(n);
}

function addDays(date: string, n: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function ObeznoscClient({
  projectId,
  workers,
  initialRecords,
  monthlySummary,
  today,
}: {
  projectId: string;
  workers: Worker[];
  initialRecords: AttendanceRecord[];
  monthlySummary: MonthlySummary;
  today: string;
}) {
  const [selectedDate, setSelectedDate] = useState(today);
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  const [summary, setSummary] = useState(monthlySummary);
  const [activeTab, setActiveTab] = useState<"daily" | "monthly">("daily");
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const captureGps = useCallback((): Promise<{ lat: number; lon: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setGpsCoords(coords);
          setGpsError(null);
          resolve(coords);
        },
        () => { setGpsError("Brak dostępu do GPS"); resolve(null); },
        { timeout: 5000, maximumAge: 60000 }
      );
    });
  }, []);

  const recordMap = new Map(records.map((r) => [r.worker_id, r]));

  function handleStatusChange(workerId: string, status: AttendanceStatus) {
    setSaving(workerId);
    startTransition(async () => {
      const hours = DEFAULT_HOURS[status];
      const gps = (status === "present" || status === "late" || status === "overtime")
        ? await captureGps()
        : null;
      const res = await upsertAttendanceRecord({
        projectId,
        workerId,
        workDate: selectedDate,
        status,
        hoursWorked: hours,
        overtimeHours: status === "overtime" ? 2 : 0,
        gpsLat: gps?.lat,
        gpsLon: gps?.lon,
      });
      if (res.ok) {
        setRecords((prev) => {
          const existing = prev.findIndex((r) => r.worker_id === workerId);
          const worker = workers.find((w) => w.id === workerId);
          const updated: AttendanceRecord = {
            id: res.id ?? (existing >= 0 ? prev[existing]!.id : ""),
            project_id: projectId,
            org_id: "",
            worker_id: workerId,
            recorded_by: null,
            work_date: selectedDate,
            status,
            time_start: null,
            time_end: null,
            hours_worked: hours,
            overtime_hours: status === "overtime" ? 2 : 0,
            break_minutes: 0,
            location_note: null,
            hourly_rate_snapshot: worker?.hourly_rate ?? null,
            labor_cost: hours * (worker?.hourly_rate ?? 0),
            overtime_cost: (status === "overtime" ? 2 : 0) * (worker?.hourly_rate ?? 0) * 1.5,
            notes: null,
            approved: false,
            approved_by: null,
            approved_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            worker_name: worker?.full_name ?? null,
            worker_specialty: worker?.specialty ?? null,
          };
          if (existing >= 0) {
            const next = [...prev];
            next[existing] = updated;
            return next;
          }
          return [...prev, updated];
        });
      }
      setSaving(null);
    });
  }

  function handleHoursChange(workerId: string, hours: number) {
    const rec = recordMap.get(workerId);
    if (!rec) return;
    startTransition(async () => {
      await upsertAttendanceRecord({
        projectId, workerId,
        workDate: selectedDate,
        status: rec.status,
        hoursWorked: hours,
      });
      setRecords((prev) => prev.map((r) =>
        r.worker_id === workerId
          ? { ...r, hours_worked: hours, labor_cost: hours * (r.hourly_rate_snapshot ?? 0) }
          : r
      ));
    });
  }

  function handleApproveDay() {
    startTransition(async () => {
      await approveAttendanceDay(projectId, selectedDate);
      setRecords((prev) => prev.map((r) => ({ ...r, approved: true })));
    });
  }

  async function handleExport() {
    const now = new Date();
    const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const to = today;
    const csv = await exportAttendanceCSV(projectId, from, to);
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lista-obecnosci-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPresentToday = records.filter((r) => ["present", "late", "overtime", "half_day", "business_trip"].includes(r.status)).length;
  const totalHoursToday = records.reduce((s, r) => s + r.hours_worked + r.overtime_hours, 0);
  const totalCostToday = records.reduce((s, r) => s + r.labor_cost + r.overtime_cost, 0);
  const allApproved = records.length > 0 && records.every((r) => r.approved);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Lista obecności</h1>
          <p className="text-sm text-muted-foreground">
            Ewidencja czasu pracy — zgodnie z art. 149 KP i art. 104 KP
          </p>
        </div>
        <div className="flex items-center gap-2">
          {gpsCoords && (
            <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
              <MapPin className="h-3 w-3" />
              {gpsCoords.lat.toFixed(5)}, {gpsCoords.lon.toFixed(5)}
            </span>
          )}
          {gpsError && (
            <span className="text-xs text-orange-600">{gpsError}</span>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1 h-4 w-4" /> Eksport CSV
          </Button>
        </div>
      </div>

      {/* LEGAL NOTE */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-3 text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            <strong>Art. 149 KP:</strong> Pracodawca prowadzi ewidencję czasu pracy pracownika — podstawa ustalenia wynagrodzenia.
            Inspekcja Pracy (PIP) może nałożyć karę do <strong>30 000 zł</strong> za brak ewidencji (art. 281 KP).
          </p>
        </CardContent>
      </Card>

      {/* TABS */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("daily")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "daily" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <CalendarDays className="inline h-4 w-4 mr-1" />
          Dzienny wpis
        </button>
        <button
          onClick={() => setActiveTab("monthly")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "monthly" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Users className="inline h-4 w-4 mr-1" />
          Podsumowanie miesięczne
        </button>
      </div>

      {activeTab === "daily" && (
        <div className="space-y-4">
          {/* DATE NAVIGATOR */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-md border px-3 py-1.5 text-sm font-medium"
            />
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(addDays(selectedDate, 1))} disabled={selectedDate >= today}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {selectedDate === today && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Dzisiaj</span>
            )}
          </div>

          {/* TODAY KPIs */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Na budowie</p>
                <p className="text-xl font-bold text-green-600">{totalPresentToday} / {workers.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Godziny łącznie</p>
                <p className="text-xl font-bold">{totalHoursToday.toFixed(1)} h</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Koszt dnia</p>
                <p className="text-xl font-bold">{fmt(totalCostToday)}</p>
              </CardContent>
            </Card>
          </div>

          {/* WORKER TABLE */}
          {workers.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Users className="mx-auto h-10 w-10 opacity-20 mb-2" />
                <p>Brak pracowników. Dodaj pracowników w <Link href="/dashboard/workers" className="text-primary underline">sekcji Pracownicy</Link>.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Pracownik</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-left font-medium w-24">Godziny</th>
                        <th className="px-4 py-3 text-left font-medium">Koszt</th>
                        <th className="px-4 py-3 text-left font-medium w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {workers.map((worker) => {
                        const rec = recordMap.get(worker.id);
                        const status = rec?.status ?? null;
                        const cfg = status ? STATUS_CONFIG[status] : null;
                        const cost = rec ? rec.labor_cost + rec.overtime_cost : 0;
                        return (
                          <tr key={worker.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium">{worker.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {[worker.specialty, worker.hourly_rate ? `${worker.hourly_rate} PLN/h` : null].filter(Boolean).join(" · ")}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={status ?? ""}
                                onChange={(e) => {
                                  if (e.target.value) handleStatusChange(worker.id, e.target.value as AttendanceStatus);
                                }}
                                disabled={pending && saving === worker.id}
                                className={`rounded-md border px-2 py-1 text-xs font-medium ${cfg ? `${cfg.bg} ${cfg.color} border-transparent` : "border-muted-foreground/30 text-muted-foreground"}`}
                              >
                                <option value="">— wybierz —</option>
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                  <option key={k} value={k}>{v.label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              {rec && ["present", "late", "overtime", "half_day", "business_trip"].includes(rec.status) ? (
                                <input
                                  type="number"
                                  min={0}
                                  max={24}
                                  step={0.5}
                                  value={rec.hours_worked}
                                  onChange={(e) => handleHoursChange(worker.id, Number(e.target.value))}
                                  className="w-16 rounded border px-2 py-1 text-sm text-center"
                                />
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {cost > 0 ? fmt(cost) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              {rec?.approved && <UserCheck className="h-4 w-4 text-green-500" />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* APPROVE DAY */}
          {records.length > 0 && (
            <div className="flex items-center justify-between rounded-lg border bg-card p-4">
              <div>
                <p className="text-sm font-medium">Zatwierdź listę obecności za {new Date(selectedDate).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}</p>
                <p className="text-xs text-muted-foreground">Zatwierdzenie jest wymagane dla celów kadrowo-płacowych</p>
              </div>
              {allApproved ? (
                <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                  <CheckCircle2 className="h-4 w-4" /> Zatwierdzona
                </span>
              ) : (
                <Button size="sm" onClick={handleApproveDay} disabled={pending}>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Zatwierdź dzień
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "monthly" && (
        <div className="space-y-4">
          {/* MONTHLY KPIs */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Dni roboczych</p>
                <p className="text-2xl font-bold">{summary.daysWorked}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Godziny łącznie</p>
                <p className="text-2xl font-bold">{summary.totalHours.toFixed(1)} h</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Koszt pracy miesięczny</p>
                <p className="text-2xl font-bold text-primary">{fmt(summary.totalCost)}</p>
              </CardContent>
            </Card>
          </div>

          {/* PER WORKER BREAKDOWN */}
          {summary.workers.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Clock className="mx-auto h-10 w-10 opacity-20 mb-2" />
                <p>Brak zapisów obecności w tym miesiącu</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Podsumowanie per pracownik — bieżący miesiąc</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Pracownik</th>
                        <th className="px-4 py-2 text-left font-medium">Specjalizacja</th>
                        <th className="px-4 py-2 text-right font-medium">Dni</th>
                        <th className="px-4 py-2 text-right font-medium">Godziny</th>
                        <th className="px-4 py-2 text-right font-medium">Koszt</th>
                        <th className="px-4 py-2 text-left font-medium">Statystyki</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {summary.workers.map((w) => (
                        <tr key={w.worker_id} className="hover:bg-muted/20">
                          <td className="px-4 py-2 font-medium">{w.name}</td>
                          <td className="px-4 py-2 text-muted-foreground">{w.specialty ?? "—"}</td>
                          <td className="px-4 py-2 text-right">{w.days}</td>
                          <td className="px-4 py-2 text-right">{w.hours.toFixed(1)} h</td>
                          <td className="px-4 py-2 text-right font-semibold">{fmt(w.cost)}</td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(w.statusCounts).map(([s, count]) => {
                                const cfg = STATUS_CONFIG[s as AttendanceStatus];
                                return cfg ? (
                                  <span key={s} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>
                                    {cfg.short}: {count}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 border-t font-semibold">
                      <tr>
                        <td className="px-4 py-2" colSpan={2}>RAZEM</td>
                        <td className="px-4 py-2 text-right">{summary.daysWorked}</td>
                        <td className="px-4 py-2 text-right">{summary.totalHours.toFixed(1)} h</td>
                        <td className="px-4 py-2 text-right">{fmt(summary.totalCost)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Eksportuj do CSV (Excel)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
