"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, AlertTriangle, CheckCircle2, Search, Clock } from "lucide-react";
import {
  createIncident, updateIncidentStatus,
  type Incident, type IncidentType, type IncidentSeverity, type IncidentStatus,
} from "@/lib/actions/incidents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import React from "react";

const TYPE_LABELS: Record<IncidentType, string> = {
  near_miss:        "Zdarzenie potencjalnie wypadkowe",
  first_aid:        "Udzielenie pierwszej pomocy",
  medical_treatment:"Leczenie ambulatoryjne",
  lost_time:        "Wypadek z utratą czasu pracy",
  fatality:         "Wypadek śmiertelny",
  property_damage:  "Szkoda majątkowa",
  environmental:    "Zdarzenie środowiskowe",
  other:            "Inne",
};

const SEVERITY_CONFIG: Record<IncidentSeverity, { label: string; color: string }> = {
  low:      { label: "Niskie",     color: "bg-green-100 text-green-700" },
  medium:   { label: "Średnie",    color: "bg-yellow-100 text-yellow-700" },
  high:     { label: "Wysokie",    color: "bg-orange-100 text-orange-700" },
  critical: { label: "Krytyczne",  color: "bg-red-100 text-red-700" },
};

const STATUS_CONFIG: Record<IncidentStatus, { label: string; color: string; icon: React.ElementType }> = {
  open:         { label: "Otwarte",       color: "bg-red-100 text-red-700",     icon: AlertTriangle },
  investigating: { label: "W trakcie",    color: "bg-orange-100 text-orange-700", icon: Search },
  closed:       { label: "Zamknięte",    color: "bg-teal-100 text-teal-700",    icon: CheckCircle2 },
  reported:     { label: "Zgłoszone PIP",color: "bg-purple-100 text-purple-700",icon: Clock },
};

export function WypadkiClient({ projectId, initialIncidents }: { projectId: string; initialIncidents: Incident[] }) {
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", description: "", location: "",
    type: "near_miss" as IncidentType, severity: "low" as IncidentSeverity,
    incidentDate: new Date().toISOString().slice(0, 10), incidentTime: "",
    injuredPerson: "", injuryType: "", bodyPartAffected: "", daysLost: "0",
    immediateCause: "", correctiveActions: "",
  });

  const stats = {
    open: incidents.filter((i) => i.status === "open").length,
    lostTime: incidents.filter((i) => i.type === "lost_time" || i.type === "fatality").length,
    daysLost: incidents.reduce((s, i) => s + (i.days_lost ?? 0), 0),
    thisYear: incidents.filter((i) => i.incident_date.startsWith(new Date().getFullYear().toString())).length,
  };

  function handleCreate() {
    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) {
      setError("Tytuł, opis i lokalizacja są wymagane"); return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createIncident({
        projectId, title: form.title, description: form.description,
        location: form.location, type: form.type, severity: form.severity,
        incidentDate: form.incidentDate, incidentTime: form.incidentTime || undefined,
        injuredPerson: form.injuredPerson || undefined, injuryType: form.injuryType || undefined,
        bodyPartAffected: form.bodyPartAffected || undefined,
        daysLost: Number(form.daysLost),
        immediateCause: form.immediateCause || undefined,
        correctiveActions: form.correctiveActions || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newInc: Incident = {
        id: res.id!, project_id: projectId, org_id: "", created_by: null,
        incident_number: incidents.length + 1,
        number_display: `INC-${String(incidents.length + 1).padStart(3, "0")}`,
        incident_date: form.incidentDate, incident_time: form.incidentTime || null,
        location: form.location, type: form.type, severity: form.severity,
        title: form.title, description: form.description,
        immediate_cause: form.immediateCause || null, root_cause: null,
        injured_person: form.injuredPerson || null, injury_type: form.injuryType || null,
        body_part_affected: form.bodyPartAffected || null, days_lost: Number(form.daysLost),
        witnesses: [], corrective_actions: form.correctiveActions || null,
        preventive_actions: null, reported_to_pip: false, pip_report_date: null,
        pip_case_number: null, status: "open", closed_at: null,
        investigation_completed: false, notes: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setIncidents((prev) => [newInc, ...prev]);
      setShowForm(false);
      setForm({ title: "", description: "", location: "", type: "near_miss", severity: "low", incidentDate: new Date().toISOString().slice(0, 10), incidentTime: "", injuredPerson: "", injuryType: "", bodyPartAffected: "", daysLost: "0", immediateCause: "", correctiveActions: "" });
    });
  }

  function handleStatus(id: string, status: IncidentStatus) {
    startTransition(async () => {
      await updateIncidentStatus(id, projectId, status);
      setIncidents((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Wypadki i incydenty BHP</h1>
          <p className="text-sm text-muted-foreground">Rejestr zgodny z art. 234 KP — zdarzenia potencjalnie wypadkowe, wypadki, szkody</p>
        </div>
        <Button onClick={() => setShowForm(true)} variant={stats.open > 0 ? "destructive" : "default"}>
          <Plus className="mr-1 h-4 w-4" />Zgłoś zdarzenie
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className={stats.open > 0 ? "border-red-200" : ""}><CardContent className="p-4"><p className="text-xs text-muted-foreground">Otwarte</p><p className="text-2xl font-bold text-red-600">{stats.open}</p></CardContent></Card>
        <Card className={stats.lostTime > 0 ? "border-orange-200" : ""}><CardContent className="p-4"><p className="text-xs text-muted-foreground">Wypadki z utratą czasu</p><p className="text-2xl font-bold text-orange-600">{stats.lostTime}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Dni utracone łącznie</p><p className="text-2xl font-bold">{stats.daysLost}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Zdarzenia w tym roku</p><p className="text-2xl font-bold">{stats.thisYear}</p></CardContent></Card>
      </div>

      {showForm && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-red-700">Zgłoś zdarzenie / incydent</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="text-sm font-medium">Tytuł zdarzenia *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Krótki opis zdarzenia" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Typ zdarzenia *</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as IncidentType })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Ciężkość</label>
                <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as IncidentSeverity })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(SEVERITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Data *</label>
                <Input type="date" value={form.incidentDate} onChange={(e) => setForm({ ...form, incidentDate: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Godzina</label>
                <Input type="time" value={form.incidentTime} onChange={(e) => setForm({ ...form, incidentTime: e.target.value })} className="mt-1" /></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Lokalizacja *</label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="np. Kondygnacja 3, oś A-B" className="mt-1" /></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Opis zdarzenia *</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" /></div>
              <div><label className="text-sm font-medium">Poszkodowany (imię i nazwisko)</label>
                <Input value={form.injuredPerson} onChange={(e) => setForm({ ...form, injuredPerson: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Rodzaj urazu</label>
                <Input value={form.injuryType} onChange={(e) => setForm({ ...form, injuryType: e.target.value })} placeholder="np. Skręcenie stawu skokowego" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Część ciała</label>
                <Input value={form.bodyPartAffected} onChange={(e) => setForm({ ...form, bodyPartAffected: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Dni niezdolności do pracy</label>
                <Input type="number" value={form.daysLost} onChange={(e) => setForm({ ...form, daysLost: e.target.value })} min="0" className="mt-1" /></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Bezpośrednia przyczyna</label>
                <Input value={form.immediateCause} onChange={(e) => setForm({ ...form, immediateCause: e.target.value })} className="mt-1" /></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Działania naprawcze</label>
                <textarea value={form.correctiveActions} onChange={(e) => setForm({ ...form, correctiveActions: e.target.value })} rows={2}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" /></div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending} variant="destructive">{pending ? "Zgłaszanie..." : "Zgłoś zdarzenie"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {incidents.length === 0 ? (
        <Card className="border-dashed border-green-200 bg-green-50/20">
          <CardContent className="p-12 text-center text-green-700">
            <CheckCircle2 className="mx-auto h-12 w-12 opacity-40 mb-3" />
            <p className="font-semibold">Brak zarejestrowanych zdarzeń</p>
            <p className="text-sm mt-1 text-green-600">Doskonały wynik — zero incydentów BHP</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {incidents.map((inc) => {
            const sevCfg = SEVERITY_CONFIG[inc.severity];
            const stCfg = STATUS_CONFIG[inc.status];
            const StIcon = stCfg.icon;
            return (
              <Card key={inc.id} className={inc.severity === "critical" ? "border-red-200" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{inc.number_display}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${sevCfg.color}`}>{sevCfg.label}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${stCfg.color}`}>
                          <StIcon className="h-3 w-3" />{stCfg.label}
                        </span>
                      </div>
                      <p className="font-semibold">{inc.title}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span>{TYPE_LABELS[inc.type]}</span>
                        <span>{new Date(inc.incident_date).toLocaleDateString("pl-PL")}{inc.incident_time ? ` ${inc.incident_time}` : ""}</span>
                        <span>📍 {inc.location}</span>
                        {inc.injured_person && <span>Poszkodowany: {inc.injured_person}</span>}
                        {inc.days_lost > 0 && <span className="text-orange-600 font-medium">{inc.days_lost} dni</span>}
                      </div>
                      {inc.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{inc.description}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {inc.status === "open" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatus(inc.id, "investigating")} disabled={pending}>Dochodzenie</Button>
                      )}
                      {inc.status === "investigating" && (
                        <Button size="sm" onClick={() => handleStatus(inc.id, "closed")} disabled={pending}>Zamknij</Button>
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
