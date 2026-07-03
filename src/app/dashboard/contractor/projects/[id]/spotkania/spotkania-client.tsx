"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, Users, Calendar, Clock, CheckCircle2,
  FileText, X, ChevronDown, ChevronUp, AlertCircle, Trash2,
} from "lucide-react";
import {
  createMeeting, addMeetingItem, updateMeetingItemStatus, publishMeeting, deleteMeeting,
  type Meeting, type MeetingType, type MeetingItem, type MeetingItemType, type MeetingItemStatus,
} from "@/lib/actions/meetings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  site:         "Narada budowlana",
  progress:     "Narada postępu",
  design:       "Narada projektowa",
  safety:       "Odprawa BHP",
  kickoff:      "Spotkanie inauguracyjne",
  closeout:     "Spotkanie końcowe",
  client:       "Spotkanie z inwestorem",
  subcontractor:"Narada podwykonawców",
  other:        "Inne",
};

const ITEM_TYPE_CONFIG: Record<MeetingItemType, { label: string; color: string }> = {
  topic:       { label: "Temat",     color: "bg-slate-100 text-slate-700" },
  decision:    { label: "Decyzja",   color: "bg-blue-100 text-blue-700" },
  action:      { label: "Działanie", color: "bg-orange-100 text-orange-700" },
  issue:       { label: "Problem",   color: "bg-red-100 text-red-700" },
  information: { label: "Informacja",color: "bg-green-100 text-green-700" },
};

const STATUS_CONFIG: Record<Meeting["status"], { label: string; color: string }> = {
  draft:     { label: "Szkic",        color: "bg-slate-100 text-slate-600" },
  published: { label: "Opublikowane", color: "bg-blue-100 text-blue-700" },
  approved:  { label: "Zatwierdzone", color: "bg-green-100 text-green-700" },
};

export function SpotkaniakClient({
  projectId,
  initialMeetings,
}: {
  projectId: string;
  initialMeetings: Meeting[];
}) {
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [newForm, setNewForm] = useState({
    title: "", meetingType: "site" as MeetingType,
    meetingDate: new Date().toISOString().slice(0, 10),
    meetingTime: "10:00", location: "", durationMin: "60", agenda: "",
  });

  const [itemForm, setItemForm] = useState({
    itemType: "topic" as MeetingItemType,
    title: "", description: "", assignedToName: "", dueDate: "",
  });

  const [publishForm, setPublishForm] = useState({ summary: "", nextDate: "" });

  const active = meetings.find((m) => m.id === selectedMeeting);

  function handleCreate() {
    if (!newForm.title.trim()) { setError("Tytuł jest wymagany"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createMeeting({
        projectId, title: newForm.title,
        meetingType: newForm.meetingType,
        meetingDate: newForm.meetingDate,
        meetingTime: newForm.meetingTime || undefined,
        location: newForm.location || undefined,
        durationMin: Number(newForm.durationMin),
        agenda: newForm.agenda || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newMeeting: Meeting = {
        id: res.id!, project_id: projectId, org_id: "", created_by: null,
        number: meetings.length + 1,
        number_display: `SPK-${String(meetings.length + 1).padStart(3, "0")}`,
        title: newForm.title, meeting_type: newForm.meetingType,
        meeting_date: newForm.meetingDate, meeting_time: newForm.meetingTime || null,
        location: newForm.location || null, duration_min: Number(newForm.durationMin),
        attendees: [], absent: [], agenda: newForm.agenda || null, summary: null,
        status: "draft", published_at: null,
        next_meeting_date: null, next_meeting_location: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        items: [],
      };
      setMeetings((prev) => [newMeeting, ...prev]);
      setSelectedMeeting(res.id!);
      setShowNewForm(false);
      setNewForm({ title: "", meetingType: "site", meetingDate: new Date().toISOString().slice(0, 10), meetingTime: "10:00", location: "", durationMin: "60", agenda: "" });
    });
  }

  function handleAddItem() {
    if (!active || !itemForm.title.trim()) return;
    startTransition(async () => {
      const res = await addMeetingItem({
        meetingId: active.id, projectId,
        itemType: itemForm.itemType, title: itemForm.title,
        description: itemForm.description || undefined,
        assignedToName: itemForm.assignedToName || undefined,
        dueDate: itemForm.dueDate || undefined,
        sortOrder: (active.items?.length ?? 0),
      });
      if (!res.ok) return;
      const newItem: MeetingItem = {
        id: res.id!, meeting_id: active.id,
        sort_order: active.items?.length ?? 0,
        item_type: itemForm.itemType, title: itemForm.title,
        description: itemForm.description || null,
        assigned_to_name: itemForm.assignedToName || null,
        due_date: itemForm.dueDate || null,
        status: "open", carried_over_from: null,
        created_at: new Date().toISOString(),
      };
      setMeetings((prev) => prev.map((m) =>
        m.id === active.id ? { ...m, items: [...(m.items ?? []), newItem] } : m
      ));
      setItemForm({ itemType: "topic", title: "", description: "", assignedToName: "", dueDate: "" });
      setShowItemForm(false);
    });
  }

  function handleItemStatus(itemId: string, status: MeetingItemStatus) {
    if (!active) return;
    startTransition(async () => {
      await updateMeetingItemStatus(itemId, projectId, status);
      setMeetings((prev) => prev.map((m) =>
        m.id === active.id
          ? { ...m, items: (m.items ?? []).map((it) => it.id === itemId ? { ...it, status } : it) }
          : m
      ));
    });
  }

  function handlePublish() {
    if (!active || !publishForm.summary.trim()) return;
    startTransition(async () => {
      await publishMeeting(active.id, projectId, publishForm.summary, publishForm.nextDate || undefined);
      setMeetings((prev) => prev.map((m) =>
        m.id === active.id ? { ...m, status: "published", summary: publishForm.summary, next_meeting_date: publishForm.nextDate || null, published_at: new Date().toISOString() } : m
      ));
      setShowPublishForm(false);
    });
  }

  function handleDelete(meetingId: string) {
    startTransition(async () => {
      await deleteMeeting(meetingId, projectId);
      setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
      if (selectedMeeting === meetingId) setSelectedMeeting(null);
    });
  }

  const openActions = active?.items?.filter((it) => it.item_type === "action" && it.status === "open").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Notatki ze spotkań</h1>
          <p className="text-sm text-muted-foreground">Rejestr narad budowlanych, decyzji i działań do wykonania</p>
        </div>
        <Button onClick={() => setShowNewForm(true)} disabled={showNewForm}>
          <Plus className="mr-1 h-4 w-4" /> Nowe spotkanie
        </Button>
      </div>

      {/* NEW MEETING FORM */}
      {showNewForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowe spotkanie</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Tytuł *</label>
                <Input value={newForm.title} onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  placeholder="np. Narada postępu — tydzień 23" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Typ spotkania</label>
                <select value={newForm.meetingType} onChange={(e) => setNewForm({ ...newForm, meetingType: e.target.value as MeetingType })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(MEETING_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Data</label>
                <Input type="date" value={newForm.meetingDate} onChange={(e) => setNewForm({ ...newForm, meetingDate: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Godzina</label>
                <Input type="time" value={newForm.meetingTime} onChange={(e) => setNewForm({ ...newForm, meetingTime: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Czas trwania (min)</label>
                <Input type="number" min={15} step={15} value={newForm.durationMin}
                  onChange={(e) => setNewForm({ ...newForm, durationMin: e.target.value })} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Miejsce</label>
                <Input value={newForm.location} onChange={(e) => setNewForm({ ...newForm, location: e.target.value })}
                  placeholder="np. Biuro budowy, sala konferencyjna" className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Agenda (porządek obrad)</label>
                <textarea value={newForm.agenda} onChange={(e) => setNewForm({ ...newForm, agenda: e.target.value })}
                  rows={3} placeholder="1. Omówienie postępu robót&#10;2. Problemy i przeszkody&#10;3. Działania na następny tydzień"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Tworzenie..." : "Utwórz spotkanie"}</Button>
              <Button variant="outline" onClick={() => setShowNewForm(false)}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* MEETING LIST */}
        <div className="space-y-2">
          {meetings.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center text-muted-foreground">
                <Calendar className="mx-auto h-8 w-8 opacity-20 mb-2" />
                <p className="text-sm">Brak spotkań</p>
              </CardContent>
            </Card>
          ) : (
            meetings.map((m) => {
              const stCfg = STATUS_CONFIG[m.status];
              const isSelected = selectedMeeting === m.id;
              return (
                <Card key={m.id}
                  className={`cursor-pointer hover:shadow-sm transition-all ${isSelected ? "border-primary ring-1 ring-primary/20" : ""}`}
                  onClick={() => setSelectedMeeting(isSelected ? null : m.id)}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="font-mono text-xs text-muted-foreground">{m.number_display}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${stCfg.color}`}>{stCfg.label}</span>
                        </div>
                        <p className="text-sm font-medium truncate">{m.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(m.meeting_date).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}
                          {m.meeting_time && ` · ${m.meeting_time}`}
                        </p>
                        <p className="text-xs text-muted-foreground">{MEETING_TYPE_LABELS[m.meeting_type]}</p>
                      </div>
                      {m.status === "draft" && (
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }} className="shrink-0 -mr-1">
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* MEETING DETAIL */}
        {active ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs text-muted-foreground">{active.number_display}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CONFIG[active.status].color}`}>
                        {STATUS_CONFIG[active.status].label}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{active.title}</CardTitle>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(active.meeting_date).toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                      {active.meeting_time && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{active.meeting_time}</span>}
                      {active.location && <span>{active.location}</span>}
                      <span>{active.duration_min} min</span>
                    </div>
                  </div>
                  {active.status === "draft" && (
                    <Button size="sm" onClick={() => setShowPublishForm(true)}>Opublikuj notatki</Button>
                  )}
                </div>
              </CardHeader>
              {active.agenda && (
                <CardContent className="pt-0">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">AGENDA</p>
                  <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded p-3">{active.agenda}</p>
                </CardContent>
              )}
              {active.summary && (
                <CardContent className="pt-0">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">PODSUMOWANIE</p>
                  <p className="text-sm whitespace-pre-wrap">{active.summary}</p>
                </CardContent>
              )}
            </Card>

            {/* PUBLISH FORM */}
            {showPublishForm && (
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Opublikuj notatki ze spotkania</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowPublishForm(false)}><X className="h-4 w-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Podsumowanie spotkania *</label>
                    <textarea value={publishForm.summary} onChange={(e) => setPublishForm({ ...publishForm, summary: e.target.value })}
                      rows={4} placeholder="Główne ustalenia, decyzje i wnioski ze spotkania..."
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Data następnego spotkania</label>
                    <Input type="date" value={publishForm.nextDate}
                      onChange={(e) => setPublishForm({ ...publishForm, nextDate: e.target.value })} className="mt-1 max-w-xs" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handlePublish} disabled={pending || !publishForm.summary.trim()}>
                      <FileText className="mr-1 h-4 w-4" /> Opublikuj
                    </Button>
                    <Button variant="outline" onClick={() => setShowPublishForm(false)}>Anuluj</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ITEMS */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Punkty narady</h3>
                {openActions > 0 && (
                  <p className="text-xs text-orange-600 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="h-3 w-3" /> {openActions} otwartych działań do wykonania
                  </p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowItemForm(!showItemForm)}>
                <Plus className="mr-1 h-3 w-3" /> Dodaj punkt
              </Button>
            </div>

            {showItemForm && (
              <Card className="border-dashed">
                <CardContent className="p-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Typ</label>
                      <select value={itemForm.itemType} onChange={(e) => setItemForm({ ...itemForm, itemType: e.target.value as MeetingItemType })}
                        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                        {Object.entries(ITEM_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Tytuł *</label>
                      <Input value={itemForm.title} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                        placeholder="Treść punktu..." className="mt-1" />
                    </div>
                    {itemForm.itemType === "action" && (
                      <>
                        <div>
                          <label className="text-sm font-medium">Odpowiedzialny</label>
                          <Input value={itemForm.assignedToName} onChange={(e) => setItemForm({ ...itemForm, assignedToName: e.target.value })}
                            placeholder="Imię i nazwisko" className="mt-1" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Termin</label>
                          <Input type="date" value={itemForm.dueDate} onChange={(e) => setItemForm({ ...itemForm, dueDate: e.target.value })} className="mt-1" />
                        </div>
                      </>
                    )}
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium">Szczegóły</label>
                      <textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                        rows={2} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddItem} disabled={pending}>Dodaj</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowItemForm(false)}>Anuluj</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {(active.items?.length ?? 0) === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">Brak punktów. Dodaj tematy, decyzje i działania.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {active.items!.map((item) => {
                  const typeCfg = ITEM_TYPE_CONFIG[item.item_type];
                  const isDone = item.status === "done";
                  return (
                    <Card key={item.id} className={isDone ? "opacity-60" : ""}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          {item.item_type === "action" && (
                            <button onClick={() => handleItemStatus(item.id, isDone ? "open" : "done")} className="mt-0.5 shrink-0">
                              <CheckCircle2 className={`h-4 w-4 ${isDone ? "text-green-500" : "text-muted-foreground/30"}`} />
                            </button>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${typeCfg.color}`}>{typeCfg.label}</span>
                              <span className={`text-sm font-medium ${isDone ? "line-through" : ""}`}>{item.title}</span>
                            </div>
                            {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                            {item.item_type === "action" && (item.assigned_to_name || item.due_date) && (
                              <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                                {item.assigned_to_name && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{item.assigned_to_name}</span>}
                                {item.due_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(item.due_date).toLocaleDateString("pl-PL")}</span>}
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
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 opacity-20 mb-3" />
              <p className="font-medium">Wybierz spotkanie z listy</p>
              <p className="text-sm mt-1">lub utwórz nowe klikając &quot;Nowe spotkanie&quot;</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
