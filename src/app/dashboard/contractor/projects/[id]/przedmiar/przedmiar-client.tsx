"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, X, FileSpreadsheet, Trash2, Edit2, Check,
  Lock, Unlock, ChevronDown, ChevronRight, Upload, Sparkles,
  Loader2,
} from "lucide-react";
import {
  createBoqDocument, addBoqItem, updateBoqItem, deleteBoqItem, updateBoqStatus, getBoqItems,
  type BoqDocument, type BoqItem, type BoqCategory, type BoqStatus,
} from "@/lib/actions/boq";
import { type PricebookItem } from "@/lib/actions/pricebook";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const CATEGORY_LABELS: Record<BoqCategory, string> = {
  labor: "Robocizna", materials: "Materiały", equipment: "Sprzęt", subcontract: "Podwykonawcy", other: "Inne",
};

const STATUS_CONFIG: Record<BoqStatus, { label: string; color: string }> = {
  draft:      { label: "Szkic",        color: "bg-slate-100 text-slate-600" },
  approved:   { label: "Zatwierdzone", color: "bg-green-100 text-green-700" },
  locked:     { label: "Zablokowane",  color: "bg-blue-100 text-blue-700" },
  superseded: { label: "Zastąpione",   color: "bg-orange-100 text-orange-600" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

type Props = {
  projectId: string;
  initialDocuments: BoqDocument[];
  initialItems: BoqItem[];
  pricebook: PricebookItem[];
};

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

export function PrzedmiarClient({ projectId, initialDocuments, initialItems, pricebook }: Props) {
  const [documents, setDocuments] = useState<BoqDocument[]>(initialDocuments);
  const [activeDocId, setActiveDocId] = useState<string | null>(initialDocuments[0]?.id ?? null);
  const [items, setItems] = useState<BoqItem[]>(initialItems);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const [showDocForm, setShowDocForm] = useState(initialDocuments.length === 0);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [docForm, setDocForm] = useState({ title: "", version: "1.0", description: "" });
  const [itemForm, setItemForm] = useState({
    positionNo: "", section: "", description: "", knrCode: "",
    category: "labor" as BoqCategory, unit: "m²",
    quantity: "", unitPrice: "", vatRate: "23",
    quantityFormula: "", notes: "", pricebookItemId: "",
  });

  // AI PDF Analysis
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiUploading, setAiUploading] = useState(false);
  const [aiDragging, setAiDragging] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiFileName, setAiFileName] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestedItem[]>([]);

  const activeDoc = documents.find((d) => d.id === activeDocId) ?? null;
  const isLocked = activeDoc?.status === "locked" || activeDoc?.status === "approved";

  // Group items by section
  const sections = Array.from(new Set(items.map((i) => i.section ?? "Bez działu"))).sort();
  const grouped = sections.reduce((acc, sec) => {
    acc[sec] = items.filter((i) => (i.section ?? "Bez działu") === sec);
    return acc;
  }, {} as Record<string, BoqItem[]>);

  const totalNet = items.reduce((s, i) => s + i.total_net, 0);
  const totalGross = items.reduce((s, i) => s + i.total_gross, 0);

  async function switchDocument(docId: string) {
    setActiveDocId(docId);
    startTransition(async () => {
      const newItems = await getBoqItems(docId);
      setItems(newItems);
    });
  }

  function handleCreateDoc() {
    if (!docForm.title.trim()) { setError("Tytuł jest wymagany"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createBoqDocument({ projectId, title: docForm.title, version: docForm.version, description: docForm.description || undefined });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newDoc: BoqDocument = {
        id: res.id!, project_id: projectId, org_id: "", created_by: null,
        title: docForm.title, description: docForm.description || null,
        version: docForm.version, status: "draft", currency: "PLN", notes: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setDocuments((prev) => [newDoc, ...prev]);
      setActiveDocId(newDoc.id);
      setItems([]);
      setShowDocForm(false);
      setDocForm({ title: "", version: "1.0", description: "" });
    });
  }

  function handlePricebookSelect(id: string) {
    const item = pricebook.find((p) => p.id === id);
    if (!item) return;
    setItemForm((f) => ({
      ...f, pricebookItemId: id,
      description: item.name, knrCode: item.knr_code ?? "",
      category: item.category as BoqCategory,
      unit: item.unit, unitPrice: String(item.unit_price),
      vatRate: String(item.vat_rate),
    }));
  }

  function handleAddItem() {
    if (!activeDocId) return;
    if (!itemForm.positionNo.trim() || !itemForm.description.trim() || !itemForm.quantity || !itemForm.unitPrice) {
      setError("Nr pozycji, opis, ilość i cena są wymagane"); return;
    }
    setError(null);
    startTransition(async () => {
      const res = await addBoqItem({
        documentId: activeDocId, projectId,
        positionNo: itemForm.positionNo, section: itemForm.section || undefined,
        description: itemForm.description, knrCode: itemForm.knrCode || undefined,
        category: itemForm.category, unit: itemForm.unit,
        quantity: Number(itemForm.quantity), unitPrice: Number(itemForm.unitPrice),
        vatRate: Number(itemForm.vatRate),
        quantityFormula: itemForm.quantityFormula || undefined,
        notes: itemForm.notes || undefined,
        pricebookItemId: itemForm.pricebookItemId || undefined,
        sortOrder: items.length,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const qty = Number(itemForm.quantity), price = Number(itemForm.unitPrice), vat = Number(itemForm.vatRate);
      const net = Math.round(qty * price * 100) / 100;
      const vatAmt = Math.round(net * vat / 100 * 100) / 100;
      const newItem: BoqItem = {
        id: res.id!, document_id: activeDocId, project_id: projectId, org_id: "", pricebook_item_id: itemForm.pricebookItemId || null,
        position_no: itemForm.positionNo, section: itemForm.section || null, subsection: null,
        description: itemForm.description, knr_code: itemForm.knrCode || null,
        category: itemForm.category, unit: itemForm.unit,
        quantity: qty, unit_price: price, vat_rate: vat,
        total_net: net, total_vat: vatAmt, total_gross: net + vatAmt,
        quantity_formula: itemForm.quantityFormula || null,
        sort_order: items.length, notes: itemForm.notes || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setItems((prev) => [...prev, newItem]);
      setShowItemForm(false);
      setItemForm({ positionNo: "", section: "", description: "", knrCode: "", category: "labor", unit: "m²", quantity: "", unitPrice: "", vatRate: "23", quantityFormula: "", notes: "", pricebookItemId: "" });
    });
  }

  function handleUpdateItem(id: string) {
    startTransition(async () => {
      const updates: Parameters<typeof updateBoqItem>[2] = {};
      if (editQty) updates.quantity = Number(editQty);
      if (editPrice) updates.unitPrice = Number(editPrice);
      await updateBoqItem(id, projectId, updates);
      setItems((prev) => prev.map((i) => {
        if (i.id !== id) return i;
        const qty = editQty ? Number(editQty) : i.quantity;
        const price = editPrice ? Number(editPrice) : i.unit_price;
        const net = Math.round(qty * price * 100) / 100;
        const vatAmt = Math.round(net * i.vat_rate / 100 * 100) / 100;
        return { ...i, quantity: qty, unit_price: price, total_net: net, total_vat: vatAmt, total_gross: net + vatAmt };
      }));
      setEditItemId(null); setEditQty(""); setEditPrice("");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteBoqItem(id, projectId);
      setItems((prev) => prev.filter((i) => i.id !== id));
    });
  }

  function handleStatusChange(status: BoqStatus) {
    if (!activeDocId) return;
    startTransition(async () => {
      await updateBoqStatus(activeDocId, projectId, status);
      setDocuments((prev) => prev.map((d) => d.id === activeDocId ? { ...d, status } : d));
    });
  }

  function toggleSection(sec: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sec)) next.delete(sec); else next.add(sec);
      return next;
    });
  }

  // AI PDF Analysis functions
  function handlePdfSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void processPdfFile(file);
  }

  function handlePdfDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setAiDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processPdfFile(file);
  }

  async function processPdfFile(file: File) {
    if (!activeDocId) {
      setError("Najpierw utwórz dokument przedmiaru");
      return;
    }
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
            id: `ai-${Date.now()}-${Math.random()}`,
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

  async function addSelectedSuggestions() {
    if (!activeDocId) return;
    const toAdd = aiSuggestions.filter((s) => s.selected);
    if (toAdd.length === 0) return;

    setError(null);
    for (const s of toAdd) {
      const res = await addBoqItem({
        documentId: activeDocId, projectId,
        positionNo: String(items.length + 1), section: "AI Import",
        description: s.name, knrCode: s.knrCode || undefined,
        category: "materials", unit: s.unit,
        quantity: s.qty, unitPrice: s.laborRate + s.materialRate,
        vatRate: 23,
        notes: "Importowane z AI PDF",
        sortOrder: items.length,
      });
      if (!res.ok) {
        setError(`Błąd przy dodawaniu "${s.name}": ${res.error}`);
        return null;
      }
      const qty = s.qty, price = s.laborRate + s.materialRate, vat = 23;
      const net = Math.round(qty * price * 100) / 100;
      const vatAmt = Math.round(net * vat / 100 * 100) / 100;
      const newItem: BoqItem = {
        id: res.id!, document_id: activeDocId, project_id: projectId, org_id: "", pricebook_item_id: null,
        position_no: String(items.length + 1), section: "AI Import", subsection: null,
        description: s.name, knr_code: s.knrCode || null,
        category: "materials", unit: s.unit,
        quantity: qty, unit_price: price, vat_rate: vat,
        total_net: net, total_vat: vatAmt, total_gross: net + vatAmt,
        quantity_formula: null, sort_order: items.length, notes: "Importowane z AI PDF",
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setItems((prev) => [...prev, newItem]);
    }
    setAiSuggestions([]);
    setAiSummary(null);
    setAiFileName(null);
  }

  function dismissAiResults() {
    setAiSuggestions([]);
    setAiSummary(null);
    setAiError(null);
    setAiFileName(null);
  }

  return (
    <div className="space-y-5">
      {/* AI PDF ANALYSIS CARD */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Analiza AI z PDF
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Wgraj przedmiar robót lub projekt w PDF — AI wyodrębni pozycje i doda je do dokumentu.
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
              onDragOver={(e) => { e.preventDefault(); setAiDragging(true); }}
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
                Wgraj PDF przedmiaru — kliknij lub przeciągnij plik
                <span className="text-muted-foreground"> (max {MAX_PDF_MB} MB)</span>
              </span>
            </div>
          )}

          {aiUploading && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary/30 bg-white/60 py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm font-medium">Analizuję {aiFileName}…</span>
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
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
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
                          <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                            {s.knrCode}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {fmt(s.laborRate + s.materialRate)}/{s.unit}
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
                Dodaj zaznaczone do przedmiaru
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Przedmiar robót</h1>
          <p className="text-sm text-muted-foreground">Bill of Quantities z normami KNR — wzorowany na Norma PRO i eKosztorysowanie</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowDocForm(true)}><Plus className="mr-1 h-3.5 w-3.5" />Nowy dokument</Button>
      </div>

      {/* DOC TABS */}
      {documents.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {documents.map((d) => (
            <button key={d.id} onClick={() => switchDocument(d.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${activeDocId === d.id ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
              {d.title} <span className="ml-1 text-xs opacity-70">v{d.version}</span>
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${STATUS_CONFIG[d.status].color}`}>{STATUS_CONFIG[d.status].label}</span>
            </button>
          ))}
        </div>
      )}

      {/* NEW DOC FORM */}
      {showDocForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowy dokument przedmiarowy</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowDocForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2"><label className="text-sm font-medium">Tytuł *</label>
              <Input value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} placeholder="np. Przedmiar robót budowlanych — etap I" className="mt-1" /></div>
            <div><label className="text-sm font-medium">Wersja</label>
              <Input value={docForm.version} onChange={(e) => setDocForm({ ...docForm, version: e.target.value })} placeholder="1.0" className="mt-1" /></div>
            {error && <p className="sm:col-span-3 text-sm text-destructive">{error}</p>}
            <div className="sm:col-span-3 flex gap-2">
              <Button onClick={handleCreateDoc} disabled={pending}>{pending ? "Tworzenie..." : "Utwórz dokument"}</Button>
              <Button variant="outline" onClick={() => { setShowDocForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ACTIVE DOC */}
      {activeDoc && (
        <>
          {/* SUMMARY KPIs */}
          <div className="grid gap-3 sm:grid-cols-4">
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Pozycji</p><p className="text-xl font-bold">{items.length}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Działów</p><p className="text-xl font-bold">{sections.length}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Razem netto</p><p className="text-xl font-bold">{fmt(totalNet)} PLN</p></CardContent></Card>
            <Card className="border-primary/30"><CardContent className="p-3"><p className="text-xs text-muted-foreground">Razem brutto</p><p className="text-xl font-bold text-primary">{fmt(totalGross)} PLN</p></CardContent></Card>
          </div>

          {/* ACTIONS BAR */}
          <div className="flex gap-2 flex-wrap">
            {!isLocked && (
              <Button size="sm" onClick={() => setShowItemForm(true)}><Plus className="mr-1 h-3.5 w-3.5" />Dodaj pozycję</Button>
            )}
            {activeDoc.status === "draft" && (
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("approved")} disabled={pending}>
                <Check className="mr-1 h-3.5 w-3.5" />Zatwierdź
              </Button>
            )}
            {activeDoc.status === "approved" && (
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("locked")} disabled={pending}>
                <Lock className="mr-1 h-3.5 w-3.5" />Zablokuj
              </Button>
            )}
            {activeDoc.status === "locked" && (
              <Button size="sm" variant="outline" onClick={() => handleStatusChange("draft")} disabled={pending}>
                <Unlock className="mr-1 h-3.5 w-3.5" />Odblokuj
              </Button>
            )}
          </div>

          {/* ADD ITEM FORM */}
          {showItemForm && !isLocked && (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Nowa pozycja przedmiarowa</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => { setShowItemForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Wybór z cennika */}
                {pricebook.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Wybierz z cennika (opcjonalne)</label>
                    <select className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={itemForm.pricebookItemId} onChange={(e) => handlePricebookSelect(e.target.value)}>
                      <option value="">— Wybierz pozycję z cennika —</option>
                      {pricebook.map((p) => (
                        <option key={p.id} value={p.id}>[{p.code ?? "—"}] {p.name} ({p.unit_price} PLN/{p.unit})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-4">
                  <div><label className="text-sm font-medium">Nr pozycji *</label>
                    <Input value={itemForm.positionNo} onChange={(e) => setItemForm({ ...itemForm, positionNo: e.target.value })} placeholder="1.1" className="mt-1" /></div>
                  <div><label className="text-sm font-medium">Dział</label>
                    <Input value={itemForm.section} onChange={(e) => setItemForm({ ...itemForm, section: e.target.value })} placeholder="ROBOTY ZIEMNE" className="mt-1" /></div>
                  <div className="sm:col-span-2"><label className="text-sm font-medium">Kod KNR</label>
                    <Input value={itemForm.knrCode} onChange={(e) => setItemForm({ ...itemForm, knrCode: e.target.value })} placeholder="KNR 2-02 0101-00" className="mt-1" /></div>
                  <div className="sm:col-span-4"><label className="text-sm font-medium">Opis roboty *</label>
                    <Input value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} placeholder="np. Wykop mechaniczny kat. gruntu III" className="mt-1" /></div>
                  <div><label className="text-sm font-medium">Kategoria</label>
                    <select value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value as BoqCategory })}
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select></div>
                  <div><label className="text-sm font-medium">JM</label>
                    <Input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} placeholder="m³, m², szt." className="mt-1" /></div>
                  <div><label className="text-sm font-medium">Ilość *</label>
                    <Input type="number" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} step="0.0001" className="mt-1" /></div>
                  <div><label className="text-sm font-medium">Cena jedn. netto *</label>
                    <Input type="number" value={itemForm.unitPrice} onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })} step="0.01" className="mt-1" /></div>
                  <div><label className="text-sm font-medium">VAT (%)</label>
                    <select value={itemForm.vatRate} onChange={(e) => setItemForm({ ...itemForm, vatRate: e.target.value })}
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                      {[0, 5, 8, 23].map((r) => <option key={r} value={r}>{r}%</option>)}
                    </select></div>
                  <div className="sm:col-span-3"><label className="text-sm font-medium">Obmiar (wzór)</label>
                    <Input value={itemForm.quantityFormula} onChange={(e) => setItemForm({ ...itemForm, quantityFormula: e.target.value })} placeholder="np. 3.5*12.0*2 = 84.00" className="mt-1" /></div>
                  {/* Live calc */}
                  {itemForm.quantity && itemForm.unitPrice && (
                    <div className="sm:col-span-4 bg-muted/40 rounded-md p-3 text-sm grid grid-cols-3 gap-2">
                      <div><p className="text-xs text-muted-foreground">Netto</p><p className="font-bold">{fmt(Number(itemForm.quantity) * Number(itemForm.unitPrice))} PLN</p></div>
                      <div><p className="text-xs text-muted-foreground">VAT</p><p className="font-bold">{fmt(Number(itemForm.quantity) * Number(itemForm.unitPrice) * Number(itemForm.vatRate) / 100)} PLN</p></div>
                      <div><p className="text-xs text-muted-foreground">Brutto</p><p className="font-bold text-primary">{fmt(Number(itemForm.quantity) * Number(itemForm.unitPrice) * (1 + Number(itemForm.vatRate) / 100))} PLN</p></div>
                    </div>
                  )}
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button onClick={handleAddItem} disabled={pending}>{pending ? "Dodawanie..." : "Dodaj pozycję"}</Button>
                  <Button variant="outline" onClick={() => { setShowItemForm(false); setError(null); }}>Anuluj</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ITEMS TABLE */}
          {items.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-10 text-center text-muted-foreground">
              <FileSpreadsheet className="mx-auto h-12 w-12 opacity-20 mb-3" />
              <p className="font-medium">Brak pozycji przedmiarowych</p>
              <p className="text-sm mt-1">Dodaj pierwszą pozycję lub wybierz z cennika KNR</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {sections.map((sec) => {
                const secItems = grouped[sec] ?? [];
                const secNet = secItems.reduce((s, i) => s + i.total_net, 0);
                const collapsed = collapsedSections.has(sec);
                return (
                  <div key={sec}>
                    <button className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 text-left"
                      onClick={() => toggleSection(sec)}>
                      {collapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-semibold text-sm uppercase tracking-wide">{sec}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{secItems.length} poz. · netto: {fmt(secNet)} PLN</span>
                    </button>
                    {!collapsed && (
                      <div className="rounded-lg border overflow-x-auto mt-1">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/40">
                            <tr>
                              <th className="text-left px-2 py-1.5 w-14">Nr</th>
                              <th className="text-left px-2 py-1.5">Opis / KNR</th>
                              <th className="text-left px-2 py-1.5 w-16">JM</th>
                              <th className="text-right px-2 py-1.5 w-20">Ilość</th>
                              <th className="text-right px-2 py-1.5 w-24">Cena jedn.</th>
                              <th className="text-right px-2 py-1.5 w-24">Netto</th>
                              <th className="text-right px-2 py-1.5 w-24">Brutto</th>
                              {!isLocked && <th className="w-14 px-2 py-1.5"></th>}
                            </tr>
                          </thead>
                          <tbody>
                            {secItems.map((item) => (
                              <tr key={item.id} className="border-t hover:bg-muted/20">
                                <td className="px-2 py-1.5 font-mono font-semibold">{item.position_no}</td>
                                <td className="px-2 py-1.5">
                                  <p className="font-medium">{item.description}</p>
                                  {item.knr_code && <p className="text-muted-foreground font-mono">{item.knr_code}</p>}
                                  {item.quantity_formula && <p className="text-muted-foreground italic">{item.quantity_formula}</p>}
                                </td>
                                <td className="px-2 py-1.5 text-muted-foreground">{item.unit}</td>
                                <td className="px-2 py-1.5 text-right font-mono">
                                  {editItemId === item.id ? (
                                    <Input type="number" value={editQty} onChange={(e) => setEditQty(e.target.value)} className="h-6 w-20 text-xs text-right" step="0.0001" />
                                  ) : (
                                    <span onClick={() => { setEditItemId(item.id); setEditQty(String(item.quantity)); setEditPrice(String(item.unit_price)); }} className="cursor-pointer hover:underline">
                                      {fmt(item.quantity)}
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-1.5 text-right font-mono">
                                  {editItemId === item.id ? (
                                    <Input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="h-6 w-24 text-xs text-right" step="0.01" />
                                  ) : (
                                    <span onClick={() => { setEditItemId(item.id); setEditQty(String(item.quantity)); setEditPrice(String(item.unit_price)); }} className="cursor-pointer hover:underline">
                                      {fmt(item.unit_price)}
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-1.5 text-right font-mono">{fmt(item.total_net)}</td>
                                <td className="px-2 py-1.5 text-right font-mono font-medium">{fmt(item.total_gross)}</td>
                                {!isLocked && (
                                  <td className="px-2 py-1.5">
                                    <div className="flex gap-1">
                                      {editItemId === item.id ? (
                                        <>
                                          <button onClick={() => handleUpdateItem(item.id)} disabled={pending}><Check className="h-3.5 w-3.5 text-green-600" /></button>
                                          <button onClick={() => { setEditItemId(null); setEditQty(""); setEditPrice(""); }}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
                                        </>
                                      ) : (
                                        <>
                                          <button onClick={() => { setEditItemId(item.id); setEditQty(String(item.quantity)); setEditPrice(String(item.unit_price)); }}><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                                          <button onClick={() => handleDelete(item.id)} disabled={pending}><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                            {/* Section subtotal */}
                            <tr className="border-t bg-muted/20 font-semibold">
                              <td colSpan={5} className="px-2 py-1 text-xs text-right text-muted-foreground">Razem {sec}:</td>
                              <td className="px-2 py-1 text-right text-xs font-mono">{fmt(secNet)}</td>
                              <td className="px-2 py-1 text-right text-xs font-mono">{fmt(secItems.reduce((s, i) => s + i.total_gross, 0))}</td>
                              {!isLocked && <td />}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* GRAND TOTAL */}
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="p-4 grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-xs text-muted-foreground">Razem netto</p><p className="text-lg font-bold">{fmt(totalNet)} PLN</p></div>
                  <div><p className="text-xs text-muted-foreground">VAT</p><p className="text-lg font-bold">{fmt(items.reduce((s, i) => s + i.total_vat, 0))} PLN</p></div>
                  <div><p className="text-xs text-muted-foreground">Razem brutto</p><p className="text-lg font-bold text-primary">{fmt(totalGross)} PLN</p></div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {documents.length === 0 && !showDocForm && (
        <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
          <FileSpreadsheet className="mx-auto h-12 w-12 opacity-20 mb-3" />
          <p className="font-medium">Brak dokumentów przedmiarowych</p>
          <p className="text-sm mt-1">Utwórz pierwszy przedmiar robót dla tego projektu</p>
          <Button className="mt-4" onClick={() => setShowDocForm(true)}><Plus className="mr-1 h-4 w-4" />Nowy przedmiar</Button>
        </CardContent></Card>
      )}
    </div>
  );
}
