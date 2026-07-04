"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HardHat,
  Plus,
  Trash2,
  Download,
  CheckCircle2,
  ArrowRight,
  FileText,
  Calculator,
  Zap,
  Info,
  Sparkles,
  Upload,
  Loader2,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPLN } from "@/lib/utils";
import { validateEstimateForSubmission, findOutlierRates } from "@/lib/offer-calc";

const KNR_ITEMS = [
  { code: "KNR 4-01 0501-01", name: "Posadzki z płytek ceramicznych na kleju — 30×30 cm", unit: "m²", laborRate: 35, materialRate: 55 },
  { code: "KNR 4-01 0502-01", name: "Posadzki z płytek ceramicznych na kleju — 60×60 cm", unit: "m²", laborRate: 42, materialRate: 85 },
  { code: "KNR 2-02 0312-01", name: "Tynkowanie ścian wewnętrznych gipsem maszynowym", unit: "m²", laborRate: 22, materialRate: 18 },
  { code: "KNR 2-02 0401-01", name: "Malowanie ścian farbą emulsyjną 2×", unit: "m²", laborRate: 14, materialRate: 8 },
  { code: "KNR 4-01 0701-01", name: "Układanie paneli podłogowych laminowanych", unit: "m²", laborRate: 25, materialRate: 65 },
  { code: "KNR 2-02 1101-01", name: "Sufit podwieszany z płyt gipsowo-kartonowych", unit: "m²", laborRate: 55, materialRate: 45 },
  { code: "KNR 3-01 0211-01", name: "Instalacja elektryczna — punkt oświetleniowy", unit: "szt", laborRate: 120, materialRate: 80 },
  { code: "KNR 3-01 0301-01", name: "Instalacja elektryczna — gniazdo wtyczkowe", unit: "szt", laborRate: 95, materialRate: 60 },
  { code: "KNR 3-02 0101-01", name: "Instalacja sanitarna — punkt wod-kan", unit: "szt", laborRate: 250, materialRate: 180 },
  { code: "KNR 2-01 0101-01", name: "Roboty rozbiórkowe — ściany działowe", unit: "m²", laborRate: 45, materialRate: 5 },
  { code: "KNR 2-01 0201-01", name: "Murowanie ściany działowej z cegły", unit: "m²", laborRate: 65, materialRate: 85 },
  { code: "KNR 4-01 0101-01", name: "Hydroizolacja łazienki (folia w płynie 2×)", unit: "m²", laborRate: 30, materialRate: 35 },
];

/** Reference band for outlier-rate detection: 0.3×–3× the catalog's own min/max. */
const KNR_RATE_BOUNDS = (() => {
  const rates = KNR_ITEMS.flatMap((k) => [k.laborRate, k.materialRate]);
  return { min: Math.min(...rates) * 0.3, max: Math.max(...rates) * 3 };
})();

type LineItem = {
  id: string;
  code: string;
  name: string;
  unit: string;
  qty: number;
  laborRate: number;
  materialRate: number;
  /** Optional section/room label for grouping items (e.g. "Łazienka"). */
  groupLabel?: string;
};

const UNGROUPED_KEY = "__ungrouped__";

/** Groups line items by `groupLabel`, preserving first-seen order. */
function groupItemsByLabel(items: LineItem[]) {
  const groups = new Map<string, { label: string | null; items: LineItem[] }>();
  for (const item of items) {
    const label = item.groupLabel?.trim() || null;
    const key = label ?? UNGROUPED_KEY;
    const bucket = groups.get(key);
    if (bucket) bucket.items.push(item);
    else groups.set(key, { label, items: [item] });
  }
  return Array.from(groups.values()).map((g) => ({
    ...g,
    subtotal: g.items.reduce(
      (sum, i) => sum + i.qty * (i.laborRate + i.materialRate),
      0
    ),
  }));
}

let idCounter = 0;
function newId() { return `item-${++idCounter}`; }

type AiSuggestedItem = {
  id: string;
  name: string;
  unit: string;
  qty: number;
  knrCode: string | null;
  laborRate: number;
  materialRate: number;
  selected: boolean;
};

const MAX_PDF_MB = 4;

const VAT_RATES = [
  { label: "8% (budownictwo mieszkaniowe)", value: 0.08 },
  { label: "23% (budownictwo komercyjne)", value: 0.23 },
];

export default function KosztorysPage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [vatRate, setVatRate] = useState(0.08);
  const [items, setItems] = useState<LineItem[]>([
    { id: newId(), ...(KNR_ITEMS[0] as (typeof KNR_ITEMS)[0]), qty: 25 },
    { id: newId(), ...(KNR_ITEMS[2] as (typeof KNR_ITEMS)[0]), qty: 60 },
    { id: newId(), ...(KNR_ITEMS[3] as (typeof KNR_ITEMS)[0]), qty: 60 },
  ]);
  const [search, setSearch] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // AI PDF analysis
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiUploading, setAiUploading] = useState(false);
  const [aiDragging, setAiDragging] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiFileName, setAiFileName] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestedItem[]>([]);

  const filtered = KNR_ITEMS.filter(
    (k) =>
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.code.toLowerCase().includes(search.toLowerCase())
  );

  function addItem(knr: typeof KNR_ITEMS[0]) {
    setItems((prev) => [...prev, { id: newId(), ...knr, qty: 1 }]);
    setShowCatalog(false);
    setSearch("");
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateQty(id: string, qty: number) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(0, qty) } : i)));
  }

  function updateRate(id: string, field: "laborRate" | "materialRate", val: number) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: Math.max(0, val) } : i)));
  }

  function updateGroupLabel(id: string, groupLabel: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, groupLabel } : i)));
  }

  function toggleGroupCollapsed(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const groupedItems = groupItemsByLabel(items);
  const hasSections = groupedItems.some((g) => g.label !== null);

  const totals = items.reduce(
    (acc, item) => {
      const labor = item.qty * item.laborRate;
      const material = item.qty * item.materialRate;
      return { labor: acc.labor + labor, material: acc.material + material };
    },
    { labor: 0, material: 0 }
  );
  const net = totals.labor + totals.material;
  const vat = net * vatRate;
  const gross = net + vat;

  const submissionWarnings = [
    ...validateEstimateForSubmission(
      items.map((i) => ({ stage_name: i.name, cost: i.qty * (i.laborRate + i.materialRate) })),
      { clientName }
    ),
    ...findOutlierRates(items, KNR_RATE_BOUNDS),
  ];

  function handlePdfSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (file) void processPdfFile(file);
  }

  function handlePdfDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setAiDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processPdfFile(file);
  }

  async function processPdfFile(file: File) {
    setAiError(null);
    setAiSummary(null);
    setAiSuggestions([]);

    if (file.type !== "application/pdf") {
      setAiError("Wgraj plik w formacie PDF.");
      return;
    }
    if (file.size > MAX_PDF_MB * 1024 * 1024) {
      setAiError(`Plik jest za duży — limit to ${MAX_PDF_MB} MB.`);
      return;
    }

    setAiFileName(file.name);
    setAiUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/kosztorys/analyze-pdf", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Analiza nie powiodła się.");
      }

      setAiSummary(data.summary ?? null);
      if (data.project_name && !projectName) {
        setProjectName(data.project_name);
      }
      setAiSuggestions(
        (data.items ?? []).map(
          (item: {
            name: string;
            unit: string;
            qty: number;
            knr_code: string | null;
            labor_rate: number;
            material_rate: number;
          }) => ({
            id: newId(),
            name: item.name,
            unit: item.unit,
            qty: item.qty,
            knrCode: item.knr_code,
            laborRate: item.labor_rate,
            materialRate: item.material_rate,
            selected: true,
          })
        )
      );
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Analiza nie powiodła się.");
    } finally {
      setAiUploading(false);
    }
  }

  function toggleSuggestion(id: string) {
    setAiSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  }

  function updateSuggestionField(
    id: string,
    field: "qty" | "laborRate" | "materialRate",
    value: number
  ) {
    setAiSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: Math.max(0, value) } : s))
    );
  }

  function addSelectedSuggestions() {
    const toAdd = aiSuggestions.filter((s) => s.selected);
    if (toAdd.length === 0) return;
    setItems((prev) => [
      ...prev,
      ...toAdd.map((s) => ({
        id: newId(),
        code: s.knrCode ?? "AI",
        name: s.name,
        unit: s.unit,
        qty: s.qty,
        laborRate: s.laborRate,
        materialRate: s.materialRate,
      })),
    ]);
    setAiSuggestions((prev) => prev.filter((s) => !s.selected));
  }

  function dismissAiResults() {
    setAiSuggestions([]);
    setAiSummary(null);
    setAiError(null);
    setAiFileName(null);
  }

  function handleCreateOffer() {
    const stages = items.map((item, idx) => ({
      stage_name: item.name,
      description: item.code,
      cost: item.qty * (item.laborRate + item.materialRate),
      order_index: idx,
      group_label: item.groupLabel?.trim() || null,
    }));
    localStorage.setItem(
      "matadora_kosztorys_draft",
      JSON.stringify({
        projectTitle: projectName,
        vatRate: Math.round(vatRate * 100),
        stages,
      })
    );
    router.push("/dashboard/contractor/offers/new");
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <HardHat className="h-5 w-5 text-white" />
            </div>
            <span>matadora</span>
            <span className="text-primary">.business</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Zaloguj się</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Zapisz kosztorys</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-slate-50">
        {/* HERO */}
        <section className="bg-gradient-to-r from-slate-900 to-primary py-10 text-white">
          <div className="container">
            <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
              <Zap className="h-3.5 w-3.5 text-yellow-400" />
              Kosztorys online zgodny z KNR — bezpłatnie, bez instalacji
            </div>
            <h1 className="text-3xl font-extrabold sm:text-4xl">
              Wycena kosztów remontu w kilka minut
            </h1>
            <p className="mt-2 text-white/70">
              Normy KNR, stawki SEKOCENBUD, eksport PDF — wszystko w przeglądarce.
              Dla generalnych wykonawców, architektów, zarządców nieruchomości
              i projektantów wnętrz — przygotuj wiarygodną wycenę dla klienta
              bez instalowania Norma PRO.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "Generalni wykonawcy",
                "Architekci",
                "Zarządcy nieruchomości",
                "Projektanci wnętrz",
              ].map((audience) => (
                <span
                  key={audience}
                  className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs text-white/80"
                >
                  {audience}
                </span>
              ))}
            </div>
          </div>
        </section>

        <div className="container py-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* MAIN KOSZTORYS */}
            <div className="lg:col-span-2 space-y-5">
              {/* AI PDF ANALYSIS */}
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Analiza AI z PDF
                    <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Nowość</Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Wgraj rzut architektoniczny, przedmiar robót lub istniejący kosztorys w PDF —
                    Claude AI wyodrębni pozycje robót z ilościami i zaproponuje kody KNR.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handlePdfSelected}
                  />

                  {!aiUploading && aiSuggestions.length === 0 && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setAiDragging(true);
                      }}
                      onDragLeave={() => setAiDragging(false)}
                      onDrop={handlePdfDrop}
                      role="button"
                      tabIndex={0}
                      className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 text-center transition-colors ${
                        aiDragging
                          ? "border-primary bg-primary/10"
                          : "border-primary/30 bg-white/60 hover:border-primary hover:bg-primary/5"
                      }`}
                    >
                      <Upload className="h-6 w-6 text-primary" />
                      <span className="text-sm font-medium">
                        Wgraj projekt PDF — kliknij lub przeciągnij plik tutaj{" "}
                        <span className="text-muted-foreground">(max {MAX_PDF_MB} MB)</span>
                      </span>
                    </div>
                  )}

                  {aiUploading && (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary/30 bg-white/60 py-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-sm font-medium">
                        Analizuję {aiFileName}…
                      </span>
                      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-primary/15">
                        <div className="h-full w-1/3 animate-ai-progress rounded-full bg-primary" />
                      </div>
                      <span className="text-xs text-muted-foreground">To może potrwać do minuty</span>
                    </div>
                  )}

                  {aiError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {aiError}
                    </div>
                  )}

                  {aiSummary && (
                    <div className="rounded-lg border border-primary/20 bg-white p-3 text-sm">
                      <p className="text-muted-foreground">{aiSummary}</p>
                    </div>
                  )}

                  {aiSuggestions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Znalezione pozycje ({aiSuggestions.length})
                        </p>
                        <button
                          onClick={dismissAiResults}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <X className="h-3 w-3" /> Wyczyść
                        </button>
                      </div>
                      <div className="max-h-96 space-y-1.5 overflow-y-auto">
                        {aiSuggestions.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-start gap-2 rounded-lg border bg-white p-2.5 text-sm hover:border-primary/40"
                          >
                            <input
                              type="checkbox"
                              checked={s.selected}
                              onChange={() => toggleSuggestion(s.id)}
                              className="mt-1.5 cursor-pointer"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {s.knrCode && (
                                  <Badge variant="outline" className="text-[10px] font-mono">
                                    {s.knrCode}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatPLN(s.laborRate + s.materialRate)}/{s.unit}
                                </span>
                              </div>
                              <p className="mt-0.5 font-medium">{s.name}</p>
                              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                                <div>
                                  <label className="text-[10px] text-muted-foreground">Ilość ({s.unit})</label>
                                  <Input
                                    type="number"
                                    value={s.qty}
                                    onChange={(e) => updateSuggestionField(s.id, "qty", Number(e.target.value))}
                                    className="mt-0.5 h-7 text-xs"
                                    min={0}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted-foreground">Robocizna</label>
                                  <Input
                                    type="number"
                                    value={s.laborRate}
                                    onChange={(e) => updateSuggestionField(s.id, "laborRate", Number(e.target.value))}
                                    className="mt-0.5 h-7 text-xs"
                                    min={0}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted-foreground">Materiał</label>
                                  <Input
                                    type="number"
                                    value={s.materialRate}
                                    onChange={(e) => updateSuggestionField(s.id, "materialRate", Number(e.target.value))}
                                    className="mt-0.5 h-7 text-xs"
                                    min={0}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        className="w-full gap-1"
                        onClick={addSelectedSuggestions}
                        disabled={!aiSuggestions.some((s) => s.selected)}
                      >
                        <Plus className="h-4 w-4" />
                        Dodaj zaznaczone do kosztorysu
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* PROJECT INFO */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Dane kosztorysu
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Nazwa inwestycji
                    </label>
                    <Input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="np. Remont mieszkania 60m² — Warszawa"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Zamawiający
                    </label>
                    <Input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="np. Jan Kowalski"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Stawka VAT
                    </label>
                    <select
                      value={vatRate}
                      onChange={(e) => setVatRate(Number(e.target.value))}
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    >
                      {VAT_RATES.map((v) => (
                        <option key={v.value} value={v.value}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* LINE ITEMS */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-primary" />
                      Pozycje kosztorysu
                    </CardTitle>
                    <Button
                      size="sm"
                      onClick={() => setShowCatalog(true)}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" /> Dodaj pozycję KNR
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground">
                      <Calculator className="mx-auto h-10 w-10 mb-3 opacity-30" />
                      <p>Brak pozycji. Dodaj pozycję z katalogu KNR.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {groupedItems.map((group) => {
                        const key = group.label ?? UNGROUPED_KEY;
                        const collapsed = collapsedGroups.has(key);
                        return (
                          <div key={key} className="space-y-3">
                            {hasSections && (
                              <button
                                type="button"
                                onClick={() => toggleGroupCollapsed(key)}
                                className="flex w-full items-center justify-between rounded-md bg-slate-100 px-3 py-2 text-left hover:bg-slate-200"
                              >
                                <span className="flex items-center gap-1.5 text-sm font-semibold">
                                  {collapsed ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronUp className="h-4 w-4" />
                                  )}
                                  {group.label ?? "Bez sekcji"}
                                </span>
                                <span className="text-sm font-semibold text-muted-foreground">
                                  {formatPLN(group.subtotal)}
                                </span>
                              </button>
                            )}
                            {!collapsed && (
                              <div className="space-y-3">
                                {group.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="rounded-lg border bg-white p-4"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Badge variant="outline" className="text-xs font-mono">
                                            {item.code}
                                          </Badge>
                                        </div>
                                        <p className="mt-1 text-sm font-medium">{item.name}</p>
                                      </div>
                                      <button
                                        onClick={() => removeItem(item.id)}
                                        className="text-muted-foreground hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                    <div className="mt-3">
                                      <label className="text-xs text-muted-foreground">Sekcja (opcjonalnie)</label>
                                      <Input
                                        value={item.groupLabel ?? ""}
                                        onChange={(e) => updateGroupLabel(item.id, e.target.value)}
                                        placeholder="np. Łazienka"
                                        className="mt-1 h-8 text-sm"
                                      />
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                      <div>
                                        <label className="text-xs text-muted-foreground">Ilość ({item.unit})</label>
                                        <Input
                                          type="number"
                                          value={item.qty}
                                          onChange={(e) => updateQty(item.id, Number(e.target.value))}
                                          className="mt-1 h-8 text-sm"
                                          min={0}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-muted-foreground">Robocizna (zł/{item.unit})</label>
                                        <Input
                                          type="number"
                                          value={item.laborRate}
                                          onChange={(e) => updateRate(item.id, "laborRate", Number(e.target.value))}
                                          className="mt-1 h-8 text-sm"
                                          min={0}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-muted-foreground">Materiał (zł/{item.unit})</label>
                                        <Input
                                          type="number"
                                          value={item.materialRate}
                                          onChange={(e) => updateRate(item.id, "materialRate", Number(e.target.value))}
                                          className="mt-1 h-8 text-sm"
                                          min={0}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-muted-foreground">Razem netto</label>
                                        <div className="mt-1 flex h-8 items-center rounded-md border bg-slate-50 px-2 text-sm font-semibold">
                                          {formatPLN(item.qty * (item.laborRate + item.materialRate))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* KNR CATALOG MODAL */}
              {showCatalog && (
                <Card className="border-primary shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Katalog KNR — wybierz pozycję</CardTitle>
                      <button
                        onClick={() => setShowCatalog(false)}
                        className="text-muted-foreground hover:text-foreground text-xl leading-none"
                      >
                        ×
                      </button>
                    </div>
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Szukaj pozycji KNR..."
                      className="mt-2"
                      autoFocus
                    />
                  </CardHeader>
                  <CardContent className="max-h-72 overflow-y-auto space-y-1">
                    {filtered.map((k) => (
                      <button
                        key={k.code}
                        onClick={() => addItem(k)}
                        className="w-full rounded-lg border p-3 text-left hover:bg-primary/5 hover:border-primary transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-muted-foreground">{k.code}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatPLN(k.laborRate + k.materialRate)}/{k.unit}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm font-medium">{k.name}</p>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* RIGHT PANEL: SUMMARY */}
            <div className="space-y-5">
              <Card className="sticky top-20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Podsumowanie</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Robocizna netto</span>
                    <span className="font-medium">{formatPLN(totals.labor)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Materiały netto</span>
                    <span className="font-medium">{formatPLN(totals.material)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-muted-foreground">Razem netto</span>
                    <span className="font-semibold">{formatPLN(net)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">VAT ({(vatRate * 100).toFixed(0)}%)</span>
                    <span>{formatPLN(vat)}</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-primary/10 p-3">
                    <span className="font-bold text-primary">RAZEM BRUTTO</span>
                    <span className="font-extrabold text-primary text-lg">{formatPLN(gross)}</span>
                  </div>

                  {items.length > 0 && submissionWarnings.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      <p className="mb-1 flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        Sprawdź przed wysłaniem
                      </p>
                      <ul className="list-disc space-y-0.5 pl-4">
                        {submissionWarnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2 space-y-2">
                    {items.length > 0 && (
                      <Button
                        className="w-full bg-primary"
                        onClick={handleCreateOffer}
                      >
                        Utwórz ofertę z tego kosztorysu
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      className="w-full"
                      variant={items.length > 0 ? "outline" : "default"}
                      onClick={() => setShowSaveModal(true)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Pobierz PDF
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/register">
                        Zapisz w chmurze →
                      </Link>
                    </Button>
                  </div>

                  {showSaveModal && (
                    <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-center">
                      <p className="text-sm font-semibold text-orange-800">
                        Eksport PDF — zarejestruj się bezpłatnie
                      </p>
                      <p className="mt-1 text-xs text-orange-700">
                        Aby pobrać PDF i zapisać kosztorys utwórz bezpłatne konto. Zajmuje 30 sekund.
                      </p>
                      <Button size="sm" className="mt-3 w-full" asChild>
                        <Link href="/register">
                          Utwórz konto — bezpłatnie <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* INFO CARD */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
                    <div className="text-xs text-blue-700">
                      <p className="font-semibold mb-1">⚠️ Stawki orientacyjne — nie są oficjalnymi danymi SEKOCENBUD</p>
                      <p>Podane stawki robocizny i materiałów to wartości <strong>szacunkowe</strong> (region centralny, Q1 2026).
                      Przed złożeniem oferty zaktualizuj je wg aktualnych danych SEKOCENBUD lub własnych kalkulacji.
                      Platforma nie ponosi odpowiedzialności za wyniki kosztorysów opartych na tych danych.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* UPSELL */}
              <Card className="border-orange-200 bg-orange-50/60">
                <CardContent className="p-4 space-y-3">
                  <p className="font-bold text-sm text-orange-900">Wyślij do klienta i zbierz podpis</p>
                  <p className="text-xs text-orange-700">
                    Pierwszy kosztorys <strong>bezpłatny</strong>.
                    Kolejne od <strong>149 zł / szt.</strong> — zamiast 900 zł u kosztorysanta.
                  </p>
                  <ul className="space-y-1.5">
                    {[
                      "E-mail do klienta z linkiem",
                      "Podpis elektroniczny (art. 60 KC)",
                      "Faktura KSeF po akceptacji",
                      "Śledzenie projektu",
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button size="sm" className="w-full bg-orange-500 hover:bg-orange-600" asChild>
                    <Link href="/register">Wyślij ten kosztorys →</Link>
                  </Button>
                  <p className="text-center text-xs text-orange-600">
                    <Link href="/pricing" className="underline">Zobacz pełny cennik</Link>
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} matadora.business ·{" "}
          <Link href="/" className="hover:text-foreground">Strona główna</Link>
          {" · "}
          <Link href="/przetargi" className="hover:text-foreground">Przetargi AI</Link>
          {" · "}
          <Link href="/o-nas" className="hover:text-foreground">O nas</Link>
          {" · "}
          <Link href="/regulamin" className="hover:text-foreground">Regulamin</Link>
          {" · "}
          <Link href="/polityka-prywatnosci" className="hover:text-foreground">Polityka prywatności</Link>
        </div>
      </footer>
    </div>
  );
}
