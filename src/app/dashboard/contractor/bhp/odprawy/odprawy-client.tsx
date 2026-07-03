"use client";

import { useState, useTransition } from "react";
import { Plus, X, HardHat, Users, Clock } from "lucide-react";
import { createToolboxTalk, type ToolboxTalk, type ToolboxTopic } from "@/lib/actions/toolbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const TOPIC_LABELS: Record<ToolboxTopic, string> = {
  general_safety:  "Ogólne zasady BHP",
  fall_protection: "Ochrona przed upadkiem",
  electrical:      "Bezpieczeństwo elektryczne",
  ppe:             "Środki ochrony indywidualnej",
  manual_handling: "Ręczne prace transportowe",
  fire_safety:     "Ochrona przeciwpożarowa",
  chemical:        "Substancje chemiczne",
  machinery:       "Obsługa maszyn i urządzeń",
  excavation:      "Roboty ziemne i wykopaliskowe",
  scaffolding:     "Rusztowania i praca na wysokości",
  confined_space:  "Praca w przestrzeniach zamkniętych",
  first_aid:       "Pierwsza pomoc",
  other:           "Inne",
};

const TOPIC_COLORS: Record<string, string> = {
  fall_protection: "bg-red-100 text-red-700",
  electrical: "bg-yellow-100 text-yellow-700",
  fire_safety: "bg-orange-100 text-orange-700",
  scaffolding: "bg-orange-100 text-orange-700",
  excavation: "bg-yellow-100 text-yellow-700",
  confined_space: "bg-red-100 text-red-700",
};

export function OdprawyClient({ initialTalks }: { initialTalks: ToolboxTalk[] }) {
  const [talks, setTalks] = useState<ToolboxTalk[]>(initialTalks);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [attendeeInput, setAttendeeInput] = useState("");

  const [form, setForm] = useState({
    title: "", topic: "general_safety" as ToolboxTopic,
    conductedBy: "", conductedDate: new Date().toISOString().slice(0, 10),
    durationMin: "15", location: "", content: "",
    attendees: [] as string[], hasSignatures: false, notes: "",
  });

  const stats = {
    total: talks.length,
    thisMonth: talks.filter((t) => t.conducted_date.startsWith(new Date().toISOString().slice(0, 7))).length,
    totalAttendees: talks.reduce((s, t) => s + (t.attendee_count ?? 0), 0),
  };

  function addAttendee() {
    const name = attendeeInput.trim();
    if (!name) return;
    setForm((f) => ({ ...f, attendees: [...f.attendees, name] }));
    setAttendeeInput("");
  }

  function removeAttendee(i: number) {
    setForm((f) => ({ ...f, attendees: f.attendees.filter((_, idx) => idx !== i) }));
  }

  function handleCreate() {
    if (!form.title.trim() || !form.conductedBy.trim()) { setError("Tytuł i prowadzący są wymagane"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createToolboxTalk({
        title: form.title, topic: form.topic,
        conductedBy: form.conductedBy, conductedDate: form.conductedDate,
        durationMin: form.durationMin ? Number(form.durationMin) : undefined,
        location: form.location || undefined, content: form.content || undefined,
        attendees: form.attendees, hasSignatures: form.hasSignatures,
        notes: form.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newTalk: ToolboxTalk = {
        id: res.id!, project_id: null, org_id: "", created_by: null,
        title: form.title, topic: form.topic,
        conducted_by: form.conductedBy, conducted_date: form.conductedDate,
        duration_min: form.durationMin ? Number(form.durationMin) : null,
        location: form.location || null, content: form.content || null,
        attendees: form.attendees, attendee_count: form.attendees.length,
        has_signatures: form.hasSignatures, notes: form.notes || null,
        created_at: new Date().toISOString(),
      };
      setTalks((prev) => [newTalk, ...prev]);
      setShowForm(false);
      setForm({ title: "", topic: "general_safety", conductedBy: "", conductedDate: new Date().toISOString().slice(0, 10), durationMin: "15", location: "", content: "", attendees: [], hasSignatures: false, notes: "" });
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><HardHat className="h-6 w-6" />Odprawy BHP (Toolbox Talks)</h1>
          <p className="text-sm text-muted-foreground">Rejestr odpraw BHP dla wszystkich projektów — wzorowane na Raken / Procore Safety</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-1 h-4 w-4" />Nowa odprawa</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Łącznie odpraw</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">W tym miesiącu</p><p className="text-2xl font-bold text-blue-600">{stats.thisMonth}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Łącznie uczestników</p><p className="text-2xl font-bold">{stats.totalAttendees}</p></CardContent></Card>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowa odprawa BHP</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="text-sm font-medium">Temat odprawy *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="np. Zasady bezpieczeństwa przy pracach na rusztowaniu" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Kategoria tematu</label>
                <select value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value as ToolboxTopic })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(TOPIC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Prowadzący *</label>
                <Input value={form.conductedBy} onChange={(e) => setForm({ ...form, conductedBy: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Data</label>
                <Input type="date" value={form.conductedDate} onChange={(e) => setForm({ ...form, conductedDate: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Czas trwania (min)</label>
                <Input type="number" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Lokalizacja</label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="np. Zaplecze budowy" className="mt-1" /></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Treść / Omawiane zagadnienia</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={3}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" /></div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Uczestnicy ({form.attendees.length})</label>
                <div className="flex gap-2 mt-1">
                  <Input value={attendeeInput} onChange={(e) => setAttendeeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAttendee())}
                    placeholder="Imię i nazwisko (Enter)" className="flex-1" />
                  <Button type="button" variant="outline" onClick={addAttendee}>Dodaj</Button>
                </div>
                {form.attendees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.attendees.map((a, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-muted rounded-full px-2.5 py-0.5 text-sm">
                        {a}<button onClick={() => removeAttendee(i)}><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.hasSignatures} onChange={(e) => setForm({ ...form, hasSignatures: e.target.checked })} className="rounded" />
                  <span className="text-sm font-medium">Zebrano podpisy uczestników</span>
                </label>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Zapisywanie..." : "Zapisz odprawę"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {talks.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
          <HardHat className="mx-auto h-12 w-12 opacity-20 mb-3" />
          <p className="font-medium">Brak odpraw BHP</p>
          <p className="text-sm mt-1">Rejestruj odprawy BHP przed rozpoczęciem prac</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {talks.map((talk) => {
            const topicColor = TOPIC_COLORS[talk.topic] ?? "bg-muted text-muted-foreground";
            return (
              <Card key={talk.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${topicColor}`}>{TOPIC_LABELS[talk.topic]}</span>
                        {talk.has_signatures && <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">✓ Podpisana</span>}
                      </div>
                      <p className="font-semibold">{talk.title}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span>{new Date(talk.conducted_date).toLocaleDateString("pl-PL")}</span>
                        <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{talk.conducted_by}</span>
                        {talk.attendee_count != null && <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{talk.attendee_count} uczestników</span>}
                        {talk.duration_min && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{talk.duration_min} min</span>}
                        {talk.location && <span>📍 {talk.location}</span>}
                      </div>
                      {talk.attendees.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {talk.attendees.slice(0, 5).map((a, i) => (
                            <span key={i} className="text-[11px] bg-muted rounded-full px-2 py-0.5">{a}</span>
                          ))}
                          {talk.attendees.length > 5 && <span className="text-[11px] text-muted-foreground">+{talk.attendees.length - 5}</span>}
                        </div>
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
