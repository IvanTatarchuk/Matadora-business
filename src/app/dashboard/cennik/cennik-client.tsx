"use client";

import { useState, useTransition } from "react";
import { Plus, X, Search, Edit2, Check, Trash2, BookOpen } from "lucide-react";
import {
  createPricebookItem, updatePricebookItem, deletePricebookItem,
  type PricebookItem, type PricebookCategory,
} from "@/lib/actions/pricebook";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const CATEGORY_CONFIG: Record<PricebookCategory, { label: string; color: string }> = {
  labor:       { label: "Robocizna",    color: "bg-blue-100 text-blue-700" },
  materials:   { label: "Materiały",    color: "bg-green-100 text-green-700" },
  equipment:   { label: "Sprzęt",       color: "bg-purple-100 text-purple-700" },
  subcontract: { label: "Podwykonawcy", color: "bg-orange-100 text-orange-700" },
  service:     { label: "Usługi",       color: "bg-teal-100 text-teal-700" },
  other:       { label: "Inne",         color: "bg-slate-100 text-slate-500" },
};

const VAT_RATES = [0, 5, 8, 23];

function fmt(n: number, unit: string) {
  return `${new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} PLN/${unit}`;
}

export function CennikClient({ initialItems }: { initialItems: PricebookItem[] }) {
  const [items, setItems] = useState<PricebookItem[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<PricebookCategory | "all">("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: "", name: "", description: "", category: "labor" as PricebookCategory,
    unit: "szt.", unitPrice: "", vatRate: "23", knrCode: "", knrDescription: "", notes: "",
  });

  const filtered = items.filter((i) => {
    if (filterCat !== "all" && i.category !== filterCat) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())
      && !(i.code ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = (Object.keys(CATEGORY_CONFIG) as PricebookCategory[]).reduce((acc, cat) => {
    acc[cat] = filtered.filter((i) => i.category === cat);
    return acc;
  }, {} as Record<PricebookCategory, PricebookItem[]>);

  function handleCreate() {
    if (!form.name.trim() || !form.unitPrice) { setError("Nazwa i cena są wymagane"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createPricebookItem({
        code: form.code || undefined, name: form.name, description: form.description || undefined,
        category: form.category, unit: form.unit, unitPrice: Number(form.unitPrice),
        vatRate: Number(form.vatRate),
        knrCode: form.knrCode || undefined, knrDescription: form.knrDescription || undefined,
        notes: form.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newItem: PricebookItem = {
        id: res.id!, org_id: "", created_by: null,
        code: form.code || null, name: form.name,
        description: form.description || null, category: form.category,
        unit: form.unit, unit_price: Number(form.unitPrice),
        currency: "PLN", vat_rate: Number(form.vatRate),
        knr_code: form.knrCode || null, knr_description: form.knrDescription || null,
        is_active: true, tags: [], notes: form.notes || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setItems((prev) => [newItem, ...prev]);
      setShowForm(false);
      setForm({ code: "", name: "", description: "", category: "labor", unit: "szt.", unitPrice: "", vatRate: "23", knrCode: "", knrDescription: "", notes: "" });
    });
  }

  function handleUpdatePrice(id: string) {
    if (!editPrice) return;
    startTransition(async () => {
      await updatePricebookItem(id, { unitPrice: Number(editPrice) });
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, unit_price: Number(editPrice) } : i));
      setEditId(null); setEditPrice("");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deletePricebookItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" />Cennik usług i materiałów</h1>
          <p className="text-sm text-muted-foreground">Pricebook — baza cen jednostkowych z normami KNR. Używany w kosztorysach i Job Costing.</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-1 h-4 w-4" />Dodaj pozycję</Button>
      </div>

      {/* STATS */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Łącznie pozycji</p><p className="text-2xl font-bold">{items.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Kategorie</p><p className="text-2xl font-bold">{Object.values(grouped).filter((v) => v.length > 0).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Z kodami KNR</p><p className="text-2xl font-bold">{items.filter((i) => i.knr_code).length}</p></CardContent></Card>
      </div>

      {/* FILTERS */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Szukaj nazwy lub kodu..." className="pl-9" />
        </div>
        <div className="flex rounded-md border overflow-hidden text-sm">
          <button onClick={() => setFilterCat("all")} className={`px-3 py-1.5 ${filterCat === "all" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>Wszystkie</button>
          {(Object.entries(CATEGORY_CONFIG) as [PricebookCategory, { label: string; color: string }][]).map(([k, v]) => (
            <button key={k} onClick={() => setFilterCat(k)}
              className={`px-3 py-1.5 ${filterCat === k ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>{v.label}</button>
          ))}
        </div>
      </div>

      {/* CREATE FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowa pozycja cennika</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className="text-sm font-medium">Kod</label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="np. R01, M-15" className="mt-1" /></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Nazwa *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="np. Murarstwo – 1m² ściany 25cm" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Kategoria</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as PricebookCategory })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select></div>
              <div><label className="text-sm font-medium">JM</label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="np. m², t, szt., rb-g" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Cena jedn. netto (PLN) *</label>
                <Input type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} step="0.01" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Stawka VAT (%)</label>
                <select value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {VAT_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Kod KNR/KNNR</label>
                <Input value={form.knrCode} onChange={(e) => setForm({ ...form, knrCode: e.target.value })} placeholder="np. KNR 2-02 0101-00" className="mt-1" /></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Opis KNR</label>
                <Input value={form.knrDescription} onChange={(e) => setForm({ ...form, knrDescription: e.target.value })} className="mt-1" /></div>
              <div className="sm:col-span-3"><label className="text-sm font-medium">Opis pozycji</label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Dodawanie..." : "Dodaj do cennika"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ITEMS GROUPED BY CATEGORY */}
      {filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
          <BookOpen className="mx-auto h-12 w-12 opacity-20 mb-3" />
          <p className="font-medium">Brak pozycji cennika</p>
          <p className="text-sm mt-1">Dodaj ceny jednostkowe, aby używać ich w kosztorysach i Job Costing</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {(Object.entries(grouped) as [PricebookCategory, PricebookItem[]][])
            .filter(([, v]) => v.length > 0)
            .map(([cat, catItems]) => (
              <div key={cat}>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${CATEGORY_CONFIG[cat].color}`}>{CATEGORY_CONFIG[cat].label}</span>
                  <span className="text-muted-foreground">({catItems.length})</span>
                </h3>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-20">Kod</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Nazwa</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden md:table-cell">KNR</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Cena netto</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">VAT</th>
                        <th className="px-3 py-2 w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {catItems.map((item) => (
                        <tr key={item.id} className="border-t hover:bg-muted/20">
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{item.code ?? "—"}</td>
                          <td className="px-3 py-2">
                            <p className="font-medium">{item.name}</p>
                            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                          </td>
                          <td className="px-3 py-2 hidden md:table-cell text-xs text-muted-foreground">{item.knr_code ?? "—"}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            {editId === item.id ? (
                              <div className="flex items-center gap-1 justify-end">
                                <Input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                                  className="h-6 w-24 text-xs" step="0.01" />
                                <button onClick={() => handleUpdatePrice(item.id)} disabled={pending}><Check className="h-3.5 w-3.5 text-green-600" /></button>
                                <button onClick={() => setEditId(null)}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
                              </div>
                            ) : (
                              <span className="cursor-pointer hover:underline" onClick={() => { setEditId(item.id); setEditPrice(String(item.unit_price)); }}>
                                {fmt(item.unit_price, item.unit)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-xs text-muted-foreground">{item.vat_rate}%</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1.5 justify-end">
                              <button onClick={() => { setEditId(item.id); setEditPrice(String(item.unit_price)); }}>
                                <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              </button>
                              <button onClick={() => handleDelete(item.id)} disabled={pending}>
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
