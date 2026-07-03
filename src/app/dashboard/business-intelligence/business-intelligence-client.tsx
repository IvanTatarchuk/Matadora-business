"use client";

import { useState, useTransition } from "react";
import { BarChart3, Plus, Database, FileText, Layers, X, RefreshCw, Search, Filter } from "lucide-react";
import {
  createBIDashboard, createBIWidget, createBIReport, createBIDataSource,
  type BIDashboard, type BIReport, type BIDataSource, type WidgetType, type ReportType, type SourceType,
} from "@/lib/actions/business-intelligence";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  initialDashboards: BIDashboard[];
  initialReports: BIReport[];
  initialDataSources: BIDataSource[];
  initialStats: {
    totalDashboards: number;
    totalWidgets: number;
    totalReports: number;
    totalDataSources: number;
  };
};

export function BusinessIntelligenceClient({ initialDashboards, initialReports, initialDataSources, initialStats }: Props) {
  const [dashboards, setDashboards] = useState<BIDashboard[]>(initialDashboards);
  const [reports, setReports] = useState<BIReport[]>(initialReports);
  const [dataSources, setDataSources] = useState<BIDataSource[]>(initialDataSources);
  const [stats, setStats] = useState(initialStats);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [showDashboardForm, setShowDashboardForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showDataSourceForm, setShowDataSourceForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "public" | "private">("all");

  const [dashboardForm, setDashboardForm] = useState({
    name: "",
    description: "",
    isPublic: false,
  });

  const [reportForm, setReportForm] = useState({
    name: "",
    description: "",
    reportType: "financial" as ReportType,
    query: "",
    schedule: "",
  });

  const [dataSourceForm, setDataSourceForm] = useState({
    name: "",
    sourceType: "database" as SourceType,
    connectionConfig: {},
  });

  function handleCreateDashboard() {
    if (!dashboardForm.name) { setError("Назва є обов'язковою"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createBIDashboard(dashboardForm);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      setShowDashboardForm(false);
      setDashboardForm({ name: "", description: "", isPublic: false });
      // Reload dashboards
      const newDashboards = await fetch("/api/bi/dashboards").then(r => r.json());
      setDashboards(newDashboards);
    });
  }

  function handleCreateReport() {
    if (!reportForm.name || !reportForm.query) {
      setError("Назва та query є обов'язковими");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createBIReport(reportForm);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      setShowReportForm(false);
      setReportForm({ name: "", description: "", reportType: "financial", query: "", schedule: "" });
      // Reload reports
      const newReports = await fetch("/api/bi/reports").then(r => r.json());
      setReports(newReports);
    });
  }

  function handleCreateDataSource() {
    if (!dataSourceForm.name) { setError("Назва є обов'язковою"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createBIDataSource(dataSourceForm);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      setShowDataSourceForm(false);
      setDataSourceForm({ name: "", sourceType: "database", connectionConfig: {} });
      // Reload data sources
      const newDataSources = await fetch("/api/bi/data-sources").then(r => r.json());
      setDataSources(newDataSources);
    });
  }

  const filteredDashboards = dashboards.filter((d) => {
    const matchesSearch = !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || 
      (filterType === "public" && d.is_public) ||
      (filterType === "private" && !d.is_public);
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Бізнес-інтелект та аналітика
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Дашборди, звіти та джерела даних для аналітики
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Дашборди</p>
              <Layers className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{stats.totalDashboards}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Віджети</p>
              <BarChart3 className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{stats.totalWidgets}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Звіти</p>
              <FileText className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{stats.totalReports}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Джерела даних</p>
              <Database className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold">{stats.totalDataSources}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setShowDashboardForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Новий дашборд
        </Button>
        <Button variant="outline" onClick={() => setShowReportForm(true)}>
          <FileText className="h-4 w-4 mr-2" />
          Новий звіт
        </Button>
        <Button variant="outline" onClick={() => setShowDataSourceForm(true)}>
          <Database className="h-4 w-4 mr-2" />
          Джерело даних
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Шукати дашборди..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as "all" | "public" | "private")}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Всі типи</option>
          <option value="public">Публічні</option>
          <option value="private">Приватні</option>
        </select>
      </div>

      {/* Dashboard Form */}
      {showDashboardForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Створити дашборд</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowDashboardForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Назва</label>
              <Input value={dashboardForm.name} onChange={(e) => setDashboardForm({ ...dashboardForm, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Опис</label>
              <Input value={dashboardForm.description} onChange={(e) => setDashboardForm({ ...dashboardForm, description: e.target.value })} className="mt-1" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="public"
                checked={dashboardForm.isPublic}
                onChange={(e) => setDashboardForm({ ...dashboardForm, isPublic: e.target.checked })}
              />
              <label htmlFor="public" className="text-sm">Публічний</label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreateDashboard} disabled={pending}>{pending ? "Створення..." : "Створити"}</Button>
              <Button variant="outline" onClick={() => { setShowDashboardForm(false); setError(null); }}>Скасувати</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Form */}
      {showReportForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Створити звіт</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowReportForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Назва</label>
              <Input value={reportForm.name} onChange={(e) => setReportForm({ ...reportForm, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Опис</label>
              <Input value={reportForm.description} onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Тип звіту</label>
              <select
                value={reportForm.reportType}
                onChange={(e) => setReportForm({ ...reportForm, reportType: e.target.value as any })}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="financial">Фінансовий</option>
                <option value="operational">Операційний</option>
                <option value="sales">Продажі</option>
                <option value="project">Проектний</option>
                <option value="resource">Ресурсний</option>
                <option value="custom">Кастомний</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">SQL Query</label>
              <Input value={reportForm.query} onChange={(e) => setReportForm({ ...reportForm, query: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Розклад (cron)</label>
              <Input value={reportForm.schedule} onChange={(e) => setReportForm({ ...reportForm, schedule: e.target.value })} className="mt-1" placeholder="0 2 * * *" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreateReport} disabled={pending}>{pending ? "Створення..." : "Створити"}</Button>
              <Button variant="outline" onClick={() => { setShowReportForm(false); setError(null); }}>Скасувати</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Source Form */}
      {showDataSourceForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Додати джерело даних</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowDataSourceForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Назва</label>
              <Input value={dataSourceForm.name} onChange={(e) => setDataSourceForm({ ...dataSourceForm, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Тип джерела</label>
              <select
                value={dataSourceForm.sourceType}
                onChange={(e) => setDataSourceForm({ ...dataSourceForm, sourceType: e.target.value as any })}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="database">База даних</option>
                <option value="api">API</option>
                <option value="file">Файл</option>
                <option value="external">Зовнішнє</option>
              </select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreateDataSource} disabled={pending}>{pending ? "Додавання..." : "Додати"}</Button>
              <Button variant="outline" onClick={() => { setShowDataSourceForm(false); setError(null); }}>Скасувати</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboards */}
      <Card>
        <CardHeader>
          <CardTitle>Дашборди</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDashboards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Немає дашбордів
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDashboards.map((dashboard) => (
                <div key={dashboard.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium">{dashboard.name}</p>
                    <p className="text-sm text-muted-foreground">{dashboard.description || "Без опису"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(dashboard.created_at).toLocaleString("pl-PL")}</p>
                  </div>
                  {dashboard.is_public && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Публічний</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Звіти</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Немає звітів
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{report.name}</p>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{report.report_type}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{report.description || "Без опису"}</p>
                    {report.last_run_at && (
                      <p className="text-xs text-muted-foreground">Останній запуск: {new Date(report.last_run_at).toLocaleString("pl-PL")}</p>
                    )}
                  </div>
                  {report.schedule && <span className="text-xs text-muted-foreground">{report.schedule}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Джерела даних</CardTitle>
        </CardHeader>
        <CardContent>
          {dataSources.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Немає джерел даних
            </div>
          ) : (
            <div className="space-y-2">
              {dataSources.map((source) => (
                <div key={source.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{source.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        source.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      }`}>
                        {source.source_type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(source.created_at).toLocaleString("pl-PL")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
