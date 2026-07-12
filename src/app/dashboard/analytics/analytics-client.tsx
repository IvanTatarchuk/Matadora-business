"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3, TrendingUp, AlertTriangle, Users, DollarSign,
  FolderKanban, CheckCircle2, Clock, XCircle, ArrowRight,
  Search, Filter, Download, Calendar, TrendingDown, Gauge,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OrgAnalytics, ProjectAnalytics } from "@/lib/actions/analytics";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M PLN`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} k PLN`;
  return `${Math.round(n)} PLN`;
}

function ProgressBar({ pct, color = "bg-primary" }: { pct: number; color?: string }) {
  const capped = Math.min(100, Math.max(0, pct));
  const over = pct > 100;
  return (
    <div className="relative h-2 rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full transition-all ${over ? "bg-red-500" : color}`} style={{ width: `${capped}%` }} />
    </div>
  );
}

function ProjectCard({ p }: { p: ProjectAnalytics }) {
  const budgetOver = p.budget_pct > 100;
  const delayed = p.is_delayed;

  return (
    <Card className={`hover:shadow-sm transition-shadow ${delayed || budgetOver ? "border-orange-200" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{p.project_name}</p>
            <div className="flex gap-2 mt-0.5 flex-wrap">
              {delayed && (
                <span className="text-xs text-red-600 font-medium flex items-center gap-0.5">
                  <AlertTriangle className="h-3 w-3" />
                  {Math.abs(p.days_remaining ?? 0)} dni po terminie
                </span>
              )}
              {p.days_remaining !== null && !delayed && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {p.days_remaining} dni do końca
                </span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href={`/dashboard/contractor/projects/${p.project_id}`}><ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>

        {/* Progress */}
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Postęp prac</span>
            <span className="font-medium">{p.progress_pct}%</span>
          </div>
          <ProgressBar pct={p.progress_pct} color="bg-blue-500" />
        </div>

        {/* Budget */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Budżet</span>
            <span className={`font-medium ${budgetOver ? "text-red-600" : ""}`}>
              {fmt(p.budget_spent)} / {fmt(p.budget)} ({p.budget_pct}%)
            </span>
          </div>
          <ProgressBar pct={p.budget_pct} color={budgetOver ? "bg-red-500" : p.budget_pct > 80 ? "bg-orange-400" : "bg-green-500"} />
        </div>

        {/* Mini KPIs */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-muted/40 rounded p-1.5">
            <p className="text-xs text-muted-foreground">Zadania</p>
            <p className="text-sm font-semibold">{p.tasks_done}/{p.tasks_total}</p>
          </div>
          <div className={`rounded p-1.5 ${p.open_rfis > 0 ? "bg-blue-50" : "bg-muted/40"}`}>
            <p className="text-xs text-muted-foreground">RFI</p>
            <p className={`text-sm font-semibold ${p.open_rfis > 0 ? "text-blue-600" : ""}`}>{p.open_rfis}</p>
          </div>
          <div className={`rounded p-1.5 ${p.open_punch > 0 ? "bg-orange-50" : "bg-muted/40"}`}>
            <p className="text-xs text-muted-foreground">Usterki</p>
            <p className={`text-sm font-semibold ${p.open_punch > 0 ? "text-orange-600" : ""}`}>{p.open_punch}</p>
          </div>
          <div className={`rounded p-1.5 ${p.open_risks > 0 ? "bg-red-50" : "bg-muted/40"}`}>
            <p className="text-xs text-muted-foreground">Ryzyka</p>
            <p className={`text-sm font-semibold ${p.open_risks > 0 ? "text-red-600" : ""}`}>{p.open_risks}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const MARGIN_STATUS_CONFIG: Record<
  NonNullable<ProjectAnalytics["margin_status"]>,
  { label: string; rowColor: string; textColor: string; Icon: typeof TrendingUp }
> = {
  "on-track": { label: "Rentowny", rowColor: "bg-green-50", textColor: "text-green-700", Icon: TrendingUp },
  "watch": { label: "Do obserwacji", rowColor: "bg-yellow-50", textColor: "text-yellow-700", Icon: Gauge },
  "at-risk": { label: "Zagrożony", rowColor: "bg-red-50", textColor: "text-red-700", Icon: TrendingDown },
};

function ProfitabilityHeatmap({ projects }: { projects: ProjectAnalytics[] }) {
  const withMargin = projects
    .filter((p) => p.margin_status !== null)
    .sort((a, b) => (a.margin_pct ?? 0) - (b.margin_pct ?? 0));

  if (withMargin.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Rentowność portfela</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Marża = (wartość zaakceptowanej oferty − poniesione koszty) / wartość oferty
      </p>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Projekt</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Marża</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {withMargin.map((p) => {
              const cfg = MARGIN_STATUS_CONFIG[p.margin_status!];
              const Icon = cfg.Icon;
              return (
                <tr key={p.project_id} className={`border-t ${cfg.rowColor}`}>
                  <td className="px-3 py-2">
                    <Link href={`/dashboard/contractor/projects/${p.project_id}`} className="font-medium hover:underline">
                      {p.project_name}
                    </Link>
                  </td>
                  <td className={`px-3 py-2 text-right font-semibold ${cfg.textColor}`}>{p.margin_pct}%</td>
                  <td className={`px-3 py-2 ${cfg.textColor}`}>
                    <span className="inline-flex items-center gap-1 text-xs font-medium">
                      <Icon className="h-3.5 w-3.5" />{cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AnalyticsClient({ analytics }: { analytics: OrgAnalytics | null }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "delayed" | "on-track" | "over-budget">("all");
  const [showDelayedOnly, setShowDelayedOnly] = useState(false);

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Brak danych analitycznych</p>
      </div>
    );
  }

  const a = analytics;
  const delayedProjects = a.projects.filter((p) => p.is_delayed);
  const budgetOverProjects = a.projects.filter((p) => p.budget_pct > 100);
  const totalOpenIssues = a.projects.reduce((s, p) => s + p.open_punch + p.open_rfis, 0);

  const filteredProjects = a.projects.filter((p) => {
    const matchesSearch = !searchQuery || p.project_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "delayed" && p.is_delayed) ||
      (filterStatus === "on-track" && !p.is_delayed && p.budget_pct <= 100) ||
      (filterStatus === "over-budget" && p.budget_pct > 100);
    const matchesDelayed = !showDelayedOnly || p.is_delayed;
    return matchesSearch && matchesStatus && matchesDelayed;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" /> Analytics &amp; BI Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Przegląd wszystkich projektów i KPI firmy w czasie rzeczywistym</p>
      </div>

      {/* ALERTS BAR */}
      {(delayedProjects.length > 0 || budgetOverProjects.length > 0) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {delayedProjects.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Projekty po terminie: {delayedProjects.length}</p>
                <p className="text-xs text-red-700">{delayedProjects.map((p) => p.project_name).join(", ")}</p>
              </div>
            </div>
          )}
          {budgetOverProjects.length > 0 && (
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-orange-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-800">Przekroczenie budżetu: {budgetOverProjects.length}</p>
                <p className="text-xs text-orange-700">{budgetOverProjects.map((p) => p.project_name).join(", ")}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj projektów..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "all" | "delayed" | "on-track" | "over-budget")}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Wszystkie statusy</option>
          <option value="delayed">Opóźnione</option>
          <option value="on-track">Na czas</option>
          <option value="over-budget">Przekroczenie budżetu</option>
        </select>
        <Button
          variant={showDelayedOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowDelayedOnly(!showDelayedOnly)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Tylko opóźnione
        </Button>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Eksport
        </Button>
      </div>

      {/* TOP-LEVEL KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Aktywne projekty</p>
              <FolderKanban className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold">{a.projects_active}</p>
            <p className="text-xs text-muted-foreground mt-1">z {a.projects_total} łącznie</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Łączny budżet portfela</p>
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold">{fmt(a.total_budget)}</p>
            <div className="mt-1.5">
              <ProgressBar pct={a.total_budget_pct} color={a.total_budget_pct > 90 ? "bg-orange-400" : "bg-green-500"} />
              <p className="text-xs text-muted-foreground mt-0.5">Wydano {fmt(a.total_spent)} ({a.total_budget_pct}%)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Przychody YTD</p>
              <TrendingUp className="h-5 w-5 text-teal-500" />
            </div>
            <p className="text-3xl font-bold">{fmt(a.revenue_ytd)}</p>
            <p className="text-xs text-muted-foreground mt-1">Faktury zapłacone w tym roku</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Pracownicy</p>
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold">{a.workers_count}</p>
            <p className="text-xs text-muted-foreground mt-1">Zarejestrowanych w systemie</p>
          </CardContent>
        </Card>
      </div>

      {/* SECONDARY KPIs */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className={delayedProjects.length > 0 ? "border-red-200" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className={`h-8 w-8 ${delayedProjects.length > 0 ? "text-red-500" : "text-muted-foreground/30"}`} />
            <div>
              <p className="text-2xl font-bold">{delayedProjects.length}</p>
              <p className="text-xs text-muted-foreground">Opóźnionych projektów</p>
            </div>
          </CardContent>
        </Card>
        <Card className={budgetOverProjects.length > 0 ? "border-orange-200" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className={`h-8 w-8 ${budgetOverProjects.length > 0 ? "text-orange-500" : "text-muted-foreground/30"}`} />
            <div>
              <p className="text-2xl font-bold">{budgetOverProjects.length}</p>
              <p className="text-xs text-muted-foreground">Przekroczeń budżetu</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className={`h-8 w-8 ${totalOpenIssues > 0 ? "text-yellow-500" : "text-muted-foreground/30"}`} />
            <div>
              <p className="text-2xl font-bold">{totalOpenIssues}</p>
              <p className="text-xs text-muted-foreground">Otwartych RFI + usterek</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">
                {a.projects.length > 0 ? Math.round(a.projects.reduce((s, p) => s + p.progress_pct, 0) / a.projects.length) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Średni postęp projektów</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PORTFOLIO PROFITABILITY HEATMAP */}
      <ProfitabilityHeatmap projects={a.projects} />

      {/* PROJECT CARDS */}
      {filteredProjects.length > 0 && (
        <>
          <div>
            <h2 className="text-lg font-semibold mb-1">Portfel projektów</h2>
            <p className="text-sm text-muted-foreground mb-4">Szczegółowe KPI dla każdego projektu</p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProjects
                .sort((a, b) => (b.is_delayed ? 1 : 0) - (a.is_delayed ? 1 : 0))
                .map((p) => <ProjectCard key={p.project_id} p={p} />)}
            </div>
          </div>
        </>
      )}

      {filteredProjects.length === 0 && a.projects.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <BarChart3 className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Brak projektów pasujących do filtrów</p>
            <p className="text-sm mt-1">Zmień kryteria wyszukiwania lub filtry</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
