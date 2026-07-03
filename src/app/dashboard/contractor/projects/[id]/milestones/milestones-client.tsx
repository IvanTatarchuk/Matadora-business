"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  X,
  CheckCircle2,
  Clock,
  FileText,
  Receipt,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import {
  createMilestone,
  updateMilestoneStatus,
  deleteMilestone,
  createInvoiceFromMilestone,
  type Milestone,
  type MilestoneStatus,
} from "@/lib/actions/milestones";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const PLN = (n: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(n);

type StatusConfig = {
  label: string;
  className: string;
  Icon: React.ElementType;
};

const STATUS_CONFIG: Record<MilestoneStatus, StatusConfig> = {
  planned: {
    label: "Zaplanowany",
    className: "bg-slate-100 text-slate-600",
    Icon: Clock,
  },
  in_progress: {
    label: "W realizacji",
    className: "bg-blue-100 text-blue-700",
    Icon: Clock,
  },
  pending_approval: {
    label: "Oczekuje akceptacji inwestora",
    className: "bg-yellow-100 text-yellow-700",
    Icon: AlertTriangle,
  },
  approved: {
    label: "Zatwierdzone przez inwestora",
    className: "bg-green-100 text-green-700",
    Icon: CheckCircle2,
  },
  invoiced: {
    label: "Zafakturowany",
    className: "bg-purple-100 text-purple-700",
    Icon: Receipt,
  },
};

type InvoiceFormState = {
  milestoneId: string;
  counterparty: string;
  nip: string;
};

export function MilestonesClient({
  projectId,
  initialMilestones,
}: {
  projectId: string;
  initialMilestones: Milestone[];
}) {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormState | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formAmountNet, setFormAmountNet] = useState("");
  const [formVatRate, setFormVatRate] = useState<"8" | "23">("23");
  const [formPlannedDate, setFormPlannedDate] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  };

  const totalValue = milestones.reduce((s, m) => s + m.amount_gross, 0);
  const approvedCount = milestones.filter((m) => m.status === "approved").length;
  const invoicedCount = milestones.filter((m) => m.status === "invoiced").length;
  const remainingCount = milestones.filter((m) =>
    ["planned", "in_progress", "pending_approval"].includes(m.status)
  ).length;
  const invoicedValue = milestones
    .filter((m) => m.status === "invoiced")
    .reduce((s, m) => s + m.amount_gross, 0);
  const invoicedPercent = totalValue > 0 ? Math.round((invoicedValue / totalValue) * 100) : 0;

  function resetForm() {
    setFormTitle("");
    setFormAmountNet("");
    setFormVatRate("23");
    setFormPlannedDate("");
    setFormDescription("");
    setFormNotes("");
    setShowAddForm(false);
  }

  function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault();
    const net = parseFloat(formAmountNet);
    if (!formTitle.trim() || isNaN(net) || net <= 0) {
      showError("Podaj tytuł i prawidłową kwotę netto.");
      return;
    }
    startTransition(async () => {
      const res = await createMilestone({
        projectId,
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        amountNet: net,
        vatRate: parseInt(formVatRate),
        plannedDate: formPlannedDate || undefined,
        notes: formNotes.trim() || undefined,
      });
      if (res.ok) {
        const vatRate = parseInt(formVatRate);
        const amount_gross = parseFloat((net * (1 + vatRate / 100)).toFixed(2));
        const newMilestone: Milestone = {
          id: res.id!,
          project_id: projectId,
          org_id: "",
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          order_index: milestones.length + 1,
          amount_net: net,
          vat_rate: vatRate,
          amount_gross,
          planned_date: formPlannedDate || null,
          completed_date: null,
          status: "planned",
          approved_by: null,
          approved_at: null,
          invoice_id: null,
          notes: formNotes.trim() || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setMilestones((prev) => [...prev, newMilestone]);
        resetForm();
        showToast("Kamień milowy dodany.");
      } else {
        showError(res.error ?? "Błąd podczas dodawania.");
      }
    });
  }

  function handleStatusChange(id: string, status: MilestoneStatus) {
    startTransition(async () => {
      const res = await updateMilestoneStatus(id, projectId, status);
      if (res.ok) {
        setMilestones((prev) =>
          prev.map((m) => (m.id === id ? { ...m, status } : m))
        );
      } else {
        showError(res.error ?? "Błąd zmiany statusu.");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteMilestone(id, projectId);
      if (res.ok) {
        setMilestones((prev) => prev.filter((m) => m.id !== id));
        showToast("Kamień milowy usunięty.");
      } else {
        showError(res.error ?? "Błąd usuwania.");
      }
    });
  }

  function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceForm) return;
    if (!invoiceForm.counterparty.trim()) {
      showError("Podaj nazwę kontrahenta.");
      return;
    }
    startTransition(async () => {
      const res = await createInvoiceFromMilestone(
        invoiceForm.milestoneId,
        projectId,
        invoiceForm.counterparty.trim(),
        invoiceForm.nip.trim() || undefined
      );
      if (res.ok) {
        setMilestones((prev) =>
          prev.map((m) =>
            m.id === invoiceForm.milestoneId
              ? { ...m, status: "invoiced" as MilestoneStatus, invoice_id: res.invoiceId ?? null }
              : m
          )
        );
        setInvoiceForm(null);
        showToast("Faktura VAT wystawiona pomyślnie.");
      } else {
        showError(res.error ?? "Błąd wystawiania faktury.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/dashboard/contractor/projects/${projectId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Powrót do projektu
      </Link>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kamienie milowe</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Zarządzaj postępem i fakturowaniem etapów projektu
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="gap-2"
          disabled={isPending}
        >
          <Plus className="h-4 w-4" />
          Dodaj kamień milowy
        </Button>
      </div>

      {/* Toast / Error */}
      {toast && (
        <div className="rounded-lg bg-green-50 border border-green-200 text-green-800 px-4 py-3 text-sm font-medium">
          {toast}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Łączna wartość
            </p>
            <p className="text-xl font-bold">{PLN(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Zatwierdzone
            </p>
            <p className="text-xl font-bold text-green-600">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Zafakturowane
            </p>
            <p className="text-xl font-bold text-purple-600">{invoicedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Pozostałe
            </p>
            <p className="text-xl font-bold text-slate-600">{remainingCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Postęp fakturowania</p>
            <p className="text-sm text-muted-foreground">
              {PLN(invoicedValue)} / {PLN(totalValue)} ({invoicedPercent}%)
            </p>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-purple-500 transition-all duration-500"
              style={{ width: `${invoicedPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Add milestone form */}
      {showAddForm && (
        <Card className="border-blue-200 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowy kamień milowy</CardTitle>
              <button
                onClick={resetForm}
                className="text-muted-foreground hover:text-foreground"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMilestone} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tytuł <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="np. Zakończenie stanu surowego"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Kwota netto (PLN) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formAmountNet}
                    onChange={(e) => setFormAmountNet(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stawka VAT</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formVatRate}
                    onChange={(e) => setFormVatRate(e.target.value as "8" | "23")}
                  >
                    <option value="8">8% (remontowa)</option>
                    <option value="23">23% (standardowa)</option>
                  </select>
                </div>
              </div>
              {formAmountNet && !isNaN(parseFloat(formAmountNet)) && (
                <p className="text-sm text-muted-foreground">
                  Kwota brutto:{" "}
                  <strong>
                    {PLN(parseFloat(formAmountNet) * (1 + parseInt(formVatRate) / 100))}
                  </strong>
                </p>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Planowana data realizacji
                </label>
                <Input
                  type="date"
                  value={formPlannedDate}
                  onChange={(e) => setFormPlannedDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Opis</label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Opcjonalny opis etapu"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notatki</label>
                <Input
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Wewnętrzne notatki"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isPending} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Dodaj
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={isPending}
                >
                  Anuluj
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Milestones list */}
      {milestones.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground py-12">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Brak kamieni milowych</p>
            <p className="text-sm mt-1">
              Dodaj pierwszy kamień milowy, aby śledzić postęp projektu.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {milestones.map((m) => {
            const cfg = STATUS_CONFIG[m.status];
            const StatusIcon = cfg.Icon;
            const vat = m.amount_gross - m.amount_net;

            return (
              <Card key={m.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="font-semibold text-base">{m.title}</h3>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.className}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </div>
                      {m.description && (
                        <p className="text-sm text-muted-foreground mb-2">{m.description}</p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>
                          Netto:{" "}
                          <strong className="text-foreground">{PLN(m.amount_net)}</strong>
                        </span>
                        <span>
                          VAT {m.vat_rate}%:{" "}
                          <strong className="text-foreground">{PLN(vat)}</strong>
                        </span>
                        <span>
                          Brutto:{" "}
                          <strong className="text-foreground">{PLN(m.amount_gross)}</strong>
                        </span>
                        {m.planned_date && (
                          <span>
                            Termin:{" "}
                            <strong className="text-foreground">
                              {new Date(m.planned_date).toLocaleDateString("pl-PL")}
                            </strong>
                          </span>
                        )}
                      </div>
                      {m.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">{m.notes}</p>
                      )}
                    </div>

                    {/* Right: actions */}
                    <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                      {(m.status === "in_progress" || m.status === "planned") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                          disabled={isPending}
                          onClick={() => handleStatusChange(m.id, "pending_approval")}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Zgłoś do akceptacji
                        </Button>
                      )}
                      {m.status === "pending_approval" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                          disabled={isPending}
                          onClick={() => handleStatusChange(m.id, "approved")}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Zatwierdź
                        </Button>
                      )}
                      {m.status === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-purple-700 border-purple-300 hover:bg-purple-50"
                          disabled={isPending}
                          onClick={() =>
                            setInvoiceForm({
                              milestoneId: m.id,
                              counterparty: "",
                              nip: "",
                            })
                          }
                        >
                          <Receipt className="h-3 w-3" />
                          Faktura VAT
                        </Button>
                      )}
                      {m.status === "planned" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          disabled={isPending}
                          onClick={() => handleDelete(m.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Usuń
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Invoice form (inline under the card) */}
                  {invoiceForm?.milestoneId === m.id && (
                    <form
                      onSubmit={handleCreateInvoice}
                      className="mt-4 pt-4 border-t space-y-3"
                    >
                      <p className="text-sm font-medium">
                        Dane do faktury VAT dla: <em>{m.title}</em>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Nazwa kontrahenta <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={invoiceForm.counterparty}
                            onChange={(e) =>
                              setInvoiceForm((f) => f && { ...f, counterparty: e.target.value })
                            }
                            placeholder="np. Inwestycje Kowalski Sp. z o.o."
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">NIP</label>
                          <Input
                            value={invoiceForm.nip}
                            onChange={(e) =>
                              setInvoiceForm((f) => f && { ...f, nip: e.target.value })
                            }
                            placeholder="np. 1234567890"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={isPending} className="gap-1">
                          <Receipt className="h-3 w-3" />
                          Wystaw fakturę
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => setInvoiceForm(null)}
                        >
                          Anuluj
                        </Button>
                      </div>
                    </form>
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
