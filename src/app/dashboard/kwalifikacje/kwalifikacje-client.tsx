"use client";

import { useState, useTransition } from "react";
import { Plus, X, AlertTriangle, CheckCircle2, XCircle, GraduationCap, Trash2 } from "lucide-react";
import {
  createCertification, deleteCertification,
  type WorkerCertification, type CertificationType,
} from "@/lib/actions/worker-certifications";
import { CERT_LABELS } from "@/lib/certifications";
import type { Worker } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function expiryStatus(cert: WorkerCertification) {
  if (cert.is_permanent) return "permanent";
  if (!cert.expiry_date) return "unknown";
  const days = Math.floor((new Date(cert.expiry_date).getTime() - Date.now()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 30) return "critical";
  if (days <= 60) return "warning";
  return "ok";
}

const EXPIRY_CONFIG = {
  permanent: { label: "Bezterminowe", color: "bg-blue-100 text-blue-700",   icon: CheckCircle2 },
  ok:        { label: "Ważne",        color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  warning:   { label: "Wygasa wkrótce",color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
  critical:  { label: "Krytyczne",    color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  expired:   { label: "Wygasłe",      color: "bg-red-100 text-red-700",     icon: XCircle },
  unknown:   { label: "Brak daty",    color: "bg-slate-100 text-slate-500", icon: CheckCircle2 },
};

export function KwalifikacjeClient({
  initialCertifications,
  expiringCertifications,
  workers,
}: {
  initialCertifications: WorkerCertification[];
  expiringCertifications: WorkerCertification[];
  workers: Worker[];
}) {
  const [certs, setCerts] = useState<WorkerCertification[]>(initialCertifications);
  const [showForm, setShowForm] = useState(false);
  const [filterWorker, setFilterWorker] = useState<string>("all");
  const [filterType, setFilterType] = useState<CertificationType | "all">("all");
  const [filterExpiry, setFilterExpiry] = useState<string>("all");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    workerId: workers[0]?.id ?? "",
    certificationType: "bhp_general" as CertificationType,
    customName: "", issuingAuthority: "", certificateNumber: "",
    issuedDate: "", expiryDate: "", isPermanent: false, notes: "",
  });

  const filtered = certs.filter((c) => {
    const matchWorker = filterWorker === "all" || c.worker_id === filterWorker;
    const matchType = filterType === "all" || c.certification_type === filterType;
    const status = expiryStatus(c);
    const matchExpiry = filterExpiry === "all" || filterExpiry === status;
    return matchWorker && matchType && matchExpiry;
  });

  const stats = {
    total: certs.length,
    expired: certs.filter((c) => expiryStatus(c) === "expired").length,
    critical: certs.filter((c) => expiryStatus(c) === "critical").length,
    warning: certs.filter((c) => expiryStatus(c) === "warning").length,
    workers_with_certs: new Set(certs.map((c) => c.worker_id)).size,
  };

  function handleCreate() {
    if (!form.workerId) { setError("Wybierz pracownika"); return; }
    if (form.certificationType === "custom" && !form.customName.trim()) { setError("Podaj nazwę certyfikatu"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createCertification({
        workerId: form.workerId, certificationType: form.certificationType,
        customName: form.customName || undefined, issuingAuthority: form.issuingAuthority || undefined,
        certificateNumber: form.certificateNumber || undefined,
        issuedDate: form.issuedDate || undefined,
        expiryDate: form.isPermanent ? undefined : (form.expiryDate || undefined),
        isPermanent: form.isPermanent, notes: form.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const worker = workers.find((w) => w.id === form.workerId);
      const newCert: WorkerCertification = {
        id: res.id!, worker_id: form.workerId, org_id: "",
        certification_type: form.certificationType,
        custom_name: form.customName || null, issuing_authority: form.issuingAuthority || null,
        certificate_number: form.certificateNumber || null,
        issued_date: form.issuedDate || null,
        expiry_date: form.isPermanent ? null : (form.expiryDate || null),
        is_permanent: form.isPermanent, notes: form.notes || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        worker_name: worker?.full_name ?? null, worker_specialty: worker?.specialty ?? null,
      };
      setCerts((prev) => [newCert, ...prev]);
      setShowForm(false);
      setForm({ workerId: workers[0]?.id ?? "", certificationType: "bhp_general", customName: "", issuingAuthority: "", certificateNumber: "", issuedDate: "", expiryDate: "", isPermanent: false, notes: "" });
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCertification(id);
      setCerts((prev) => prev.filter((c) => c.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Kwalifikacje i Uprawnienia</h1>
          <p className="text-sm text-muted-foreground">Certyfikaty, szkolenia BHP, uprawnienia zawodowe — alerty o wygaśnięciu</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={workers.length === 0}>
          <Plus className="mr-1 h-4 w-4" /> Dodaj kwalifikację
        </Button>
      </div>

      {workers.length === 0 && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          Brak pracowników w bazie. Najpierw dodaj pracowników w sekcji Pracownicy.
        </div>
      )}

      {/* CRITICAL ALERTS */}
      {expiringCertifications.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <p className="font-semibold text-orange-800">Wygasające w ciągu 60 dni ({expiringCertifications.length})</p>
            </div>
            <div className="space-y-1">
              {expiringCertifications.slice(0, 5).map((c) => {
                const days = c.expiry_date ? Math.floor((new Date(c.expiry_date).getTime() - Date.now()) / 86400000) : null;
                return (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <span className={`font-medium ${days !== null && days < 0 ? "text-red-600" : "text-orange-700"}`}>
                      {c.worker_name}
                    </span>
                    <span className="text-muted-foreground">—</span>
                    <span>{c.certification_type === "custom" ? c.custom_name : CERT_LABELS[c.certification_type]}</span>
                    <span className={`ml-auto text-xs font-semibold ${days !== null && days < 0 ? "text-red-600" : "text-orange-600"}`}>
                      {days !== null && days < 0 ? `WYGASŁE ${Math.abs(days)} dni temu` : `za ${days} dni`}
                    </span>
                  </div>
                );
              })}
              {expiringCertifications.length > 5 && (
                <p className="text-xs text-muted-foreground">…i {expiringCertifications.length - 5} więcej</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-5">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Łącznie certyfikatów</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pracownicy z cert.</p><p className="text-2xl font-bold">{stats.workers_with_certs}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Wygasłe</p><p className="text-2xl font-bold text-red-600">{stats.expired}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Krytyczne (30 dni)</p><p className="text-2xl font-bold text-orange-600">{stats.critical}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Uwaga (60 dni)</p><p className="text-2xl font-bold text-yellow-600">{stats.warning}</p></CardContent></Card>
      </div>

      {/* FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Dodaj kwalifikację / uprawnienie</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Pracownik *</label>
                <select value={form.workerId} onChange={(e) => setForm({ ...form, workerId: e.target.value })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {workers.map((w) => <option key={w.id} value={w.id}>{w.full_name}{w.specialty ? ` (${w.specialty})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Rodzaj kwalifikacji *</label>
                <select value={form.certificationType} onChange={(e) => setForm({ ...form, certificationType: e.target.value as CertificationType })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(CERT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {form.certificationType === "custom" && (
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Nazwa własna *</label>
                  <Input value={form.customName} onChange={(e) => setForm({ ...form, customName: e.target.value })} className="mt-1" />
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Organ wydający</label>
                <Input value={form.issuingAuthority} onChange={(e) => setForm({ ...form, issuingAuthority: e.target.value })} placeholder="np. UDT, SEP, Inspekcja Pracy" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Nr certyfikatu / zaświadczenia</label>
                <Input value={form.certificateNumber} onChange={(e) => setForm({ ...form, certificateNumber: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Data wydania</label>
                <Input type="date" value={form.issuedDate} onChange={(e) => setForm({ ...form, issuedDate: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-1 cursor-pointer">
                  <input type="checkbox" checked={form.isPermanent} onChange={(e) => setForm({ ...form, isPermanent: e.target.checked })} className="rounded" />
                  Bezterminowe
                </label>
                {!form.isPermanent && (
                  <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} placeholder="Data ważności" />
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Uwagi</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Zapisywanie..." : "Dodaj"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FILTERS */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterWorker} onChange={(e) => setFilterWorker(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="all">Wszyscy pracownicy</option>
          {workers.map((w) => <option key={w.id} value={w.id}>{w.full_name}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value as CertificationType | "all")}
          className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="all">Wszystkie typy</option>
          {Object.entries(CERT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterExpiry} onChange={(e) => setFilterExpiry(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="all">Wszystkie statusy</option>
          <option value="expired">Wygasłe</option>
          <option value="critical">Krytyczne (30 dni)</option>
          <option value="warning">Ostrzeżenie (60 dni)</option>
          <option value="ok">Ważne</option>
          <option value="permanent">Bezterminowe</option>
        </select>
      </div>

      {/* LIST */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <GraduationCap className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Brak kwalifikacji</p>
            <p className="text-sm mt-1">Dodaj certyfikaty, szkolenia BHP i uprawnienia zawodowe pracowników</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((cert) => {
            const status = expiryStatus(cert);
            const expCfg = EXPIRY_CONFIG[status];
            const ExpIcon = expCfg.icon;
            const days = !cert.is_permanent && cert.expiry_date
              ? Math.floor((new Date(cert.expiry_date).getTime() - Date.now()) / 86400000)
              : null;
            return (
              <Card key={cert.id} className={`hover:shadow-sm transition-shadow ${status === "expired" ? "border-red-200 bg-red-50/20" : status === "critical" ? "border-orange-200" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${expCfg.color}`}>
                          <ExpIcon className="h-3 w-3" />{expCfg.label}
                        </span>
                      </div>
                      <p className="font-semibold text-sm">{cert.certification_type === "custom" ? cert.custom_name : CERT_LABELS[cert.certification_type]}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{cert.worker_name}{cert.worker_specialty ? ` · ${cert.worker_specialty}` : ""}</p>
                      <div className="mt-1.5 text-xs text-muted-foreground space-y-0.5">
                        {cert.issuing_authority && <p>Wydane przez: {cert.issuing_authority}</p>}
                        {cert.certificate_number && <p>Nr: {cert.certificate_number}</p>}
                        {cert.issued_date && <p>Wydane: {new Date(cert.issued_date).toLocaleDateString("pl-PL")}</p>}
                        {cert.is_permanent ? (
                          <p className="text-blue-600 font-medium">Bezterminowe</p>
                        ) : cert.expiry_date ? (
                          <p className={`font-medium ${days !== null && days < 0 ? "text-red-600" : days !== null && days <= 30 ? "text-orange-600" : "text-foreground"}`}>
                            {days !== null && days < 0
                              ? `⚠ Wygasłe ${Math.abs(days)} dni temu`
                              : days !== null && days <= 60
                              ? `⚠ Wygasa za ${days} dni (${new Date(cert.expiry_date).toLocaleDateString("pl-PL")})`
                              : `Ważne do: ${new Date(cert.expiry_date).toLocaleDateString("pl-PL")}`}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(cert.id)} disabled={pending}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
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
