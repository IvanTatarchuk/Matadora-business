"use client";

import { useState, useTransition } from "react";
import {
  Plus, X, Wrench, AlertTriangle, CheckCircle2,
  Clock, Archive, Settings, ArrowRight,
} from "lucide-react";
import {
  createEquipment, updateEquipmentStatus,
  type Equipment, type EquipmentCategory, type EquipmentStatus,
} from "@/lib/actions/equipment";
import { EQUIPMENT_CATEGORY_LABELS } from "@/lib/constants/equipment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const STATUS_CONFIG: Record<EquipmentStatus, { label: string; color: string; icon: React.ElementType }> = {
  available:   { label: "Dostępny",   color: "bg-green-100 text-green-700",   icon: CheckCircle2 },
  in_use:      { label: "W użyciu",   color: "bg-blue-100 text-blue-700",     icon: Clock },
  maintenance: { label: "Serwis",     color: "bg-orange-100 text-orange-700", icon: Settings },
  retired:     { label: "Wycofany",   color: "bg-slate-100 text-slate-500",   icon: Archive },
};

import React from "react";

function fmt(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(n);
}

export function SprzętClient({ initialEquipment }: { initialEquipment: Equipment[] }) {
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<EquipmentStatus | "all">("all");
  const [filterCat, setFilterCat] = useState<EquipmentCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", category: "other" as EquipmentCategory,
    brand: "", model: "", serialNumber: "", year: "",
    purchasePrice: "", dailyRate: "", location: "",
    nextServiceDate: "", insuranceExpiry: "", notes: "",
  });

  const filtered = equipment.filter((e) => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase())
      || (e.brand ?? "").toLowerCase().includes(search.toLowerCase())
      || (e.model ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || e.status === filterStatus;
    const matchCat = filterCat === "all" || e.category === filterCat;
    return matchSearch && matchStatus && matchCat;
  });

  const serviceAlerts = equipment.filter((e) => {
    if (!e.next_service_date) return false;
    return Math.floor((new Date(e.next_service_date).getTime() - Date.now()) / 86400000) <= 14;
  });

  const totalValue = equipment.filter((e) => e.purchase_price).reduce((s, e) => s + (e.purchase_price ?? 0), 0);

  function handleCreate() {
    if (!form.name.trim()) { setError("Nazwa sprzętu jest wymagana"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createEquipment({
        name: form.name, category: form.category,
        brand: form.brand || undefined, model: form.model || undefined,
        serialNumber: form.serialNumber || undefined,
        year: form.year ? Number(form.year) : undefined,
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined,
        dailyRate: form.dailyRate ? Number(form.dailyRate) : undefined,
        location: form.location || undefined,
        nextServiceDate: form.nextServiceDate || undefined,
        insuranceExpiry: form.insuranceExpiry || undefined,
        notes: form.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newEq: Equipment = {
        id: res.id!, org_id: "", name: form.name, category: form.category,
        brand: form.brand || null, model: form.model || null,
        serial_number: form.serialNumber || null,
        year: form.year ? Number(form.year) : null,
        purchase_price: form.purchasePrice ? Number(form.purchasePrice) : null,
        daily_rate: form.dailyRate ? Number(form.dailyRate) : null,
        status: "available", location: form.location || null,
        next_service_date: form.nextServiceDate || null,
        insurance_expiry: form.insuranceExpiry || null,
        notes: form.notes || null,
        created_at: new Date().toISOString(),
      };
      setEquipment((prev) => [newEq, ...prev]);
      setShowForm(false);
      setForm({ name: "", category: "other", brand: "", model: "", serialNumber: "", year: "", purchasePrice: "", dailyRate: "", location: "", nextServiceDate: "", insuranceExpiry: "", notes: "" });
    });
  }

  function handleStatus(id: string, status: EquipmentStatus) {
    startTransition(async () => {
      await updateEquipmentStatus(id, status);
      setEquipment((prev) => prev.map((e) => e.id === id ? { ...e, status } : e));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Sprzęt i maszyny</h1>
          <p className="text-sm text-muted-foreground">Katalog sprzętu, statusy dostępności, przeglądy serwisowe</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-1 h-4 w-4" /> Dodaj sprzęt
        </Button>
      </div>

      {/* SERVICE ALERTS */}
      {serviceAlerts.length > 0 && (
        <div className="rounded-md bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Zbliżający się serwis (14 dni): <strong>{serviceAlerts.map((e) => e.name).join(", ")}</strong>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-4">
        {(["available","in_use","maintenance"] as EquipmentStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <Card key={s}><CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${cfg.color.split(" ")[1]}`} />
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
              </div>
              <p className="text-2xl font-bold mt-1">{equipment.filter((e) => e.status === s).length}</p>
            </CardContent></Card>
          );
        })}
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Wartość parku maszynowego</p>
          <p className="text-xl font-bold">{fmt(totalValue)}</p>
        </CardContent></Card>
      </div>

      {/* FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowy sprzęt / maszyna</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Nazwa *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="np. Koparka CAT 320, Rusztowanie ramowe" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Kategoria</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as EquipmentCategory })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(EQUIPMENT_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Marka</label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="np. Caterpillar, Layher" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Model</label>
                <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Nr seryjny</label>
                <Input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Rok produkcji</label>
                <Input type="number" min={1980} max={2030} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Wartość zakupu (PLN)</label>
                <Input type="number" min={0} value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Stawka dzienna (PLN)</label>
                <Input type="number" min={0} value={form.dailyRate} onChange={(e) => setForm({ ...form, dailyRate: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Lokalizacja / magazyn</label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="np. Magazyn Warszawa" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Następny przegląd serwisowy</label>
                <Input type="date" value={form.nextServiceDate} onChange={(e) => setForm({ ...form, nextServiceDate: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Ubezpieczenie / rejestracja — ważne do</label>
                <Input type="date" value={form.insuranceExpiry} onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Uwagi</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Zapisywanie..." : "Dodaj sprzęt"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FILTERS */}
      <div className="flex gap-3 flex-wrap">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Szukaj..." className="max-w-xs" />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as EquipmentStatus | "all")}
          className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="all">Wszystkie statusy</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value as EquipmentCategory | "all")}
          className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="all">Wszystkie kategorie</option>
          {Object.entries(EQUIPMENT_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* LIST */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Wrench className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Brak sprzętu</p>
            <p className="text-sm mt-1">Dodaj maszyny i narzędzia do katalogu</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((eq) => {
            const cfg = STATUS_CONFIG[eq.status];
            const StatusIcon = cfg.icon;
            const serviceDays = eq.next_service_date
              ? Math.floor((new Date(eq.next_service_date).getTime() - Date.now()) / 86400000)
              : null;
            return (
              <Card key={eq.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{eq.name}</p>
                      <p className="text-xs text-muted-foreground">{EQUIPMENT_CATEGORY_LABELS[eq.category]}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold shrink-0 ${cfg.color}`}>
                      <StatusIcon className="h-3 w-3" />{cfg.label}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {(eq.brand || eq.model) && <p>{[eq.brand, eq.model].filter(Boolean).join(" · ")}</p>}
                    {eq.year && <p>Rok: {eq.year}</p>}
                    {eq.serial_number && <p>S/N: {eq.serial_number}</p>}
                    {eq.location && <p>Lok.: {eq.location}</p>}
                    {eq.daily_rate && <p>Stawka: {fmt(eq.daily_rate)}/dzień</p>}
                    {eq.purchase_price && <p>Wartość: {fmt(eq.purchase_price)}</p>}
                    {serviceDays !== null && (
                      <p className={`font-medium ${serviceDays < 0 ? "text-red-600" : serviceDays <= 14 ? "text-orange-600" : "text-foreground"}`}>
                        {serviceDays < 0
                          ? `⚠ Serwis przeterminowany ${Math.abs(serviceDays)} dni temu`
                          : serviceDays <= 14
                          ? `⚠ Serwis za ${serviceDays} dni`
                          : `Serwis: ${new Date(eq.next_service_date!).toLocaleDateString("pl-PL")}`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 mt-3 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => window.location.href = `/dashboard/sprzet/${eq.id}`}
                    >
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                    {eq.status !== "available" && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleStatus(eq.id, "available")} disabled={pending}>
                        Dostępny
                      </Button>
                    )}
                    {eq.status !== "maintenance" && eq.status !== "retired" && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleStatus(eq.id, "maintenance")} disabled={pending}>
                        Serwis
                      </Button>
                    )}
                    {eq.status !== "retired" && (
                      <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={() => handleStatus(eq.id, "retired")} disabled={pending}>
                        Wycofaj
                      </Button>
                    )}
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
