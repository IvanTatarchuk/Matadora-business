"use client";

import { useState, useTransition } from "react";
import { CreditCard, Plus, DollarSign, Clock, CheckCircle2, AlertCircle, RefreshCw, X } from "lucide-react";
import {
  createPaymentMethod, createPaymentTransaction, updatePaymentStatus,
  type PaymentMethod, type PaymentTransaction, type PaymentProvider,
} from "@/lib/actions/payments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  initialMethods: PaymentMethod[];
  initialTransactions: PaymentTransaction[];
  initialStats: { total: number; pending: number; completed: number; failed: number };
};

export function PaymentsClient({ initialMethods, initialTransactions, initialStats }: Props) {
  const [methods, setMethods] = useState<PaymentMethod[]>(initialMethods);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(initialTransactions);
  const [stats, setStats] = useState(initialStats);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [showMethodForm, setShowMethodForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);

  const [methodForm, setMethodForm] = useState({
    type: "stripe" as PaymentProvider,
    provider: "",
    isDefault: false,
  });

  const [transactionForm, setTransactionForm] = useState({
    amount: 0,
    currency: "PLN",
    projectId: "",
    offerId: "",
    milestoneId: "",
    paymentMethodId: "",
    description: "",
    notes: "",
  });

  function handleCreateMethod() {
    if (!methodForm.provider) { setError("Provider jest wymagany"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createPaymentMethod(methodForm);
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      setShowMethodForm(false);
      setMethodForm({ type: "stripe", provider: "", isDefault: false });
      // Reload methods
      const newMethods = await fetch("/api/payments/methods").then(r => r.json());
      setMethods(newMethods);
    });
  }

  function handleCreateTransaction() {
    if (!transactionForm.amount || transactionForm.amount <= 0) {
      setError("Kwota jest wymagana");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createPaymentTransaction(transactionForm);
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      setShowTransactionForm(false);
      setTransactionForm({ amount: 0, currency: "PLN", projectId: "", offerId: "", milestoneId: "", paymentMethodId: "", description: "", notes: "" });
      // Reload transactions
      const newTransactions = await fetch("/api/payments/transactions").then(r => r.json());
      setTransactions(newTransactions);
    });
  }

  function handleUpdateStatus(transactionId: string, status: "completed" | "failed" | "cancelled") {
    setError(null);
    startTransition(async () => {
      const res = await updatePaymentStatus(transactionId, status);
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      // Reload transactions
      const newTransactions = await fetch("/api/payments/transactions").then(r => r.json());
      setTransactions(newTransactions);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          Płatności
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Zarządzanie metodami płatności i transakcjami
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Wszystkie</p>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Oczekujące</p>
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Zakończone</p>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Błędy</p>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold">{stats.failed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => setShowMethodForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj metodę płatności
        </Button>
        <Button variant="outline" onClick={() => setShowTransactionForm(true)}>
          <DollarSign className="h-4 w-4 mr-2" />
          Nowa transakcja
        </Button>
      </div>

      {/* Payment Method Form */}
      {showMethodForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Dodaj metodę płatności</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowMethodForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Typ</label>
                <select
                  value={methodForm.type}
                  onChange={(e) => setMethodForm({ ...methodForm, type: e.target.value as any })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="stripe">Stripe</option>
                  <option value="przelewy24">Przelewy24</option>
                  <option value="bank_transfer">Przelew bankowy</option>
                  <option value="cash">Gotówka</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Provider ID</label>
                <Input value={methodForm.provider} onChange={(e) => setMethodForm({ ...methodForm, provider: e.target.value })} className="mt-1" />
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <input
                  type="checkbox"
                  id="default"
                  checked={methodForm.isDefault}
                  onChange={(e) => setMethodForm({ ...methodForm, isDefault: e.target.checked })}
                />
                <label htmlFor="default" className="text-sm">Domyślna metoda</label>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreateMethod} disabled={pending}>{pending ? "Dodawanie..." : "Dodaj"}</Button>
              <Button variant="outline" onClick={() => { setShowMethodForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Form */}
      {showTransactionForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowa transakcja</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowTransactionForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Kwota</label>
                <Input type="number" step="0.01" value={transactionForm.amount} onChange={(e) => setTransactionForm({ ...transactionForm, amount: Number(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Waluta</label>
                <Input value={transactionForm.currency} onChange={(e) => setTransactionForm({ ...transactionForm, currency: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">ID projektu</label>
                <Input value={transactionForm.projectId} onChange={(e) => setTransactionForm({ ...transactionForm, projectId: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">ID oferty</label>
                <Input value={transactionForm.offerId} onChange={(e) => setTransactionForm({ ...transactionForm, offerId: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">ID etapu płatności</label>
                <Input value={transactionForm.milestoneId} onChange={(e) => setTransactionForm({ ...transactionForm, milestoneId: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Metoda płatności</label>
                <select
                  value={transactionForm.paymentMethodId}
                  onChange={(e) => setTransactionForm({ ...transactionForm, paymentMethodId: e.target.value })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Wybierz metodę</option>
                  {methods.map((m) => (
                    <option key={m.id} value={m.id}>{m.provider} {m.is_default ? "(domyślna)" : ""}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Opis</label>
                <Input value={transactionForm.description} onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Notatki</label>
                <Input value={transactionForm.notes} onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })} className="mt-1" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreateTransaction} disabled={pending}>{pending ? "Tworzenie..." : "Utwórz"}</Button>
              <Button variant="outline" onClick={() => { setShowTransactionForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Metody płatności</CardTitle>
        </CardHeader>
        <CardContent>
          {methods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak metod płatności
            </div>
          ) : (
            <div className="space-y-2">
              {methods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${method.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                    <div>
                      <p className="font-medium">{method.type}</p>
                      <p className="text-sm text-muted-foreground">{method.provider}</p>
                    </div>
                  </div>
                  {method.is_default && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Domyślna</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transakcje</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak transakcji
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{tx.amount.toFixed(2)} {tx.currency}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        tx.status === "completed" ? "bg-green-100 text-green-700" :
                        tx.status === "pending" ? "bg-orange-100 text-orange-700" :
                        tx.status === "failed" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{tx.description || tx.provider}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString("pl-PL")}</p>
                  </div>
                  {tx.status === "pending" && (
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(tx.id, "completed")}>
                        <CheckCircle2 className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(tx.id, "failed")}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
