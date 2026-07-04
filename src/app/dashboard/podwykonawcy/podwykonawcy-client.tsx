"use client";

import { useState, useTransition } from "react";
import {
  Plus, X, HardHat, Star, Phone, Mail, Globe,
  Building2, CheckCircle2, XCircle, AlertCircle, Trash2, ArrowRight,
} from "lucide-react";
import {
  createSubcontractor, rateSubcontractor,
  type Subcontractor, type SubSpecialty,
} from "@/lib/actions/subcontractors";
import { SPECIALTY_LABELS } from "@/lib/constants/subcontractors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const STATUS_CONFIG = {
  active:      { label: "Aktywny",     color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  inactive:    { label: "Nieaktywny",  color: "bg-slate-100 text-slate-500", icon: XCircle },
  blacklisted: { label: "Zablokowany", color: "bg-red-100 text-red-700",     icon: AlertCircle },
};

function StarRating({ rating, onRate }: { rating: number | null; onRate: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <button key={s} onClick={() => onRate(s)}
          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}>
          <Star className={`h-4 w-4 transition-colors ${(hover || (rating ?? 0)) >= s ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
        </button>
      ))}
      {rating && <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>}
    </div>
  );
}

export function PodwykonawcyClient({ initialSubcontractors }: { initialSubcontractors: Subcontractor[] }) {
  const [subs, setSubs] = useState<Subcontractor[]>(initialSubcontractors);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterSpecialty, setFilterSpecialty] = useState<SubSpecialty | "all">("all");
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", nip: "", regon: "", address: "", city: "", postalCode: "",
    contactName: "", contactEmail: "", contactPhone: "", website: "",
    specialty: "general" as SubSpecialty, insuranceExpiry: "", licenseNumber: "", notes: "",
  });

  const filtered = subs.filter((s) => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase())
      || (s.city ?? "").toLowerCase().includes(search.toLowerCase())
      || (s.contact_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchSpec = filterSpecialty === "all" || s.specialty === filterSpecialty;
    return matchSearch && matchSpec;
  });

  const selected = subs.find((s) => s.id === selectedId);

  function handleCreate() {
    if (!form.name.trim()) { setError("Nazwa firmy jest wymagana"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createSubcontractor({
        name: form.name, nip: form.nip || undefined, regon: form.regon || undefined,
        address: form.address || undefined, city: form.city || undefined,
        postalCode: form.postalCode || undefined, contactName: form.contactName || undefined,
        contactEmail: form.contactEmail || undefined, contactPhone: form.contactPhone || undefined,
        website: form.website || undefined, specialty: form.specialty,
        insuranceExpiry: form.insuranceExpiry || undefined,
        licenseNumber: form.licenseNumber || undefined, notes: form.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newSub: Subcontractor = {
        id: res.id!, org_id: "", name: form.name, nip: form.nip || null,
        regon: form.regon || null, address: form.address || null, city: form.city || null,
        postal_code: form.postalCode || null, contact_name: form.contactName || null,
        contact_email: form.contactEmail || null, contact_phone: form.contactPhone || null,
        website: form.website || null, specialty: form.specialty, rating: null,
        status: "active", notes: form.notes || null,
        insurance_expiry: form.insuranceExpiry || null,
        license_number: form.licenseNumber || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        contracts_count: 0,
      };
      setSubs((prev) => [newSub, ...prev]);
      setShowForm(false);
      setForm({ name: "", nip: "", regon: "", address: "", city: "", postalCode: "", contactName: "", contactEmail: "", contactPhone: "", website: "", specialty: "general", insuranceExpiry: "", licenseNumber: "", notes: "" });
    });
  }

  function handleRate(id: string, rating: number) {
    startTransition(async () => {
      await rateSubcontractor(id, rating);
      setSubs((prev) => prev.map((s) => s.id === id ? { ...s, rating } : s));
    });
  }

  const insuranceExpiring = subs.filter((s) => {
    if (!s.insurance_expiry) return false;
    const days = Math.floor((new Date(s.insurance_expiry).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 30;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Podwykonawcy</h1>
          <p className="text-sm text-muted-foreground">Katalog firm i podwykonawców — oceny, kontakty, ubezpieczenia</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-1 h-4 w-4" /> Dodaj podwykonawcę
        </Button>
      </div>

      {/* ALERTS */}
      {insuranceExpiring.length > 0 && (
        <div className="rounded-md bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {insuranceExpiring.length} podwykonawca(-ów) ma wygasające ubezpieczenie w ciągu 30 dni:
          <strong>{insuranceExpiring.map((s) => s.name).join(", ")}</strong>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Łącznie</p><p className="text-2xl font-bold">{subs.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Aktywni</p><p className="text-2xl font-bold text-green-600">{subs.filter((s) => s.status === "active").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Śr. ocena</p><p className="text-2xl font-bold text-yellow-600">
          {subs.filter((s) => s.rating).length > 0
            ? (subs.filter((s) => s.rating).reduce((sum, s) => sum + (s.rating ?? 0), 0) / subs.filter((s) => s.rating).length).toFixed(1)
            : "—"}
        </p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Wygasające ubezp.</p><p className="text-2xl font-bold text-orange-600">{insuranceExpiring.length}</p></CardContent></Card>
      </div>

      {/* FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowy podwykonawca</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="text-sm font-medium">Nazwa firmy *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Kowalski Elektro Sp. z o.o." className="mt-1" /></div>
              <div><label className="text-sm font-medium">Specjalizacja</label>
                <select value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value as SubSpecialty })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(SPECIALTY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-sm font-medium">NIP</label>
                <Input value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} placeholder="000-000-00-00" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Osoba kontaktowa</label>
                <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Telefon</label>
                <Input type="tel" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Email</label>
                <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Miasto</label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Ubezpieczenie OC — ważne do</label>
                <Input type="date" value={form.insuranceExpiry} onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Nr licencji / uprawnień</label>
                <Input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} className="mt-1" /></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Uwagi</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" /></div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Zapisywanie..." : "Dodaj podwykonawcę"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEARCH + FILTER */}
      <div className="flex gap-3 flex-wrap">
        <Input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj po nazwie, mieście..." className="max-w-xs" />
        <select value={filterSpecialty} onChange={(e) => setFilterSpecialty(e.target.value as SubSpecialty | "all")}
          className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="all">Wszystkie specjalizacje</option>
          {Object.entries(SPECIALTY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* LIST */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <HardHat className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Brak podwykonawców</p>
            <p className="text-sm mt-1">Dodaj firmy wykonujące prace na Twoich projektach</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((sub) => {
            const statusCfg = STATUS_CONFIG[sub.status];
            const StatusIcon = statusCfg.icon;
            const isSelected = selectedId === sub.id;
            const insuranceDays = sub.insurance_expiry
              ? Math.floor((new Date(sub.insurance_expiry).getTime() - Date.now()) / 86400000)
              : null;
            return (
              <Card key={sub.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${isSelected ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelectedId(isSelected ? null : sub.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{sub.name}</p>
                      <p className="text-xs text-muted-foreground">{SPECIALTY_LABELS[sub.specialty]}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${statusCfg.color}`}>
                      <StatusIcon className="h-3 w-3" />{statusCfg.label}
                    </span>
                  </div>
                  <StarRating rating={sub.rating} onRate={(r) => handleRate(sub.id, r)} />
                  <div className="flex gap-1 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/dashboard/podwykonawcy/${sub.id}`;
                      }}
                    >
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    {sub.city && <p className="flex items-center gap-1"><Building2 className="h-3 w-3" />{sub.city}</p>}
                    {sub.contact_name && <p>{sub.contact_name}</p>}
                    {sub.contact_phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{sub.contact_phone}</p>}
                    {sub.contact_email && <p className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{sub.contact_email}</p>}
                    {sub.website && <p className="flex items-center gap-1 truncate"><Globe className="h-3 w-3" />{sub.website}</p>}
                    {sub.nip && <p>NIP: {sub.nip}</p>}
                    {insuranceDays !== null && insuranceDays <= 30 && (
                      <p className={`flex items-center gap-1 font-medium ${insuranceDays < 0 ? "text-red-600" : "text-orange-600"}`}>
                        <AlertCircle className="h-3 w-3" />
                        {insuranceDays < 0 ? `Ubezp. wygasło ${Math.abs(insuranceDays)} dni temu` : `Ubezp. wygasa za ${insuranceDays} dni`}
                      </p>
                    )}
                    {sub.insurance_expiry && insuranceDays !== null && insuranceDays > 30 && (
                      <p>Ubezp. OC: {new Date(sub.insurance_expiry).toLocaleDateString("pl-PL")}</p>
                    )}
                    {sub.contracts_count !== undefined && sub.contracts_count > 0 && (
                      <p className="font-medium text-foreground">{sub.contracts_count} {sub.contracts_count === 1 ? "umowa" : "umowy"}</p>
                    )}
                  </div>
                  {sub.notes && (
                    <p className="mt-2 text-xs text-muted-foreground border-l-2 border-muted pl-2 line-clamp-2">{sub.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
