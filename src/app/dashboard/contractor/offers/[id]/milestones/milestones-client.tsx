"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, DollarSign, Calendar, CheckCircle2, Clock,
  XCircle, Trash2, Lock, Unlock,
} from "lucide-react";
import {
  createPaymentMilestone, updateMilestoneStatus, deletePaymentMilestone,
  type PaymentMilestone, type MilestoneInput,
} from "@/lib/actions/payment-milestones";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const STATUS_CONFIG: Record<PaymentMilestone["status"], { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: "Oczekuje", icon: Clock, color: "bg-yellow-100 text-yellow-700" },
  ready: { label: "Gotowy", icon: CheckCircle2, color: "bg-blue-100 text-blue-700" },
  released: { label: "Wypłacony", icon: CheckCircle2, color: "bg-green-100 text-green-700" },
  cancelled: { label: "Anulowany", icon: XCircle, color: "bg-red-100 text-red-700" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

type Props = {
  offerId: string;
  initialMilestones: PaymentMilestone[];
};

export function MilestonesClient({ offerId, initialMilestones }: Props) {
  const [milestones, setMilestones] = useState<PaymentMilestone[]>(initialMilestones);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    amount: "",
    dueDate: "",
  });

  const totalAmount = milestones.reduce((sum, m) => sum + m.amount, 0);
  const releasedAmount = milestones
    .filter((m) => m.status === "released")
    .reduce((sum, m) => sum + m.amount, 0);
  const pendingAmount = totalAmount - releasedAmount;

  function handleCreate() {
    if (!form.name.trim() || !form.amount) {
      setError("Nazwa i kwota są wymagane");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createPaymentMilestone({
        offerId,
        name: form.name,
        description: form.description || undefined,
        amount: Number(form.amount),
        dueDate: form.dueDate || undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "Błąd tworzenia etapu");
        return;
      }
      const updated = await fetch(`/api/offers/${offerId}/milestones`).then(r => r.json());
      setMilestones(updated.milestones ?? []);
      setShowCreateForm(false);
      setForm({ name: "", description: "", amount: "", dueDate: "" });
    });
  }

  function handleRelease(id: string) {
    startTransition(async () => {
      const res = await updateMilestoneStatus(id, "released");
      if (!res.ok) {
        setError(res.error ?? "Błąd zwalniania płatności");
        return;
      }
      setMilestones((prev) => prev.map((m) => m.id === id ? { ...m, status: "released" } : m));
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Czy na pewno usunąć ten etap płatności?")) return;
    startTransition(async () => {
      const res = await deletePaymentMilestone(id);
      if (!res.ok) {
        setError(res.error ?? "Błąd usuwania");
        return;
      }
      setMilestones((prev) => prev.filter((m) => m.id !== id));
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/contractor/offers">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Etapowe płatności</h1>
          <p className="text-sm text-muted-foreground mt-1">Zarządzaj płatnościami dla oferty</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Nowy etap
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Całkowita kwota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalAmount)} PLN</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Wypłacono</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{fmt(releasedAmount)} PLN</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Do wypłaty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{fmt(pendingAmount)} PLN</div>
          </CardContent>
        </Card>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Utwórz etap płatności</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}><XCircle className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nazwa etapu *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="np. Zaliczka"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Opis (opcjonalne)</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Szczegóły etapu"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Kwota (PLN) *</label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Termin płatności</label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Tworzenie..." : "Utwórz etap"}</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestones List */}
      {milestones.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <DollarSign className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Brak etapów płatności</p>
            <p className="text-sm mt-1">Utwórz pierwszy etap płatności dla tej oferty</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {milestones.map((milestone) => {
            const StatusConfig = STATUS_CONFIG[milestone.status];
            const StatusIcon = StatusConfig.icon;
            return (
              <Card key={milestone.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-semibold">{milestone.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${StatusConfig.color}`}>
                          <StatusIcon className="inline h-3 w-3 mr-1" />
                          {StatusConfig.label}
                        </span>
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-muted-foreground">{milestone.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span className="font-medium">{fmt(milestone.amount)} PLN</span>
                        </span>
                        {milestone.due_date && (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(milestone.due_date).toLocaleDateString("pl-PL")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {milestone.status === "pending" && (
                        <Button size="sm" onClick={() => handleRelease(milestone.id)} className="gap-1">
                          <Unlock className="h-3.5 w-3.5" /> Zwolnij
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(milestone.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
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
