"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, X, ShoppingBag, CheckCircle2, Send,
  Trophy, XCircle, ChevronDown, ChevronRight, ShieldAlert, ShieldCheck, ShieldQuestion,
} from "lucide-react";
import {
  createRfq, addRfqResponse, awardRfq, updateRfqStatus,
  type Rfq, type RfqCategory, type RfqStatus,
} from "@/lib/actions/rfq";
import {
  createSubBid, updateSubBidStatus, deleteSubBid,
  type SubBid, type SubBidStatus,
} from "@/lib/actions/sub-bids";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import React from "react";

const CATEGORY_LABELS: Record<RfqCategory, string> = {
  materials:   "Materiały",
  subcontract: "Podwykonawstwo",
  equipment:   "Sprzęt / Najem",
  services:    "Usługi",
  other:       "Inne",
};

const STATUS_CONFIG: Record<RfqStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft:               { label: "Szkic",            color: "bg-slate-100 text-slate-500",   icon: ShoppingBag },
  sent:                { label: "Wysłane",           color: "bg-blue-100 text-blue-700",     icon: Send },
  responses_received:  { label: "Odpowiedzi",        color: "bg-purple-100 text-purple-700", icon: CheckCircle2 },
  awarded:             { label: "Przyznane",         color: "bg-green-100 text-green-700",   icon: Trophy },
  cancelled:           { label: "Anulowane",         color: "bg-slate-100 text-slate-400",   icon: XCircle },
};

function fmt(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(n);
}

function qualificationBadge(bid: SubBid) {
  const insuranceExpiry = bid.subcontractor?.insurance_expiry;
  if (!insuranceExpiry) return null;
  const days = Math.floor((new Date(insuranceExpiry).getTime() - Date.now()) / 86_400_000);
  if (days < 0) {
    return { label: "Ubezpieczenie wygasło", color: "bg-red-100 text-red-700", Icon: ShieldAlert };
  }
  if (days <= 30) {
    return { label: `Ubezpieczenie wygasa za ${days} dni`, color: "bg-amber-100 text-amber-700", Icon: ShieldQuestion };
  }
  return { label: "Ubezpieczenie ważne", color: "bg-emerald-100 text-emerald-700", Icon: ShieldCheck };
}

const SUB_BID_STATUS_CONFIG: Record<SubBidStatus, { label: string; color: string }> = {
  draft:       { label: "Szkic",        color: "bg-slate-100 text-slate-500" },
  submitted:   { label: "Złożona",      color: "bg-blue-100 text-blue-700" },
  shortlisted: { label: "Na shortliście", color: "bg-purple-100 text-purple-700" },
  accepted:    { label: "Wybrana",      color: "bg-green-100 text-green-700" },
  rejected:    { label: "Odrzucona",    color: "bg-red-100 text-red-700" },
};

export function RfqClient({
  projectId, initialRfqs, initialSubBids,
}: {
  projectId: string; initialRfqs: Rfq[]; initialSubBids?: Record<string, SubBid[]>;
}) {
  const [rfqs, setRfqs] = useState<Rfq[]>(initialRfqs);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responseRfqId, setResponseRfqId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Sub bids state
  const [subBids, setSubBids] = useState<Record<string, SubBid[]>>(initialSubBids ?? {});
  const [subBidRfqId, setSubBidRfqId] = useState<string | null>(null);
  const [subBidForm, setSubBidForm] = useState({
    bidderName: "", bidderNip: "", bidderEmail: "", bidderPhone: "",
    amountNet: "", vatRate: "8", completionDays: "", notes: "",
  });

  const [form, setForm] = useState({
    title: "", category: "materials" as RfqCategory,
    description: "", dueDate: "",
    items: [{ description: "", quantity: "", unit: "" }],
  });

  const [responseForm, setResponseForm] = useState({
    supplierName: "", supplierEmail: "",
    totalAmount: "", deliveryDays: "", validUntil: "", notes: "",
  });

  const stats = {
    active: rfqs.filter((r) => !["cancelled"].includes(r.status)).length,
    draft: rfqs.filter((r) => r.status === "draft").length,
    pending: rfqs.filter((r) => r.status === "sent").length,
    awarded: rfqs.filter((r) => r.status === "awarded").length,
    totalAwarded: rfqs.filter((r) => r.status === "awarded" && r.awarded_amount).reduce((s, r) => s + (r.awarded_amount ?? 0), 0),
  };

  function addItem() { setForm((f) => ({ ...f, items: [...f.items, { description: "", quantity: "", unit: "" }] })); }
  function removeItem(i: number) { setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) })); }

  function handleCreate() {
    if (!form.title.trim()) { setError("Tytuł jest wymagany"); return; }
    setError(null);
    startTransition(async () => {
      const validItems = form.items.filter((i) => i.description.trim());
      const res = await createRfq({
        projectId, title: form.title, category: form.category,
        description: form.description || undefined,
        dueDate: form.dueDate || undefined,
        items: validItems.map((i) => ({
          description: i.description,
          quantity: i.quantity ? Number(i.quantity) : undefined,
          unit: i.unit || undefined,
        })),
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newRfq: Rfq = {
        id: res.id!, project_id: projectId, org_id: "", created_by: null,
        number: rfqs.length + 1,
        number_display: `ZO-${String(rfqs.length + 1).padStart(3, "0")}`,
        title: form.title, category: form.category,
        description: form.description || null, status: "draft",
        due_date: form.dueDate || null, awarded_to: null, awarded_amount: null, notes: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        items: validItems.map((i, idx) => ({
          id: `tmp-${idx}`, rfq_id: res.id!, position: (idx + 1) * 10,
          description: i.description, quantity: i.quantity ? Number(i.quantity) : null,
          unit: i.unit || null, notes: null,
        })),
        responses: [],
      };
      setRfqs((prev) => [newRfq, ...prev]);
      setShowForm(false);
      setForm({ title: "", category: "materials", description: "", dueDate: "", items: [{ description: "", quantity: "", unit: "" }] });
    });
  }

  function handleAddResponse() {
    if (!responseRfqId || !responseForm.supplierName.trim()) return;
    startTransition(async () => {
      const res = await addRfqResponse({
        rfqId: responseRfqId, projectId,
        supplierName: responseForm.supplierName,
        supplierEmail: responseForm.supplierEmail || undefined,
        totalAmount: responseForm.totalAmount ? Number(responseForm.totalAmount) : undefined,
        deliveryDays: responseForm.deliveryDays ? Number(responseForm.deliveryDays) : undefined,
        validUntil: responseForm.validUntil || undefined,
        notes: responseForm.notes || undefined,
      });
      if (!res.ok) return;
      const newResp = {
        id: `tmp-${Date.now()}`, rfq_id: responseRfqId,
        supplier_name: responseForm.supplierName,
        supplier_email: responseForm.supplierEmail || null,
        total_amount: responseForm.totalAmount ? Number(responseForm.totalAmount) : null,
        delivery_days: responseForm.deliveryDays ? Number(responseForm.deliveryDays) : null,
        valid_until: responseForm.validUntil || null, notes: responseForm.notes || null,
        is_selected: false, received_at: new Date().toISOString(),
      };
      setRfqs((prev) => prev.map((r) => r.id === responseRfqId
        ? { ...r, status: "responses_received" as const, responses: [...(r.responses ?? []), newResp] }
        : r));
      setResponseRfqId(null);
      setResponseForm({ supplierName: "", supplierEmail: "", totalAmount: "", deliveryDays: "", validUntil: "", notes: "" });
    });
  }

  function handleAward(rfqId: string, responseId: string) {
    startTransition(async () => {
      const res = await awardRfq(rfqId, responseId, projectId);
      if (!res.ok) return;
      setRfqs((prev) => prev.map((r) => {
        if (r.id !== rfqId) return r;
        const resp = r.responses?.find((rs) => rs.id === responseId);
        return {
          ...r, status: "awarded" as const,
          awarded_to: resp?.supplier_name ?? null, awarded_amount: resp?.total_amount ?? null,
          responses: (r.responses ?? []).map((rs) => ({ ...rs, is_selected: rs.id === responseId })),
        };
      }));
    });
  }

  function handleStatusChange(rfqId: string, status: RfqStatus) {
    startTransition(async () => {
      await updateRfqStatus(rfqId, projectId, status);
      setRfqs((prev) => prev.map((r) => r.id === rfqId ? { ...r, status } : r));
    });
  }

  function handleAddSubBid(rfqId: string) {
    if (!subBidForm.bidderName.trim() || !subBidForm.amountNet) return;
    startTransition(async () => {
      const res = await createSubBid({
        rfqId, projectId,
        bidderName: subBidForm.bidderName,
        bidderNip: subBidForm.bidderNip || undefined,
        bidderEmail: subBidForm.bidderEmail || undefined,
        bidderPhone: subBidForm.bidderPhone || undefined,
        amountNet: Number(subBidForm.amountNet),
        vatRate: Number(subBidForm.vatRate),
        completionDays: subBidForm.completionDays ? Number(subBidForm.completionDays) : undefined,
        notes: subBidForm.notes || undefined,
      });
      if (!res.ok) return;
      const newBid: SubBid = {
        id: res.id!, rfq_id: rfqId, project_id: projectId, org_id: "",
        subcontractor_id: null,
        bidder_name: subBidForm.bidderName, bidder_nip: subBidForm.bidderNip || null,
        bidder_email: subBidForm.bidderEmail || null, bidder_phone: subBidForm.bidderPhone || null,
        amount_net: Number(subBidForm.amountNet), vat_rate: Number(subBidForm.vatRate),
        amount_gross: Number(subBidForm.amountNet) * (1 + Number(subBidForm.vatRate) / 100),
        completion_days: subBidForm.completionDays ? Number(subBidForm.completionDays) : null,
        notes: subBidForm.notes || null, file_url: null,
        status: "submitted", submitted_at: new Date().toISOString(),
        reviewed_at: null, review_notes: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setSubBids((prev) => ({ ...prev, [rfqId]: [...(prev[rfqId] ?? []), newBid] }));
      setSubBidRfqId(null);
      setSubBidForm({ bidderName: "", bidderNip: "", bidderEmail: "", bidderPhone: "", amountNet: "", vatRate: "8", completionDays: "", notes: "" });
    });
  }

  function handleSubBidStatus(bid: SubBid, status: SubBidStatus) {
    startTransition(async () => {
      await updateSubBidStatus(bid.id, projectId, bid.rfq_id, status);
      setSubBids((prev) => ({
        ...prev,
        [bid.rfq_id]: (prev[bid.rfq_id] ?? []).map((b) => b.id === bid.id ? { ...b, status } : b),
      }));
    });
  }

  function handleDeleteSubBid(bid: SubBid) {
    startTransition(async () => {
      await deleteSubBid(bid.id, projectId);
      setSubBids((prev) => ({
        ...prev,
        [bid.rfq_id]: (prev[bid.rfq_id] ?? []).filter((b) => b.id !== bid.id),
      }));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Zapytania ofertowe (RFQ)</h1>
          <p className="text-sm text-muted-foreground">Wyślij zapytania do dostawców, porównaj oferty i wybierz najlepszą</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-1 h-4 w-4" />Nowe zapytanie</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Aktywne ZO</p><p className="text-2xl font-bold">{stats.active}</p></CardContent></Card>
        <Card className={stats.pending > 0 ? "border-blue-200" : ""}><CardContent className="p-4"><p className="text-xs text-muted-foreground">Oczekuje odpowiedzi</p><p className="text-2xl font-bold text-blue-600">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Przyznane</p><p className="text-2xl font-bold text-green-600">{stats.awarded}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Suma przyznanych</p><p className="text-lg font-bold">{fmt(stats.totalAwarded)}</p></CardContent></Card>
      </div>

      {/* ADD RESPONSE FORM */}
      {responseRfqId && (
        <Card className="border-purple-200">
          <CardHeader className="pb-3"><CardTitle className="text-base text-purple-700">Dodaj odpowiedź dostawcy</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div><label className="text-sm font-medium">Dostawca *</label>
                <Input value={responseForm.supplierName} onChange={(e) => setResponseForm({ ...responseForm, supplierName: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Email</label>
                <Input type="email" value={responseForm.supplierEmail} onChange={(e) => setResponseForm({ ...responseForm, supplierEmail: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Kwota całkowita (PLN)</label>
                <Input type="number" value={responseForm.totalAmount} onChange={(e) => setResponseForm({ ...responseForm, totalAmount: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Termin dostawy (dni)</label>
                <Input type="number" value={responseForm.deliveryDays} onChange={(e) => setResponseForm({ ...responseForm, deliveryDays: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Ważność oferty do</label>
                <Input type="date" value={responseForm.validUntil} onChange={(e) => setResponseForm({ ...responseForm, validUntil: e.target.value })} className="mt-1" /></div>
              <div><label className="text-sm font-medium">Uwagi</label>
                <Input value={responseForm.notes} onChange={(e) => setResponseForm({ ...responseForm, notes: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddResponse} disabled={pending}>Dodaj odpowiedź</Button>
              <Button variant="outline" onClick={() => setResponseRfqId(null)}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CREATE FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowe zapytanie ofertowe</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="text-sm font-medium">Tytuł *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="np. Dostawa stali zbrojeniowej — strop S3" className="mt-1" /></div>
              <div><label className="text-sm font-medium">Kategoria</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as RfqCategory })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label className="text-sm font-medium">Termin odpowiedzi</label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-1" /></div>
              <div className="sm:col-span-2"><label className="text-sm font-medium">Opis / Wymagania</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Pozycje</label>
                <Button type="button" variant="ghost" size="sm" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" />Dodaj</Button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-6">
                      <Input value={item.description} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, description: e.target.value } : it) }))} placeholder="Opis pozycji" className="h-8 text-sm" />
                    </div>
                    <div className="col-span-2">
                      <Input value={item.quantity} type="number" onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, quantity: e.target.value } : it) }))} placeholder="Ilość" className="h-8 text-sm" />
                    </div>
                    <div className="col-span-2">
                      <Input value={item.unit} onChange={(e) => setForm((f) => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, unit: e.target.value } : it) }))} placeholder="JM" className="h-8 text-sm" />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      {i > 0 && <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeItem(i)}><X className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Tworzenie..." : "Utwórz ZO"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LIST */}
      {rfqs.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
          <ShoppingBag className="mx-auto h-12 w-12 opacity-20 mb-3" />
          <p className="font-medium">Brak zapytań ofertowych</p>
          <p className="text-sm mt-1">Wyślij zapytania do dostawców i porównaj najlepsze oferty</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rfqs.map((rfq) => {
            const cfg = STATUS_CONFIG[rfq.status];
            const Icon = cfg.icon;
            const expanded = expandedId === rfq.id;
            return (
              <Card key={rfq.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{rfq.number_display}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                          <Icon className="h-3 w-3" />{cfg.label}
                        </span>
                        <span className="text-xs bg-muted rounded px-1.5 py-0.5">{CATEGORY_LABELS[rfq.category]}</span>
                        {rfq.due_date && <span className="text-xs text-muted-foreground">Termin: {new Date(rfq.due_date).toLocaleDateString("pl-PL")}</span>}
                      </div>
                      <p className="font-semibold">{rfq.title}</p>
                      {rfq.awarded_to && (
                        <p className="text-sm text-green-700 mt-0.5 font-medium">
                          <Trophy className="inline h-3.5 w-3.5 mr-1" />
                          Wybrano: {rfq.awarded_to} — {rfq.awarded_amount ? fmt(rfq.awarded_amount) : "—"}
                        </p>
                      )}
                      {rfq.responses && rfq.responses.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">{rfq.responses.length} odpowiedzi</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {rfq.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(rfq.id, "sent")} disabled={pending}>
                          <Send className="mr-1 h-3 w-3" />Wyślij
                        </Button>
                      )}
                      {(rfq.status === "sent" || rfq.status === "responses_received") && (
                        <Button size="sm" variant="outline" onClick={() => setResponseRfqId(rfq.id)} disabled={pending}>
                          <Plus className="mr-1 h-3 w-3" />Odpowiedź
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setExpandedId(expanded ? null : rfq.id)}>
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      {/* ITEMS */}
                      {rfq.items && rfq.items.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pozycje</p>
                          <div className="space-y-1">
                            {rfq.items.map((item) => (
                              <div key={item.id} className="flex items-center gap-3 text-sm">
                                <span className="flex-1">{item.description}</span>
                                {item.quantity && <span className="text-muted-foreground">{item.quantity} {item.unit}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* RESPONSES */}
                      {rfq.responses && rfq.responses.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Odpowiedzi dostawców</p>
                          <div className="space-y-2">
                            {rfq.responses.sort((a, b) => (a.total_amount ?? 999999) - (b.total_amount ?? 999999)).map((resp, idx) => (
                              <div key={resp.id} className={`flex items-center justify-between p-2 rounded-md ${resp.is_selected ? "bg-green-50 border border-green-200" : "bg-muted/40"}`}>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                                  <div>
                                    <p className="text-sm font-medium">{resp.supplier_name}</p>
                                    <div className="flex gap-3 text-xs text-muted-foreground">
                                      {resp.total_amount && <span className="font-semibold text-foreground">{fmt(resp.total_amount)}</span>}
                                      {resp.delivery_days && <span>{resp.delivery_days} dni</span>}
                                      {resp.valid_until && <span>do {new Date(resp.valid_until).toLocaleDateString("pl-PL")}</span>}
                                    </div>
                                    {resp.notes && <p className="text-xs text-muted-foreground">{resp.notes}</p>}
                                  </div>
                                </div>
                                {!resp.is_selected && rfq.status !== "awarded" && rfq.status !== "cancelled" && (
                                  <Button size="sm" onClick={() => handleAward(rfq.id, resp.id)} disabled={pending}>
                                    <Trophy className="mr-1 h-3 w-3" />Wybierz
                                  </Button>
                                )}
                                {resp.is_selected && <span className="text-xs text-green-700 font-semibold flex items-center gap-1"><Trophy className="h-3 w-3" />Wybrane</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* SUB BIDS */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Oferty podwykonawców</p>
                          <Button size="sm" variant="outline" onClick={() => setSubBidRfqId(subBidRfqId === rfq.id ? null : rfq.id)}>
                            <Plus className="h-3 w-3 mr-1" />Dodaj ofertę
                          </Button>
                        </div>
                        {subBidRfqId === rfq.id && (
                          <div className="rounded-md border p-3 space-y-2 mb-2 bg-muted/30">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div><label className="text-xs font-medium">Nazwa firmy *</label>
                                <Input value={subBidForm.bidderName} onChange={(e) => setSubBidForm({ ...subBidForm, bidderName: e.target.value })} className="mt-1 h-8 text-sm" /></div>
                              <div><label className="text-xs font-medium">NIP</label>
                                <Input value={subBidForm.bidderNip} onChange={(e) => setSubBidForm({ ...subBidForm, bidderNip: e.target.value })} className="mt-1 h-8 text-sm" placeholder="000-000-00-00" /></div>
                              <div><label className="text-xs font-medium">Email</label>
                                <Input type="email" value={subBidForm.bidderEmail} onChange={(e) => setSubBidForm({ ...subBidForm, bidderEmail: e.target.value })} className="mt-1 h-8 text-sm" /></div>
                              <div><label className="text-xs font-medium">Telefon</label>
                                <Input value={subBidForm.bidderPhone} onChange={(e) => setSubBidForm({ ...subBidForm, bidderPhone: e.target.value })} className="mt-1 h-8 text-sm" /></div>
                              <div><label className="text-xs font-medium">Kwota netto (PLN) *</label>
                                <Input type="number" value={subBidForm.amountNet} onChange={(e) => setSubBidForm({ ...subBidForm, amountNet: e.target.value })} className="mt-1 h-8 text-sm" /></div>
                              <div><label className="text-xs font-medium">VAT</label>
                                <select value={subBidForm.vatRate} onChange={(e) => setSubBidForm({ ...subBidForm, vatRate: e.target.value })}
                                  className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm">
                                  <option value="8">8%</option><option value="23">23%</option><option value="0">0%</option>
                                </select></div>
                              <div><label className="text-xs font-medium">Czas realizacji (dni)</label>
                                <Input type="number" value={subBidForm.completionDays} onChange={(e) => setSubBidForm({ ...subBidForm, completionDays: e.target.value })} className="mt-1 h-8 text-sm" /></div>
                              <div><label className="text-xs font-medium">Uwagi</label>
                                <Input value={subBidForm.notes} onChange={(e) => setSubBidForm({ ...subBidForm, notes: e.target.value })} className="mt-1 h-8 text-sm" /></div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleAddSubBid(rfq.id)} disabled={pending}>Zapisz</Button>
                              <Button size="sm" variant="outline" onClick={() => setSubBidRfqId(null)}>Anuluj</Button>
                            </div>
                          </div>
                        )}
                        {(subBids[rfq.id] ?? []).length === 0 ? (
                          <p className="text-xs text-muted-foreground">Brak ofert podwykonawców</p>
                        ) : (
                          <div className="space-y-1">
                            {(subBids[rfq.id] ?? []).sort((a, b) => a.amount_net - b.amount_net).map((bid, idx) => {
                              const cfg = SUB_BID_STATUS_CONFIG[bid.status];
                              const qual = qualificationBadge(bid);
                              return (
                                <div key={bid.id} className={`flex items-center justify-between p-2 rounded-md ${bid.status === "accepted" ? "bg-green-50 border border-green-200" : "bg-muted/40"}`}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                                    <div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="text-sm font-medium">{bid.bidder_name}</p>
                                        <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${cfg.color}`}>{cfg.label}</span>
                                        {qual && (
                                          <span className={`inline-flex items-center gap-1 text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${qual.color}`}>
                                            <qual.Icon className="h-3 w-3" />{qual.label}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex gap-2 text-xs text-muted-foreground">
                                        <span className="font-semibold text-foreground">{fmt(bid.amount_net)} netto</span>
                                        <span>({fmt(bid.amount_gross)} brutto)</span>
                                        {bid.completion_days && <span>{bid.completion_days} dni</span>}
                                        {bid.bidder_nip && <span>NIP: {bid.bidder_nip}</span>}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    {bid.status === "submitted" && (
                                      <>
                                        <Button size="sm" onClick={() => handleSubBidStatus(bid, "shortlisted")} disabled={pending} variant="outline" className="h-7 text-xs">Shortlist</Button>
                                        <Button size="sm" onClick={() => handleSubBidStatus(bid, "accepted")} disabled={pending} className="h-7 text-xs bg-green-600 hover:bg-green-700">Wybierz</Button>
                                      </>
                                    )}
                                    {bid.status === "shortlisted" && (
                                      <Button size="sm" onClick={() => handleSubBidStatus(bid, "accepted")} disabled={pending} className="h-7 text-xs bg-green-600 hover:bg-green-700">Wybierz</Button>
                                    )}
                                    {(bid.status === "submitted" || bid.status === "shortlisted") && (
                                      <Button size="sm" variant="ghost" onClick={() => handleDeleteSubBid(bid)} disabled={pending} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                                        <X className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
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
