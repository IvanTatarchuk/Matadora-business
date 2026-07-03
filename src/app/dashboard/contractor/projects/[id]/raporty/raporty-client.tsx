"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, Sun, Cloud, CloudRain, Snowflake,
  Wind, CloudLightning, Eye, ChevronDown, ChevronUp,
  CheckCircle2, Clock, FileText, AlertTriangle, Users,
} from "lucide-react";
import {
  upsertDailyReport, submitDailyReport, approveDailyReport,
  type DailyReport, type WeatherCondition, type Visitor,
} from "@/lib/actions/daily-reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const WEATHER_CONFIG: Record<WeatherCondition, { label: string; icon: React.ElementType; color: string }> = {
  sunny:      { label: "Słonecznie",    icon: Sun,           color: "text-yellow-500" },
  cloudy:     { label: "Zachmurzenie",  icon: Cloud,         color: "text-slate-400" },
  overcast:   { label: "Pochmurno",     icon: Cloud,         color: "text-slate-500" },
  rain:       { label: "Deszcz",        icon: CloudRain,     color: "text-blue-500" },
  heavy_rain: { label: "Ulewny deszcz", icon: CloudRain,     color: "text-blue-700" },
  snow:       { label: "Śnieg",         icon: Snowflake,     color: "text-blue-300" },
  fog:        { label: "Mgła",          icon: Eye,           color: "text-slate-400" },
  windy:      { label: "Wietrzno",      icon: Wind,          color: "text-cyan-500" },
  storm:      { label: "Burza",         icon: CloudLightning,color: "text-purple-600" },
};

const STATUS_CONFIG: Record<DailyReport["status"], { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: "Szkic",      color: "bg-slate-100 text-slate-600",   icon: Clock },
  submitted: { label: "Złożony",    color: "bg-blue-100 text-blue-700",     icon: FileText },
  approved:  { label: "Zatwierdzony", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
};

import React from "react";

export function RaportyClient({ projectId, initialReports }: { projectId: string; initialReports: DailyReport[] }) {
  const [reports, setReports] = useState<DailyReport[]>(initialReports);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [showEditor, setShowEditor] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    reportDate: new Date().toISOString().slice(0, 10),
    weatherCondition: "" as WeatherCondition | "",
    temperatureC: "", weatherNotes: "",
    workPerformed: "", workDelayed: false, delayReason: "", delayHours: "0",
    materialsDelivered: "", equipmentNotes: "",
    safetyIncidents: "0", safetyNotes: "",
    visitors: [] as Visitor[],
  });

  const [newVisitor, setNewVisitor] = useState({ name: "", company: "", purpose: "", time: "" });

  const stats = {
    total: reports.length,
    approved: reports.filter((r) => r.status === "approved").length,
    submitted: reports.filter((r) => r.status === "submitted").length,
    delayed: reports.filter((r) => r.work_delayed).length,
    incidents: reports.reduce((s, r) => s + r.safety_incidents, 0),
  };

  function openEditorFor(report?: DailyReport) {
    if (report) {
      setForm({
        reportDate: report.report_date,
        weatherCondition: report.weather_condition ?? "",
        temperatureC: report.temperature_c !== null ? String(report.temperature_c) : "",
        weatherNotes: report.weather_notes ?? "",
        workPerformed: report.work_performed ?? "",
        workDelayed: report.work_delayed,
        delayReason: report.delay_reason ?? "",
        delayHours: String(report.delay_hours),
        materialsDelivered: report.materials_delivered ?? "",
        equipmentNotes: report.equipment_notes ?? "",
        safetyIncidents: String(report.safety_incidents),
        safetyNotes: report.safety_notes ?? "",
        visitors: report.visitors ?? [],
      });
    } else {
      setForm({ reportDate: new Date().toISOString().slice(0, 10), weatherCondition: "", temperatureC: "", weatherNotes: "", workPerformed: "", workDelayed: false, delayReason: "", delayHours: "0", materialsDelivered: "", equipmentNotes: "", safetyIncidents: "0", safetyNotes: "", visitors: [] });
    }
    setShowEditor(true);
  }

  function handleAddVisitor() {
    if (!newVisitor.name.trim()) return;
    setForm((f) => ({ ...f, visitors: [...f.visitors, { ...newVisitor }] }));
    setNewVisitor({ name: "", company: "", purpose: "", time: "" });
  }

  function handleSave() {
    if (!form.workPerformed.trim()) { setError("Opis wykonanych prac jest wymagany"); return; }
    setError(null);
    startTransition(async () => {
      const res = await upsertDailyReport({
        projectId, reportDate: form.reportDate,
        weatherCondition: form.weatherCondition ? (form.weatherCondition as WeatherCondition) : undefined,
        temperatureC: form.temperatureC ? Number(form.temperatureC) : undefined,
        weatherNotes: form.weatherNotes || undefined,
        workPerformed: form.workPerformed,
        workDelayed: form.workDelayed,
        delayReason: form.delayReason || undefined,
        delayHours: Number(form.delayHours),
        visitors: form.visitors.length > 0 ? form.visitors : undefined,
        materialsDelivered: form.materialsDelivered || undefined,
        equipmentNotes: form.equipmentNotes || undefined,
        safetyIncidents: Number(form.safetyIncidents),
        safetyNotes: form.safetyNotes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }

      const newReport: DailyReport = {
        id: res.id!,
        project_id: projectId, org_id: "", created_by: null,
        report_date: form.reportDate,
        weather_condition: form.weatherCondition as WeatherCondition || null,
        temperature_c: form.temperatureC ? Number(form.temperatureC) : null,
        weather_notes: form.weatherNotes || null,
        work_performed: form.workPerformed,
        work_delayed: form.workDelayed,
        delay_reason: form.delayReason || null,
        delay_hours: Number(form.delayHours),
        visitors: form.visitors,
        inspections_on_site: [],
        materials_delivered: form.materialsDelivered || null,
        equipment_notes: form.equipmentNotes || null,
        safety_incidents: Number(form.safetyIncidents),
        safety_notes: form.safetyNotes || null,
        status: "draft", submitted_at: null, approved_at: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setReports((prev) => {
        const idx = prev.findIndex((r) => r.report_date === form.reportDate);
        if (idx >= 0) { const updated = [...prev]; updated[idx] = newReport; return updated; }
        return [newReport, ...prev].sort((a, b) => b.report_date.localeCompare(a.report_date));
      });
      setShowEditor(false);
    });
  }

  function handleSubmit(id: string) {
    startTransition(async () => {
      await submitDailyReport(id, projectId);
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: "submitted" as const } : r));
    });
  }

  function handleApprove(id: string) {
    startTransition(async () => {
      await approveDailyReport(id, projectId);
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: "approved" as const } : r));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Raporty dzienne</h1>
          <p className="text-sm text-muted-foreground">Dziennik budowy — pogoda, prace, goście, bezpieczeństwo (Procore Daily Log standard)</p>
        </div>
        <Button onClick={() => openEditorFor()}>
          <Plus className="mr-1 h-4 w-4" /> Nowy raport
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-5">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Łącznie raportów</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Zatwierdzone</p><p className="text-2xl font-bold text-green-600">{stats.approved}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Złożone</p><p className="text-2xl font-bold text-blue-600">{stats.submitted}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Dni opóźnień</p><p className="text-2xl font-bold text-orange-600">{stats.delayed}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Incydenty BHP</p><p className="text-2xl font-bold text-red-600">{stats.incidents}</p></CardContent></Card>
      </div>

      {/* EDITOR */}
      {showEditor && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Raport dzienny — {new Date(form.reportDate).toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowEditor(false)}>✕</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* DATE */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Data raportu</label>
                <Input type="date" value={form.reportDate} onChange={(e) => setForm({ ...form, reportDate: e.target.value })} className="mt-1" />
              </div>
            </div>

            {/* WEATHER */}
            <div>
              <p className="text-sm font-semibold mb-2">🌤 Warunki pogodowe</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Pogoda</label>
                  <select value={form.weatherCondition} onChange={(e) => setForm({ ...form, weatherCondition: e.target.value as WeatherCondition | "" })}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                    <option value="">— Wybierz —</option>
                    {Object.entries(WEATHER_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Temperatura (°C)</label>
                  <Input type="number" min={-30} max={50} value={form.temperatureC} onChange={(e) => setForm({ ...form, temperatureC: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Uwagi dot. pogody</label>
                  <Input value={form.weatherNotes} onChange={(e) => setForm({ ...form, weatherNotes: e.target.value })} className="mt-1" placeholder="np. silny wiatr utrudniał prace" />
                </div>
              </div>
            </div>

            {/* WORK */}
            <div>
              <p className="text-sm font-semibold mb-2">🏗 Wykonane prace</p>
              <textarea value={form.workPerformed} onChange={(e) => setForm({ ...form, workPerformed: e.target.value })}
                rows={4} placeholder="Opisz szczegółowo wykonane w tym dniu prace budowlane, ich lokalizację i zakres..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
              <div className="mt-2 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.workDelayed} onChange={(e) => setForm({ ...form, workDelayed: e.target.checked })} className="rounded" />
                  <span className="text-sm">Prace były opóźnione</span>
                </label>
                {form.workDelayed && (
                  <div className="flex gap-2 flex-1">
                    <Input value={form.delayReason} onChange={(e) => setForm({ ...form, delayReason: e.target.value })} placeholder="Powód opóźnienia" className="flex-1" />
                    <Input type="number" min={0} max={24} value={form.delayHours} onChange={(e) => setForm({ ...form, delayHours: e.target.value })} className="w-24" placeholder="godz." />
                  </div>
                )}
              </div>
            </div>

            {/* MATERIALS & EQUIPMENT */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">📦 Dostarczone materiały</label>
                <textarea value={form.materialsDelivered} onChange={(e) => setForm({ ...form, materialsDelivered: e.target.value })}
                  rows={2} placeholder="np. Cement 50 worków, Stal zbrojeniowa 2t..."
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium">🚜 Sprzęt na budowie</label>
                <textarea value={form.equipmentNotes} onChange={(e) => setForm({ ...form, equipmentNotes: e.target.value })}
                  rows={2} placeholder="np. Koparka CAT 320 — cały dzień, Mieszalnik — od 8:00"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
              </div>
            </div>

            {/* SAFETY */}
            <div>
              <p className="text-sm font-semibold mb-2">⛑ Bezpieczeństwo</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Incydenty BHP (liczba)</label>
                  <Input type="number" min={0} value={form.safetyIncidents} onChange={(e) => setForm({ ...form, safetyIncidents: e.target.value })} className="mt-1" />
                </div>
                {Number(form.safetyIncidents) > 0 && (
                  <div>
                    <label className="text-sm font-medium">Opis incydentów</label>
                    <textarea value={form.safetyNotes} onChange={(e) => setForm({ ...form, safetyNotes: e.target.value })} rows={2}
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
                  </div>
                )}
              </div>
            </div>

            {/* VISITORS */}
            <div>
              <p className="text-sm font-semibold mb-2">👥 Goście i wizytatorzy</p>
              <div className="grid gap-2 sm:grid-cols-4 mb-2">
                <Input value={newVisitor.name} onChange={(e) => setNewVisitor({ ...newVisitor, name: e.target.value })} placeholder="Imię i nazwisko" />
                <Input value={newVisitor.company} onChange={(e) => setNewVisitor({ ...newVisitor, company: e.target.value })} placeholder="Firma" />
                <Input value={newVisitor.purpose} onChange={(e) => setNewVisitor({ ...newVisitor, purpose: e.target.value })} placeholder="Cel wizyty" />
                <Button type="button" variant="outline" onClick={handleAddVisitor}><Plus className="h-4 w-4 mr-1" />Dodaj</Button>
              </div>
              {form.visitors.map((v, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-muted/30 rounded px-3 py-1.5 mb-1">
                  <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium">{v.name}</span>
                  {v.company && <span className="text-muted-foreground">· {v.company}</span>}
                  {v.purpose && <span className="text-muted-foreground">· {v.purpose}</span>}
                  <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0" onClick={() => setForm((f) => ({ ...f, visitors: f.visitors.filter((_, j) => j !== i) }))}>✕</Button>
                </div>
              ))}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={pending}>{pending ? "Zapisywanie..." : "Zapisz raport"}</Button>
              <Button variant="outline" onClick={() => setShowEditor(false)}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LIST */}
      {reports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Brak raportów dziennych</p>
            <p className="text-sm mt-1">Twórz codzienne raporty z przebiegu budowy</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => {
            const cfg = STATUS_CONFIG[report.status];
            const StatusIcon = cfg.icon;
            const weatherCfg = report.weather_condition ? WEATHER_CONFIG[report.weather_condition] : null;
            const WeatherIcon = weatherCfg?.icon;
            const isExpanded = expandedId === report.id;

            return (
              <Card key={report.id} className={`transition-colors ${report.safety_incidents > 0 ? "border-red-200" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold">
                          {new Date(report.report_date).toLocaleDateString("pl-PL", { weekday: "short", day: "numeric", month: "long" })}
                        </p>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />{cfg.label}
                        </span>
                        {weatherCfg && WeatherIcon && (
                          <span className={`flex items-center gap-1 text-xs ${weatherCfg.color}`}>
                            <WeatherIcon className="h-3.5 w-3.5" />
                            {weatherCfg.label}
                            {report.temperature_c !== null && ` ${report.temperature_c}°C`}
                          </span>
                        )}
                        {report.work_delayed && (
                          <span className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" /> Opóźnienie {report.delay_hours}h
                          </span>
                        )}
                        {report.safety_incidents > 0 && (
                          <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                            ⛑ {report.safety_incidents} incydent(ów)
                          </span>
                        )}
                      </div>
                      {report.work_performed && (
                        <p className={`text-sm text-muted-foreground ${isExpanded ? "" : "line-clamp-2"}`}>{report.work_performed}</p>
                      )}
                      {isExpanded && (
                        <div className="mt-3 space-y-2 text-sm">
                          {report.materials_delivered && (
                            <p><span className="font-medium">📦 Materiały:</span> {report.materials_delivered}</p>
                          )}
                          {report.equipment_notes && (
                            <p><span className="font-medium">🚜 Sprzęt:</span> {report.equipment_notes}</p>
                          )}
                          {report.visitors?.length > 0 && (
                            <div>
                              <p className="font-medium">👥 Goście:</p>
                              {report.visitors.map((v, i) => (
                                <p key={i} className="text-muted-foreground pl-4">{v.name}{v.company ? ` (${v.company})` : ""}{v.purpose ? ` — ${v.purpose}` : ""}</p>
                              ))}
                            </div>
                          )}
                          {report.safety_notes && (
                            <p className="text-red-600"><span className="font-medium">⛑ Incydenty:</span> {report.safety_notes}</p>
                          )}
                          {report.weather_notes && <p className="text-muted-foreground">{report.weather_notes}</p>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : report.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      {report.status === "draft" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openEditorFor(report)}>Edytuj</Button>
                          <Button size="sm" onClick={() => handleSubmit(report.id)} disabled={pending}>Złóż</Button>
                        </>
                      )}
                      {report.status === "submitted" && (
                        <Button size="sm" onClick={() => handleApprove(report.id)} disabled={pending}>
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Zatwierdź
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
