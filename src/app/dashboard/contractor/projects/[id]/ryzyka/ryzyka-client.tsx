"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, ShieldAlert, TrendingUp, X, Trash2,
  AlertTriangle, CheckCircle2, BarChart3,
} from "lucide-react";
import {
  createRisk, updateRiskStatus, deleteRisk, RISK_LEVEL,
  type ProjectRisk, type RiskCategory, type RiskStatus, type ResponseStrategy,
} from "@/lib/actions/risks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const CATEGORY_LABELS: Record<RiskCategory, string> = {
  technical:     "Techniczne",
  financial:     "Finansowe",
  schedule:      "Harmonogram",
  safety:        "BHP / Bezpieczeństwo",
  legal:         "Prawne",
  environmental: "Środowiskowe",
  subcontractor: "Podwykonawcy",
  design:        "Projektowe",
  weather:       "Pogodowe",
  client:        "Po stronie klienta",
  other:         "Inne",
};

const STATUS_CONFIG: Record<RiskStatus, { label: string; color: string }> = {
  identified: { label: "Zidentyfikowane", color: "bg-blue-100 text-blue-700" },
  assessed:   { label: "Ocenione",        color: "bg-yellow-100 text-yellow-700" },
  mitigated:  { label: "Mitygowane",      color: "bg-orange-100 text-orange-700" },
  realized:   { label: "Zmaterializowane",color: "bg-red-100 text-red-700" },
  closed:     { label: "Zamknięte",       color: "bg-slate-100 text-slate-500" },
};

const RESPONSE_LABELS: Record<ResponseStrategy, string> = {
  avoid:   "Unikanie",
  transfer:"Transfer / Ubezpieczenie",
  mitigate:"Mitygacja / Redukcja",
  accept:  "Akceptacja",
  monitor: "Monitorowanie",
  exploit: "Wykorzystanie (szansa)",
  share:   "Podział (szansa)",
  enhance: "Wzmocnienie (szansa)",
};

const PROB_LABELS = ["", "Bardzo niskie", "Niskie", "Umiarkowane", "Wysokie", "Bardzo wysokie"];
const IMPACT_LABELS = ["", "Minimalne", "Niskie", "Umiarkowane", "Poważne", "Katastrofalne"];

function RiskMatrix({ risks }: { risks: ProjectRisk[] }) {
  const grid: (number[])[][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => []));
  risks.filter((r) => r.status !== "closed").forEach((r) => {
    grid[5 - r.impact]![r.probability - 1]!.push(r.risk_score);
  });

  const cellColor = (p: number, i: number) => {
    const score = p * i;
    if (score <= 4) return "bg-green-100";
    if (score <= 9) return "bg-yellow-100";
    if (score <= 16) return "bg-orange-100";
    return "bg-red-100";
  };

  return (
    <div className="overflow-auto">
      <p className="text-xs font-semibold text-muted-foreground mb-2">MAPA RYZYK 5×5 (aktywne)</p>
      <div className="inline-block text-xs">
        <div className="flex">
          <div className="w-24 shrink-0" />
          {[1,2,3,4,5].map((p) => (
            <div key={p} className="w-16 text-center font-medium text-muted-foreground py-1">{p}</div>
          ))}
        </div>
        {[5,4,3,2,1].map((impact, rowIdx) => (
          <div key={impact} className="flex items-center">
            <div className="w-24 shrink-0 text-right pr-2 text-muted-foreground py-1 text-[10px]">{(IMPACT_LABELS[impact] ?? "").substring(0,8)}</div>
            {[1,2,3,4,5].map((prob) => {
              const count = (grid[rowIdx]?.[prob - 1] ?? []).length;
              return (
                <div key={prob} className={`w-16 h-10 border border-white ${cellColor(prob, impact)} flex items-center justify-center font-bold text-sm`}>
                  {count > 0 ? count : ""}
                </div>
              );
            })}
          </div>
        ))}
        <div className="flex mt-1">
          <div className="w-24 shrink-0" />
          <div className="flex-1 text-center text-[10px] text-muted-foreground">← Prawdopodobieństwo →</div>
        </div>
      </div>
    </div>
  );
}

export function RyzykaClient({
  projectId,
  initialRisks,
}: {
  projectId: string;
  initialRisks: ProjectRisk[];
}) {
  const [risks, setRisks] = useState<ProjectRisk[]>(initialRisks);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<RiskStatus | "all">("all");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "matrix">("list");

  const [form, setForm] = useState({
    title: "", description: "", category: "other" as RiskCategory,
    probability: "3", impact: "3", riskType: "threat" as "threat" | "opportunity",
    ownerName: "", responseStrategy: "monitor" as ResponseStrategy,
    mitigationPlan: "", costImpactMin: "", costImpactMax: "",
    scheduleDaysMin: "0", scheduleDaysMax: "0", reviewDate: "",
  });

  const activeRisks = risks.filter((r) => r.status !== "closed");
  const critical = activeRisks.filter((r) => r.risk_score >= 17).length;
  const high = activeRisks.filter((r) => r.risk_score >= 10 && r.risk_score < 17).length;
  const filtered = filterStatus === "all" ? risks : risks.filter((r) => r.status === filterStatus);

  function handleAdd() {
    if (!form.title.trim()) { setError("Tytuł jest wymagany"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createRisk({
        projectId, title: form.title,
        description: form.description || undefined,
        category: form.category,
        probability: Number(form.probability),
        impact: Number(form.impact),
        riskType: form.riskType,
        ownerName: form.ownerName || undefined,
        responseStrategy: form.responseStrategy,
        mitigationPlan: form.mitigationPlan || undefined,
        costImpactMin: form.costImpactMin ? Number(form.costImpactMin) : undefined,
        costImpactMax: form.costImpactMax ? Number(form.costImpactMax) : undefined,
        scheduleDaysMin: Number(form.scheduleDaysMin),
        scheduleDaysMax: Number(form.scheduleDaysMax),
        reviewDate: form.reviewDate || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const score = Number(form.probability) * Number(form.impact);
      const newRisk: ProjectRisk = {
        id: res.id!, project_id: projectId, org_id: "", created_by: null,
        number: risks.length + 1, title: form.title,
        description: form.description || null, category: form.category,
        probability: Number(form.probability), impact: Number(form.impact), risk_score: score,
        risk_type: form.riskType, owner_name: form.ownerName || null, owner_id: null,
        response_strategy: form.responseStrategy,
        mitigation_plan: form.mitigationPlan || null, contingency_plan: null,
        cost_impact_min: form.costImpactMin ? Number(form.costImpactMin) : null,
        cost_impact_max: form.costImpactMax ? Number(form.costImpactMax) : null,
        schedule_days_min: Number(form.scheduleDaysMin),
        schedule_days_max: Number(form.scheduleDaysMax),
        status: "identified", residual_probability: null, residual_impact: null,
        review_date: form.reviewDate || null, closed_at: null, notes: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setRisks((prev) => [newRisk, ...prev].sort((a, b) => b.risk_score - a.risk_score));
      setShowForm(false);
      setForm({ title: "", description: "", category: "other", probability: "3", impact: "3", riskType: "threat", ownerName: "", responseStrategy: "monitor", mitigationPlan: "", costImpactMin: "", costImpactMax: "", scheduleDaysMin: "0", scheduleDaysMax: "0", reviewDate: "" });
    });
  }

  function handleStatusChange(id: string, status: RiskStatus) {
    startTransition(async () => {
      await updateRiskStatus(id, projectId, status);
      setRisks((prev) => prev.map((r) => r.id === id ? { ...r, status } : r).sort((a, b) => b.risk_score - a.risk_score));
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteRisk(id, projectId);
      setRisks((prev) => prev.filter((r) => r.id !== id));
    });
  }

  const previewScore = Number(form.probability) * Number(form.impact);
  const previewLevel = RISK_LEVEL(previewScore);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Rejestr ryzyk</h1>
          <p className="text-sm text-muted-foreground">Identyfikacja, ocena i mitygacja ryzyk — matryca 5×5 (PMI standard)</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="mr-1 h-4 w-4" /> Nowe ryzyko
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Krytyczne (17-25)</p>
            <p className="text-2xl font-bold text-red-600">{critical}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Wysokie (10-16)</p>
            <p className="text-2xl font-bold text-orange-600">{high}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Aktywne łącznie</p>
            <p className="text-2xl font-bold">{activeRisks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Zamknięte</p>
            <p className="text-2xl font-bold text-slate-400">{risks.filter((r) => r.status === "closed").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowe ryzyko</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Tytuł ryzyka *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="np. Opóźnienie dostaw stali przez dostawcę" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Kategoria</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as RiskCategory })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Typ</label>
                <select value={form.riskType} onChange={(e) => setForm({ ...form, riskType: e.target.value as "threat" | "opportunity" })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="threat">Zagrożenie</option>
                  <option value="opportunity">Szansa</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Prawdopodobieństwo (1-5): {PROB_LABELS[Number(form.probability)]}</label>
                <input type="range" min={1} max={5} value={form.probability}
                  onChange={(e) => setForm({ ...form, probability: e.target.value })}
                  className="mt-2 w-full accent-primary" />
                <div className="flex justify-between text-xs text-muted-foreground"><span>1</span><span>5</span></div>
              </div>
              <div>
                <label className="text-sm font-medium">Wpływ (1-5): {IMPACT_LABELS[Number(form.impact)]}</label>
                <input type="range" min={1} max={5} value={form.impact}
                  onChange={(e) => setForm({ ...form, impact: e.target.value })}
                  className="mt-2 w-full accent-primary" />
                <div className="flex justify-between text-xs text-muted-foreground"><span>1</span><span>5</span></div>
              </div>
              <div className="sm:col-span-2">
                <div className={`rounded-md px-4 py-2 inline-flex items-center gap-2 text-sm font-semibold ${previewLevel.color}`}>
                  <BarChart3 className="h-4 w-4" />
                  Wynik ryzyka: {previewScore}/25 — {previewLevel.label}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Właściciel ryzyka</label>
                <Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  placeholder="Imię i nazwisko / rola" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Strategia odpowiedzi</label>
                <select value={form.responseStrategy} onChange={(e) => setForm({ ...form, responseStrategy: e.target.value as ResponseStrategy })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(RESPONSE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Plan mitygacji</label>
                <textarea value={form.mitigationPlan} onChange={(e) => setForm({ ...form, mitigationPlan: e.target.value })}
                  rows={2} placeholder="Konkretne działania zmniejszające prawdopodobieństwo lub wpływ ryzyka..."
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium">Wpływ finansowy min (PLN)</label>
                <Input type="number" min={0} value={form.costImpactMin}
                  onChange={(e) => setForm({ ...form, costImpactMin: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Wpływ finansowy max (PLN)</label>
                <Input type="number" min={0} value={form.costImpactMax}
                  onChange={(e) => setForm({ ...form, costImpactMax: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Wpływ na harmonogram min (dni)</label>
                <Input type="number" min={0} value={form.scheduleDaysMin}
                  onChange={(e) => setForm({ ...form, scheduleDaysMin: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Data przeglądu</label>
                <Input type="date" value={form.reviewDate}
                  onChange={(e) => setForm({ ...form, reviewDate: e.target.value })} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Opis ryzyka</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={pending}>{pending ? "Zapisywanie..." : "Dodaj ryzyko"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* VIEW TOGGLE + FILTER */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 border-b flex-wrap">
          {(["all", "identified", "assessed", "mitigated", "realized", "closed"] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${filterStatus === s ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {s === "all" ? `Wszystkie (${risks.length})` : `${STATUS_CONFIG[s].label} (${risks.filter((r) => r.status === s).length})`}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")}>Lista</Button>
          <Button variant={view === "matrix" ? "default" : "outline"} size="sm" onClick={() => setView("matrix")}>
            <BarChart3 className="mr-1 h-3 w-3" /> Mapa
          </Button>
        </div>
      </div>

      {view === "matrix" && (
        <Card>
          <CardContent className="p-4">
            <RiskMatrix risks={filtered} />
          </CardContent>
        </Card>
      )}

      {/* LIST */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <ShieldAlert className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Brak ryzyk</p>
            <p className="text-sm mt-1">Dobra praktyka: identyfikuj ryzyka od początku projektu</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const level = RISK_LEVEL(r.risk_score);
            const statusCfg = STATUS_CONFIG[r.status];
            return (
              <Card key={r.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`rounded-lg px-3 py-2 text-center min-w-[56px] shrink-0 ${level.color}`}>
                      <p className="text-xs font-medium">Wynik</p>
                      <p className="text-xl font-bold">{r.risk_score}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusCfg.color}`}>{statusCfg.label}</span>
                        <span className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{CATEGORY_LABELS[r.category]}</span>
                        <span className={`text-xs rounded px-1.5 py-0.5 ${r.risk_type === "threat" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                          {r.risk_type === "threat" ? "Zagrożenie" : "Szansa"}
                        </span>
                        <span className={`text-xs font-semibold ${level.color} rounded px-1.5 py-0.5`}>{level.label}</span>
                      </div>
                      <p className="font-semibold">{r.title}</p>
                      {r.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{r.description}</p>}
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>P={r.probability} × W={r.impact}</span>
                        {r.owner_name && <span>Właściciel: {r.owner_name}</span>}
                        <span>{RESPONSE_LABELS[r.response_strategy]}</span>
                        {r.review_date && <span>Przegląd: {new Date(r.review_date).toLocaleDateString("pl-PL")}</span>}
                      </div>
                      {r.mitigation_plan && (
                        <p className="text-xs text-muted-foreground mt-1 border-l-2 border-primary/30 pl-2">{r.mitigation_plan}</p>
                      )}
                      {(r.cost_impact_min || r.cost_impact_max) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Wpływ finansowy: {r.cost_impact_min ? `${r.cost_impact_min.toLocaleString("pl-PL")} PLN` : "?"} — {r.cost_impact_max ? `${r.cost_impact_max.toLocaleString("pl-PL")} PLN` : "?"}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {r.status !== "closed" && (
                        <>
                          {r.status === "identified" && (
                            <Button size="sm" variant="outline" onClick={() => handleStatusChange(r.id, "assessed")} disabled={pending}>Oceń</Button>
                          )}
                          {r.status === "assessed" && (
                            <Button size="sm" variant="outline" onClick={() => handleStatusChange(r.id, "mitigated")} disabled={pending}>Mityguj</Button>
                          )}
                          {(r.status === "mitigated" || r.status === "realized") && (
                            <Button size="sm" variant="outline" className="text-green-600 border-green-300" onClick={() => handleStatusChange(r.id, "closed")} disabled={pending}>
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Zamknij
                            </Button>
                          )}
                          {r.status !== "realized" && (
                            <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={() => handleStatusChange(r.id, "realized")} disabled={pending}>
                              <AlertTriangle className="mr-1 h-3 w-3" /> Zmaterializowane
                            </Button>
                          )}
                        </>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)} disabled={pending}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
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
