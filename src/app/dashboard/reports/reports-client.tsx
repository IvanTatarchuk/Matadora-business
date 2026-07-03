"use client";

import { useState, useTransition } from "react";
import { FileText, Download, Calendar, DollarSign, Users, Package, BarChart3, CheckCircle2, Clock, Filter, History, FileDown, Printer } from "lucide-react";
import { generateReport, exportReportAsCSV, exportToCSV, type ReportType, type ReportConfig } from "@/lib/actions/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const REPORT_TYPES: { type: ReportType; label: string; icon: any; description: string }[] = [
  { type: "project_summary", label: "Podsumowanie projektów", icon: BarChart3, description: "Przegląd wszystkich projektów i ich statusów" },
  { type: "financial_report", label: "Raport finansowy", icon: DollarSign, description: "Wydatki, przychody i bilans finansowy" },
  { type: "labor_report", label: "Raport pracy", icon: Users, description: "Godziny pracy, koszty pracy i wydajność" },
  { type: "material_report", label: "Raport materiałów", icon: Package, description: "Zużycie materiałów i stan magazynu" },
  { type: "attendance_report", label: "Raport obecności", icon: CheckCircle2, description: "Obecność pracowników i statystyki" },
  { type: "inventory_report", label: "Stan magazynu", icon: Package, description: "Aktualny stan i wartość zapasów" },
  { type: "progress_report", label: "Raport postępu", icon: BarChart3, description: "Postęp projektów i zadań" },
];

export function ReportsClient() {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [projectId, setProjectId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [reportHistory, setReportHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  function handleGenerate() {
    if (!selectedType) return;
    setError(null);
    startTransition(async () => {
      try {
        const config: ReportConfig = {
          type: selectedType,
          projectId: projectId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        };
        const report = await generateReport(config);
        setReportData(report);
        // Add to history
        setReportHistory((prev) => [
          { ...report, config, generatedAt: new Date().toISOString() },
          ...prev.slice(0, 9), // Keep last 10
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Błąd generowania raportu");
      }
    });
  }

  function setQuickDateRange(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  }

  function handleExportCSV() {
    if (!selectedType) return;
    setError(null);
    startTransition(async () => {
      try {
        const config: ReportConfig = {
          type: selectedType,
          projectId: projectId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        };
        const result = await exportReportAsCSV(config);
        if (!result.ok) {
          setError(result.error ?? "Błąd eksportu");
          return;
        }
        const blob = new Blob([result.csv!], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = result.filename!;
        link.click();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Błąd eksportu");
      }
    });
  }

  const selectedReport = REPORT_TYPES.find((r) => r.type === selectedType);
  const Icon = selectedReport?.icon || FileText;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Raporty i eksport
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generuj raporty i eksportuj dane do analizy
        </p>
      </div>

      {/* Report Type Selection */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_TYPES.map((report) => {
          const ReportIcon = report.icon;
          return (
            <Card
              key={report.type}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedType === report.type ? "border-primary bg-primary/5" : ""
              }`}
              onClick={() => setSelectedType(report.type)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <ReportIcon className="h-5 w-5 text-primary" />
                  <p className="font-semibold">{report.label}</p>
                </div>
                <p className="text-sm text-muted-foreground">{report.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Report Configuration */}
      {selectedType && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {selectedReport?.label}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4 mr-2" />
                Historia
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Date Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">Szybki wybór dat</label>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setQuickDateRange(7)}>
                  Ostatnie 7 dni
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDateRange(30)}>
                  Ostatnie 30 dni
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDateRange(90)}>
                  Ostatnie 90 dni
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}>
                  Wyczyść
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium">ID projektu (opcjonalne)</label>
                <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Data od</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Data do</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGenerate} disabled={pending}>
                <BarChart3 className="h-4 w-4 mr-2" />
                {pending ? "Generowanie..." : "Generuj raport"}
              </Button>
              <Button variant="outline" onClick={handleExportCSV} disabled={pending}>
                <Download className="h-4 w-4 mr-2" />
                Eksport CSV
              </Button>
              <Button variant="outline" size="sm" disabled={!reportData}>
                <Printer className="h-4 w-4 mr-2" />
                Drukuj
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Report History */}
      {showHistory && reportHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historia raportów
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reportHistory.map((report, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded bg-muted">
                  <div>
                    <p className="font-medium text-sm">{report.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(report.generatedAt).toLocaleString("pl-PL")}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <FileDown className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Results */}
      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{reportData.title}</span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(reportData.generatedAt).toLocaleString("pl-PL")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid gap-4 sm:grid-cols-4">
                {Object.entries(reportData.summary).map(([key, value]) => (
                  <div key={key} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</p>
                    <p className="text-lg font-semibold">{typeof value === "number" ? value.toLocaleString("pl-PL") : String(value)}</p>
                  </div>
                ))}
              </div>

              {/* Data Preview */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Dane</h3>
                <div className="bg-muted/30 rounded-lg p-4 max-h-64 overflow-auto">
                  <pre className="text-xs">{JSON.stringify(reportData.data, null, 2)}</pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
