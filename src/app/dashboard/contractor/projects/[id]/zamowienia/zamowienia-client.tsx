"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, Package, Truck, CheckCircle2, X,
  Clock, FileText, Trash2, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  createPurchaseOrder, updatePOStatus, deletePO,
  type PurchaseOrder, type POStatus, type POItem,
} from "@/lib/actions/purchase-orders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const STATUS_CONFIG: Record<POStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: "Szkic",           color: "bg-slate-100 text-slate-600",   icon: FileText },
  sent:      { label: "Wysłane",         color: "bg-blue-100 text-blue-700",     icon: Clock },
  confirmed: { label: "Potwierdzone",    color: "bg-yellow-100 text-yellow-700", icon: CheckCircle2 },
  partial:   { label: "Częściowa dost.", color: "bg-orange-100 text-orange-700", icon: Package },
  delivered: { label: "Dostarczone",     color: "bg-green-100 text-green-700",   icon: Truck },
  invoiced:  { label: "Zafakturowane",   color: "bg-teal-100 text-teal-700",     icon: CheckCircle2 },
  cancelled: { label: "Anulowane",       color: "bg-red-100 text-red-400",       icon: X },
};

const STATUS_FLOW: Record<POStatus, POStatus | null> = {
  draft: "sent", sent: "confirmed", confirmed: "delivered",
  partial: "delivered", delivered: "invoiced", invoiced: null, cancelled: null,
};

function fmt(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 2 }).format(n);
}

import React from "react";

type ItemForm = { description: string; unit: string; quantity: string; unitPrice: string; vatRate: string; };
const emptyItem = (): ItemForm => ({ description: "", unit: "szt", quantity: "1", unitPrice: "", vatRate: "23" });

export function ZamowieniaClient({
  projectId,
  initialOrders,
}: {
  projectId: string;
  initialOrders: PurchaseOrder[];
}) {
  const [orders, setOrders] = useState<PurchaseOrder[]>(initialOrders);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    supplierName: "", supplierNip: "", supplierContact: "",
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDelivery: "", paymentTerms: "", deliveryAddress: "", notes: "",
  });
  const [items, setItems] = useState<ItemForm[]>([emptyItem()]);

  const totalGross = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.gross_total, 0);
  const totalPending = orders.filter((o) => ["sent", "confirmed"].includes(o.status)).reduce((s, o) => s + o.gross_total, 0);

  function previewNet() { return items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0); }
  function previewGross() { return items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0) * (1 + (Number(i.vatRate) || 23) / 100), 0); }

  function handleAdd() {
    if (!form.supplierName.trim()) { setError("Nazwa dostawcy jest wymagana"); return; }
    if (items.some((i) => !i.description.trim() || !i.quantity || !i.unitPrice)) {
      setError("Wszystkie pozycje muszą mieć opis, ilość i cenę"); return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createPurchaseOrder({
        projectId,
        supplierName: form.supplierName, supplierNip: form.supplierNip || undefined,
        supplierContact: form.supplierContact || undefined,
        orderDate: form.orderDate, expectedDelivery: form.expectedDelivery || undefined,
        paymentTerms: form.paymentTerms || undefined,
        deliveryAddress: form.deliveryAddress || undefined,
        notes: form.notes || undefined,
        items: items.map((i) => ({
          description: i.description, unit: i.unit,
          quantity: Number(i.quantity), unitPrice: Number(i.unitPrice),
          vatRate: Number(i.vatRate),
        })),
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const net = previewNet(); const gross = previewGross();
      const newOrder: PurchaseOrder = {
        id: res.id!, project_id: projectId, org_id: "", created_by: null,
        number: orders.length + 1,
        number_display: `ZAM-${String(orders.length + 1).padStart(4, "0")}`,
        supplier_name: form.supplierName, supplier_nip: form.supplierNip || null,
        supplier_contact: form.supplierContact || null,
        order_date: form.orderDate, expected_delivery: form.expectedDelivery || null,
        actual_delivery: null, status: "draft",
        net_total: net, vat_total: gross - net, gross_total: gross,
        paid_amount: 0, payment_terms: form.paymentTerms || null,
        delivery_address: form.deliveryAddress || null, notes: form.notes || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        items: items.map((i, idx): POItem => ({
          id: `tmp-${idx}`, po_id: res.id!, sort_order: idx,
          description: i.description, unit: i.unit,
          quantity: Number(i.quantity), unit_price: Number(i.unitPrice),
          vat_rate: Number(i.vatRate),
          net_amount: Number(i.quantity) * Number(i.unitPrice),
          gross_amount: Number(i.quantity) * Number(i.unitPrice) * (1 + Number(i.vatRate) / 100),
          delivered_qty: 0, notes: null,
        })),
      };
      setOrders((prev) => [newOrder, ...prev]);
      setShowForm(false);
      setForm({ supplierName: "", supplierNip: "", supplierContact: "", orderDate: new Date().toISOString().slice(0, 10), expectedDelivery: "", paymentTerms: "", deliveryAddress: "", notes: "" });
      setItems([emptyItem()]);
    });
  }

  function handleStatus(id: string, status: POStatus) {
    startTransition(async () => {
      await updatePOStatus(id, projectId, status);
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deletePO(id, projectId);
      setOrders((prev) => prev.filter((o) => o.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Zamówienia materiałów (PO)</h1>
          <p className="text-sm text-muted-foreground">Purchase Orders — zamówienia do dostawców i śledzenie dostaw</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="mr-1 h-4 w-4" /> Nowe zamówienie
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Łączna wartość zamówień</p>
          <p className="text-xl font-bold">{fmt(totalGross)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Oczekuje dostawy</p>
          <p className="text-xl font-bold text-yellow-600">{fmt(totalPending)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Liczba zamówień</p>
          <p className="text-xl font-bold">{orders.filter((o) => o.status !== "cancelled").length}</p>
        </CardContent></Card>
      </div>

      {/* FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowe zamówienie materiałów</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Dostawca *</label>
                <Input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} placeholder="Nazwa firmy" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">NIP dostawcy</label>
                <Input value={form.supplierNip} onChange={(e) => setForm({ ...form, supplierNip: e.target.value })} placeholder="000-000-00-00" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Kontakt (email/tel)</label>
                <Input value={form.supplierContact} onChange={(e) => setForm({ ...form, supplierContact: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Data zamówienia</label>
                <Input type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Oczekiwana dostawa</label>
                <Input type="date" value={form.expectedDelivery} onChange={(e) => setForm({ ...form, expectedDelivery: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Warunki płatności</label>
                <Input value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} placeholder="np. przelew 14 dni" className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Adres dostawy</label>
                <Input value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} placeholder="Adres budowy" className="mt-1" />
              </div>
            </div>

            {/* ITEMS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Pozycje zamówienia *</label>
                <Button size="sm" variant="outline" onClick={() => setItems([...items, emptyItem()])}>
                  <Plus className="mr-1 h-3 w-3" /> Dodaj pozycję
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid gap-2 sm:grid-cols-6 items-end border rounded-md p-3 bg-muted/30">
                    <div className="sm:col-span-2">
                      <label className="text-xs text-muted-foreground">Opis</label>
                      <Input value={item.description} onChange={(e) => setItems(items.map((it, i) => i === idx ? { ...it, description: e.target.value } : it))} placeholder="np. Cement CEM I 42.5R" className="mt-0.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Jedn.</label>
                      <Input value={item.unit} onChange={(e) => setItems(items.map((it, i) => i === idx ? { ...it, unit: e.target.value } : it))} className="mt-0.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Ilość</label>
                      <Input type="number" min={0} value={item.quantity} onChange={(e) => setItems(items.map((it, i) => i === idx ? { ...it, quantity: e.target.value } : it))} className="mt-0.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Cena netto</label>
                      <Input type="number" min={0} value={item.unitPrice} onChange={(e) => setItems(items.map((it, i) => i === idx ? { ...it, unitPrice: e.target.value } : it))} placeholder="0.00" className="mt-0.5 text-sm" />
                    </div>
                    <div className="flex items-end gap-1">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">VAT %</label>
                        <select value={item.vatRate} onChange={(e) => setItems(items.map((it, i) => i === idx ? { ...it, vatRate: e.target.value } : it))}
                          className="mt-0.5 w-full rounded border bg-background px-2 py-2 text-sm">
                          <option value="23">23%</option><option value="8">8%</option><option value="0">0%</option>
                        </select>
                      </div>
                      {items.length > 1 && (
                        <Button size="sm" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 rounded-md bg-muted p-3 text-sm text-right space-y-0.5">
                <p>Netto: <strong>{fmt(previewNet())}</strong></p>
                <p>VAT: <strong>{fmt(previewGross() - previewNet())}</strong></p>
                <p className="font-semibold text-base">Brutto: {fmt(previewGross())}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Uwagi</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={pending}>{pending ? "Zapisywanie..." : "Zapisz zamówienie"}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LIST */}
      {orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Package className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Brak zamówień</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map((po) => {
            const cfg = STATUS_CONFIG[po.status];
            const Icon = cfg.icon;
            const nextStatus = STATUS_FLOW[po.status];
            const isExpanded = expandedId === po.id;
            return (
              <Card key={po.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-semibold text-muted-foreground">{po.number_display}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                          <Icon className="h-3 w-3" />{cfg.label}
                        </span>
                      </div>
                      <p className="font-semibold">{po.supplier_name}</p>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="font-semibold text-foreground">{fmt(po.gross_total)} brutto</span>
                        <span>{new Date(po.order_date).toLocaleDateString("pl-PL")}</span>
                        {po.expected_delivery && <span className="flex items-center gap-1"><Truck className="h-3 w-3" />Dostawa: {new Date(po.expected_delivery).toLocaleDateString("pl-PL")}</span>}
                        {po.payment_terms && <span>{po.payment_terms}</span>}
                        <span>{(po.items?.length ?? 0)} pozycji</span>
                      </div>

                      {isExpanded && po.items && (
                        <div className="mt-3 overflow-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead><tr className="bg-muted/50">
                              <th className="text-left p-1.5">Opis</th>
                              <th className="text-right p-1.5">Ilość</th>
                              <th className="text-left p-1.5">Jedn.</th>
                              <th className="text-right p-1.5">Cena netto</th>
                              <th className="text-right p-1.5">Brutto</th>
                            </tr></thead>
                            <tbody>
                              {po.items.map((item) => (
                                <tr key={item.id} className="border-t">
                                  <td className="p-1.5">{item.description}</td>
                                  <td className="p-1.5 text-right">{item.quantity}</td>
                                  <td className="p-1.5">{item.unit}</td>
                                  <td className="p-1.5 text-right">{fmt(item.unit_price)}</td>
                                  <td className="p-1.5 text-right font-medium">{fmt(item.gross_amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0 items-end">
                      {nextStatus && (
                        <Button size="sm" onClick={() => handleStatus(po.id, nextStatus)} disabled={pending} variant="outline">
                          {STATUS_CONFIG[nextStatus].label} →
                        </Button>
                      )}
                      {po.status === "draft" && (
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(po.id)} disabled={pending}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                      {["sent","confirmed","partial"].includes(po.status) && (
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleStatus(po.id, "cancelled")} disabled={pending}>Anuluj</Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : po.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
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
