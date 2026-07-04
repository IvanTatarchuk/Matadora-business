"use client";

import { useState, useTransition } from "react";
import {
  Plus, X, TrendingUp, Phone, Mail, Building2,
  MapPin, Star, ChevronRight, Trash2, CheckCircle2, Search, Filter,
} from "lucide-react";
import {
  createLead, updateLeadStage, addLeadActivity, deleteLead,
  type Lead, type LeadStage, type LeadSource, type LeadActivity,
} from "@/lib/actions/crm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const STAGE_CONFIG: Record<LeadStage, { label: string; color: string; bg: string }> = {
  prospect:    { label: "Potencjalny",    color: "text-slate-600",   bg: "bg-slate-100" },
  contact:     { label: "Kontakt",        color: "text-blue-700",    bg: "bg-blue-100" },
  site_visit:  { label: "Wizja lokalna",  color: "text-indigo-700",  bg: "bg-indigo-100" },
  offer_sent:  { label: "Oferta wysłana", color: "text-yellow-700",  bg: "bg-yellow-100" },
  negotiation: { label: "Negocjacje",     color: "text-orange-700",  bg: "bg-orange-100" },
  won:         { label: "Wygrany",        color: "text-green-700",   bg: "bg-green-100" },
  lost:        { label: "Przegrany",      color: "text-red-600",     bg: "bg-red-100" },
  on_hold:     { label: "Wstrzymany",     color: "text-slate-500",   bg: "bg-slate-50" },
};

const PIPELINE_STAGES: LeadStage[] = ["prospect","contact","site_visit","offer_sent","negotiation","won","lost"];

const SOURCE_LABELS: Record<LeadSource, string> = {
  referral:      "Polecenie",
  przetarg:      "Przetarg BZP",
  website:       "Strona www",
  social:        "Media społ.",
  cold_call:     "Zimny kontakt",
  repeat_client: "Stały klient",
  other:         "Inny",
};

const ACTIVITY_TYPE_LABELS: Record<LeadActivity["activity_type"], string> = {
  note:         "Notatka",
  call:         "Telefon",
  email:        "Email",
  meeting:      "Spotkanie",
  site_visit:   "Wizja",
  offer:        "Oferta",
  follow_up:    "Follow-up",
  stage_change: "Zmiana etapu",
};

function fmt(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(n);
}

export function CRMClient({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showForm, setShowForm] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showLostForm, setShowLostForm] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState<LeadStage | "all">("all");
  const [filterSource, setFilterSource] = useState<LeadSource | "all">("all");

  const [form, setForm] = useState({
    clientName: "", clientCompany: "", clientEmail: "", clientPhone: "",
    title: "", description: "", city: "", estimatedValue: "",
    winProbability: "50", source: "referral" as LeadSource,
    priority: "medium" as "low" | "medium" | "high",
    expectedStartDate: "", notes: "",
  });

  const [activityForm, setActivityForm] = useState({
    activityType: "note" as LeadActivity["activity_type"],
    title: "", description: "",
  });

  const active = leads.find((l) => l.id === selectedLead);

  const filteredLeads = leads.filter((l) => {
    const matchesSearch = !searchQuery || 
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.client_company && l.client_company.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStage = filterStage === "all" || l.stage === filterStage;
    const matchesSource = filterSource === "all" || l.source === filterSource;
    return matchesSearch && matchesStage && matchesSource;
  });

  const pipelineValue = filteredLeads.filter((l) => !["won","lost","on_hold"].includes(l.stage))
    .reduce((s, l) => s + ((l.estimated_value ?? 0) * l.win_probability / 100), 0);
  const wonValue = filteredLeads.filter((l) => l.stage === "won").reduce((s, l) => s + (l.estimated_value ?? 0), 0);

  function handleCreate() {
    if (!form.clientName.trim() || !form.title.trim()) { setError("Nazwa klienta i tytuł są wymagane"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createLead({
        clientName: form.clientName, clientCompany: form.clientCompany || undefined,
        clientEmail: form.clientEmail || undefined, clientPhone: form.clientPhone || undefined,
        title: form.title, description: form.description || undefined,
        city: form.city || undefined,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
        winProbability: Number(form.winProbability),
        source: form.source, priority: form.priority,
        expectedStartDate: form.expectedStartDate || undefined,
        notes: form.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newLead: Lead = {
        id: res.id!, org_id: "", created_by: null,
        client_name: form.clientName, client_company: form.clientCompany || null,
        client_email: form.clientEmail || null, client_phone: form.clientPhone || null,
        client_nip: null, title: form.title, description: form.description || null,
        address: null, city: form.city || null, stage: "prospect",
        estimated_value: form.estimatedValue ? Number(form.estimatedValue) : null,
        win_probability: Number(form.winProbability), source: form.source,
        first_contact_date: new Date().toISOString().slice(0, 10),
        expected_start_date: form.expectedStartDate || null,
        expected_close_date: null, won_at: null, lost_at: null, lost_reason: null,
        project_id: null, priority: form.priority, assigned_to: null,
        notes: form.notes || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        activities: [],
      };
      setLeads((prev) => [newLead, ...prev]);
      setShowForm(false);
      setForm({ clientName: "", clientCompany: "", clientEmail: "", clientPhone: "", title: "", description: "", city: "", estimatedValue: "", winProbability: "50", source: "referral", priority: "medium", expectedStartDate: "", notes: "" });
    });
  }

  function handleStageChange(id: string, stage: LeadStage) {
    if (stage === "lost") { setShowLostForm(id); return; }
    startTransition(async () => {
      await updateLeadStage(id, stage);
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, stage } : l));
    });
  }

  function handleLostConfirm() {
    if (!showLostForm) return;
    startTransition(async () => {
      await updateLeadStage(showLostForm, "lost", lostReason);
      setLeads((prev) => prev.map((l) => l.id === showLostForm ? { ...l, stage: "lost", lost_reason: lostReason } : l));
      setShowLostForm(null); setLostReason("");
    });
  }

  function handleAddActivity() {
    if (!active || !activityForm.title.trim()) return;
    startTransition(async () => {
      const res = await addLeadActivity({
        leadId: active.id, activityType: activityForm.activityType,
        title: activityForm.title, description: activityForm.description || undefined,
      });
      if (!res.ok) return;
      const newActivity: LeadActivity = {
        id: res.id!, lead_id: active.id, created_by: null,
        activity_type: activityForm.activityType, title: activityForm.title,
        description: activityForm.description || null,
        activity_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      setLeads((prev) => prev.map((l) =>
        l.id === active.id ? { ...l, activities: [newActivity, ...(l.activities ?? [])] } : l
      ));
      setActivityForm({ activityType: "note", title: "", description: "" });
      setShowActivityForm(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      if (selectedLead === id) setSelectedLead(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">CRM — Leady</h1>
          <p className="text-sm text-muted-foreground">Pipeline sprzedażowy — od prospektu do wygranego projektu</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === "kanban" ? "default" : "outline"} size="sm" onClick={() => setView("kanban")}>Kanban</Button>
          <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")}>Lista</Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-1 h-4 w-4" /> Nowy lead
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Leady w pipeline</p>
          <p className="text-2xl font-bold">{filteredLeads.filter((l) => !["won","lost","on_hold"].includes(l.stage)).length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Wartość ważona</p>
          <p className="text-xl font-bold text-blue-600">{fmt(pipelineValue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Wygrane w tym roku</p>
          <p className="text-xl font-bold text-green-600">{fmt(wonValue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Win rate</p>
          <p className="text-2xl font-bold">
            {filteredLeads.filter((l) => ["won","lost"].includes(l.stage)).length > 0
              ? Math.round(filteredLeads.filter((l) => l.stage === "won").length / filteredLeads.filter((l) => ["won","lost"].includes(l.stage)).length * 100)
              : 0}%
          </p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Шукати ліди..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value as LeadStage | "all")}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Всі етапи</option>
          {Object.entries(STAGE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value as LeadSource | "all")}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Всі джерела</option>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* LOST FORM */}
      {showLostForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader><CardTitle className="text-base">Powód przegranego leada</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <textarea value={lostReason} onChange={(e) => setLostReason(e.target.value)}
                rows={3} placeholder="np. Wybrano tańszego wykonawcę, klient zrezygnował z projektu..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <Button variant="destructive" className="flex-1" onClick={handleLostConfirm} disabled={pending}>Oznacz jako przegrany</Button>
                <Button variant="outline" onClick={() => { setShowLostForm(null); setLostReason(""); }}>Anuluj</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* NEW LEAD FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowy lead</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="text-sm font-medium">Nazwa klienta *</label>
                <Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="Jan Kowalski" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Firma</label>
                <Input value={form.clientCompany} onChange={(e) => setForm({ ...form, clientCompany: e.target.value })} placeholder="Kowalski Sp. z o.o." className="mt-1" /></div>
              <div><label className="text-sm font-medium">Email</label>
                <Input type="email" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Telefon</label>
                <Input type="tel" value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })} className="mt-1" /></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Tytuł projektu / inwestycji *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="np. Budowa domu jednorodzinnego, Remont biura" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Miasto</label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Szacowana wartość (PLN)</label>
                <Input type="number" min={0} value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Prawdopodobieństwo wygranej (%): {form.winProbability}%</label>
                <input type="range" min={0} max={100} step={5} value={form.winProbability}
                  onChange={(e) => setForm({ ...form, winProbability: e.target.value })} className="mt-2 w-full accent-primary" /></div>
              <div><label className="text-sm font-medium">Źródło</label>
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as LeadSource })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Priorytet</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as "low"|"medium"|"high" })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="high">Wysoki</option><option value="medium">Średni</option><option value="low">Niski</option>
                </select></div>
              <div><label className="text-sm font-medium">Planowany start</label>
                <Input type="date" value={form.expectedStartDate} onChange={(e) => setForm({ ...form, expectedStartDate: e.target.value })} className="mt-1" /></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Opis / Uwagi</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" /></div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Zapisywanie..." : "Dodaj lead"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KANBAN VIEW */}
      {view === "kanban" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {PIPELINE_STAGES.map((stage) => {
              const stageLeads = filteredLeads.filter((l) => l.stage === stage);
              const stageValue = stageLeads.reduce((s, l) => s + (l.estimated_value ?? 0), 0);
              const cfg = STAGE_CONFIG[stage];
              return (
                <div key={stage} className="w-64 shrink-0">
                  <div className={`rounded-t-lg px-3 py-2 ${cfg.bg}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-xs bg-white/70 rounded-full px-1.5 py-0.5 font-medium">{stageLeads.length}</span>
                    </div>
                    {stageValue > 0 && <p className="text-xs text-muted-foreground mt-0.5">{fmt(stageValue)}</p>}
                  </div>
                  <div className="space-y-2 mt-2 min-h-[100px]">
                    {stageLeads.map((lead) => (
                      <Card key={lead.id}
                        className={`cursor-pointer hover:shadow-md transition-shadow ${selectedLead === lead.id ? "ring-2 ring-primary" : ""}`}
                        onClick={() => setSelectedLead(selectedLead === lead.id ? null : lead.id)}>
                        <CardContent className="p-3">
                          <p className="text-sm font-semibold truncate">{lead.title}</p>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3" />{lead.client_name}
                            {lead.client_company && ` · ${lead.client_company}`}
                          </p>
                          {lead.city && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{lead.city}</p>}
                          {lead.estimated_value && (
                            <p className="text-xs font-semibold text-primary mt-1 flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />{fmt(lead.estimated_value)}
                              <span className="text-muted-foreground font-normal">({lead.win_probability}%)</span>
                            </p>
                          )}
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {lead.client_phone && <a href={`tel:${lead.client_phone}`} onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-muted"><Phone className="h-3 w-3 text-muted-foreground" /></a>}
                            {lead.client_email && <a href={`mailto:${lead.client_email}`} onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-muted"><Mail className="h-3 w-3 text-muted-foreground" /></a>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {view === "list" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Klient / Projekt</th>
                    <th className="px-4 py-3 text-left font-medium">Etap</th>
                    <th className="px-4 py-3 text-left font-medium">Wartość</th>
                    <th className="px-4 py-3 text-left font-medium">Szansa</th>
                    <th className="px-4 py-3 text-left font-medium">Źródło</th>
                    <th className="px-4 py-3 text-left font-medium">Data</th>
                    <th className="px-4 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLeads.map((lead) => {
                    const cfg = STAGE_CONFIG[lead.stage];
                    return (
                      <tr key={lead.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => setSelectedLead(selectedLead === lead.id ? null : lead.id)}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{lead.title}</p>
                          <p className="text-xs text-muted-foreground">{lead.client_name}{lead.client_company && ` · ${lead.client_company}`}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                        </td>
                        <td className="px-4 py-3 font-medium">{lead.estimated_value ? fmt(lead.estimated_value) : "—"}</td>
                        <td className="px-4 py-3">{lead.win_probability}%</td>
                        <td className="px-4 py-3 text-muted-foreground">{SOURCE_LABELS[lead.source]}</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(lead.first_contact_date).toLocaleDateString("pl-PL")}</td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredLeads.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">
                  <Star className="mx-auto h-12 w-12 opacity-20 mb-3" />
                  <p>Brak leadów. Dodaj pierwszy klikając &quot;Nowy lead&quot;.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* DETAIL PANEL */}
      {active && (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{active.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {active.client_name}{active.client_company && ` · ${active.client_company}`}
                  {active.city && ` · ${active.city}`}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLead(null)}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* STAGE PROGRESS */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">ZMIEŃ ETAP</p>
              <div className="flex flex-wrap gap-1.5">
                {PIPELINE_STAGES.map((s) => {
                  const cfg = STAGE_CONFIG[s];
                  return (
                    <button key={s} onClick={() => handleStageChange(active.id, s)}
                      disabled={pending || active.stage === s}
                      className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all
                        ${active.stage === s ? `${cfg.bg} ${cfg.color} ring-2 ring-offset-1 ring-current` : "bg-muted hover:bg-muted/80 text-muted-foreground"}`}>
                      {active.stage === s && <CheckCircle2 className="h-3 w-3" />}
                      {cfg.label}
                      {s !== "lost" && active.stage !== s && <ChevronRight className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* INFO */}
            <div className="grid gap-3 sm:grid-cols-3 text-sm">
              {active.client_email && <div><p className="text-xs text-muted-foreground">Email</p><a href={`mailto:${active.client_email}`} className="text-primary hover:underline">{active.client_email}</a></div>}
              {active.client_phone && <div><p className="text-xs text-muted-foreground">Telefon</p><a href={`tel:${active.client_phone}`} className="text-primary hover:underline">{active.client_phone}</a></div>}
              {active.estimated_value && <div><p className="text-xs text-muted-foreground">Wartość</p><p className="font-semibold">{fmt(active.estimated_value)}</p></div>}
              {active.expected_start_date && <div><p className="text-xs text-muted-foreground">Planowany start</p><p>{new Date(active.expected_start_date).toLocaleDateString("pl-PL")}</p></div>}
              <div><p className="text-xs text-muted-foreground">Źródło</p><p>{SOURCE_LABELS[active.source]}</p></div>
              <div><p className="text-xs text-muted-foreground">Szansa wygranej</p><p className="font-semibold">{active.win_probability}%</p></div>
            </div>
            {active.lost_reason && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700"><strong>Powód przegranej:</strong> {active.lost_reason}</div>}
            {active.notes && <div className="rounded-md bg-muted/50 p-3 text-sm">{active.notes}</div>}

            {/* ACTIVITIES */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Historia aktywności</p>
                <Button size="sm" variant="outline" onClick={() => setShowActivityForm(!showActivityForm)}>
                  <Plus className="mr-1 h-3 w-3" /> Dodaj
                </Button>
              </div>
              {showActivityForm && (
                <div className="border rounded-md p-3 space-y-2 mb-3 bg-muted/30">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <select value={activityForm.activityType} onChange={(e) => setActivityForm({ ...activityForm, activityType: e.target.value as LeadActivity["activity_type"] })}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                        {Object.entries(ACTIVITY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <Input value={activityForm.title} onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })} placeholder="Opis aktywności" />
                  </div>
                  <textarea value={activityForm.description} onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                    rows={2} placeholder="Szczegóły..." className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddActivity} disabled={pending || !activityForm.title.trim()}>Zapisz</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowActivityForm(false)}>Anuluj</Button>
                  </div>
                </div>
              )}
              {(active.activities?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Brak aktywności. Dodaj notatkę, telefon lub spotkanie.</p>
              ) : (
                <div className="space-y-2">
                  {(active.activities ?? []).map((act) => (
                    <div key={act.id} className="flex gap-3 text-sm">
                      <div className="w-16 shrink-0 text-xs text-muted-foreground pt-0.5">
                        {new Date(act.activity_date).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}
                      </div>
                      <div>
                        <span className="bg-muted rounded px-1.5 py-0.5 text-xs font-medium mr-2">{ACTIVITY_TYPE_LABELS[act.activity_type]}</span>
                        <span className="font-medium">{act.title}</span>
                        {act.description && <p className="text-muted-foreground mt-0.5">{act.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
