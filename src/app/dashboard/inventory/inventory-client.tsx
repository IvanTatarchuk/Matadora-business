"use client";

import { useState, useTransition } from "react";
import {
  Package, Plus, AlertTriangle, TrendingUp, Search,
  ArrowUpRight, ArrowDownRight, MoreVertical, Edit, Trash2,
} from "lucide-react";
import {
  createInventoryItem, createInventoryTransaction, updateInventoryItem,
  type InventoryItem, type InventoryTransaction,
} from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  initialItems: InventoryItem[];
  initialLowStock: InventoryItem[];
  initialTransactions: InventoryTransaction[];
};

export function InventoryClient({ initialItems, initialLowStock, initialTransactions }: Props) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [lowStock, setLowStock] = useState<InventoryItem[]>(initialLowStock);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>(initialTransactions);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [addItemForm, setAddItemForm] = useState({
    sku: "", name: "", description: "", category: "",
    unit: "szt", minStockLevel: 0, maxStockLevel: null as number | null,
    unitCost: null as number | null, location: "",
  });

  const [transactionForm, setTransactionForm] = useState({
    itemId: "", type: "purchase" as "purchase" | "sale" | "transfer" | "adjustment" | "consumption" | "return",
    quantity: 0, unitCost: null as number | null, notes: "",
  });

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function handleAddItem() {
    setError(null);
    startTransition(async () => {
      const res = await createInventoryItem({
        ...addItemForm,
        maxStockLevel: addItemForm.maxStockLevel ?? undefined,
        unitCost: addItemForm.unitCost ?? undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "Błąd dodawania");
        return;
      }
      setShowAddForm(false);
      setAddItemForm({
        sku: "", name: "", description: "", category: "",
        unit: "szt", minStockLevel: 0, maxStockLevel: null,
        unitCost: null, location: "",
      });
      // Reload items
      const itemsRes = await fetch("/api/inventory").then(r => r.json());
      setItems(itemsRes.items ?? []);
    });
  }

  function handleAddTransaction() {
    if (!transactionForm.itemId) return;
    setError(null);
    startTransition(async () => {
      const res = await createInventoryTransaction({
        ...transactionForm,
        unitCost: transactionForm.unitCost ?? undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "Błąd transakcji");
        return;
      }
      setShowTransactionForm(false);
      setTransactionForm({
        itemId: "", type: "purchase", quantity: 0,
        unitCost: null, notes: "",
      });
      // Reload items
      const itemsRes = await fetch("/api/inventory").then(r => r.json());
      setItems(itemsRes.items ?? []);
    });
  }

  const totalValue = items.reduce((sum, item) => sum + item.total_value, 0);
  const lowStockCount = lowStock.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" />
          Zarządzanie magazynem
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Śledzenie stanów, transakcji i rezerwacji materiałów
        </p>
      </div>

      {/* Alerts */}
      {lowStockCount > 0 && (
        <div className="rounded-lg bg-orange-50 border border-orange-200 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
          <div>
            <p className="font-semibold text-orange-800">Niski stan: {lowStockCount} pozycji</p>
            <p className="text-sm text-orange-700">{lowStock.map(i => i.name).join(", ")}</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Wszystkie pozycje</p>
              <Package className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Wartość magazynu</p>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{totalValue.toLocaleString("pl-PL")} PLN</p>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? "border-orange-200" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Niski stan</p>
              <AlertTriangle className={`h-4 w-4 ${lowStockCount > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
            </div>
            <p className="text-2xl font-bold">{lowStockCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Transakcje</p>
              <ArrowUpRight className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{transactions.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj pozycję
        </Button>
        <Button variant="outline" onClick={() => setShowTransactionForm(true)}>
          <ArrowUpRight className="h-4 w-4 mr-2" />
          Nowa transakcja
        </Button>
        <div className="flex-1" />
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Dodaj nową pozycję</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                placeholder="SKU"
                value={addItemForm.sku}
                onChange={(e) => setAddItemForm({ ...addItemForm, sku: e.target.value })}
              />
              <Input
                placeholder="Nazwa"
                value={addItemForm.name}
                onChange={(e) => setAddItemForm({ ...addItemForm, name: e.target.value })}
              />
              <Input
                placeholder="Kategoria"
                value={addItemForm.category}
                onChange={(e) => setAddItemForm({ ...addItemForm, category: e.target.value })}
              />
              <Input
                placeholder="Jednostka"
                value={addItemForm.unit}
                onChange={(e) => setAddItemForm({ ...addItemForm, unit: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Min. stan"
                value={addItemForm.minStockLevel}
                onChange={(e) => setAddItemForm({ ...addItemForm, minStockLevel: Number(e.target.value) })}
              />
              <Input
                type="number"
                placeholder="Koszt jednostkowy"
                value={addItemForm.unitCost ?? ""}
                onChange={(e) => setAddItemForm({ ...addItemForm, unitCost: Number(e.target.value) || null })}
              />
              <Input
                placeholder="Lokalizacja"
                value={addItemForm.location}
                onChange={(e) => setAddItemForm({ ...addItemForm, location: e.target.value })}
                className="sm:col-span-2"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddItem} disabled={pending}>
                Dodaj
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Anuluj
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Transaction Form */}
      {showTransactionForm && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Nowa transakcja</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={transactionForm.itemId}
                onChange={(e) => setTransactionForm({ ...transactionForm, itemId: e.target.value })}
              >
                <option value="">Wybierz pozycję</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku} - {item.name} (stan: {item.current_stock})
                  </option>
                ))}
              </select>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={transactionForm.type}
                onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value as any })}
              >
                <option value="purchase">Zakup (+)</option>
                <option value="sale">Sprzedaż (-)</option>
                <option value="consumption">Zużycie (-)</option>
                <option value="return">Zwrot (+)</option>
                <option value="adjustment">Korekta</option>
                <option value="transfer">Transfer</option>
              </select>
              <Input
                type="number"
                placeholder="Ilość"
                value={transactionForm.quantity}
                onChange={(e) => setTransactionForm({ ...transactionForm, quantity: Number(e.target.value) })}
              />
              <Input
                type="number"
                placeholder="Koszt jednostkowy"
                value={transactionForm.unitCost ?? ""}
                onChange={(e) => setTransactionForm({ ...transactionForm, unitCost: Number(e.target.value) || null })}
              />
              <Input
                placeholder="Notatki"
                value={transactionForm.notes}
                onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })}
                className="sm:col-span-2"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddTransaction} disabled={pending}>
                Dodaj transakcję
              </Button>
              <Button variant="outline" onClick={() => setShowTransactionForm(false)}>
                Anuluj
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pozycje magazynowe</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak pozycji magazynowych
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    item.current_stock <= item.min_stock_level ? "border-orange-200 bg-orange-50/30" : ""
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{item.name}</p>
                      <span className="text-xs text-muted-foreground">{item.sku}</span>
                      {item.current_stock <= item.min_stock_level && (
                        <AlertTriangle className="h-3 w-3 text-orange-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.category} • {item.unit} • {item.location || "-"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{item.current_stock} {item.unit}</p>
                    <p className="text-xs text-muted-foreground">
                      min: {item.min_stock_level} • wartość: {item.total_value.toLocaleString("pl-PL")} PLN
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Ostatnie transakcje</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak transakcji
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 10).map((tx) => {
                const item = items.find((i) => i.id === tx.item_id);
                const isPositive = tx.type === "purchase" || tx.type === "return";
                return (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {isPositive ? (
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">{item?.name || tx.item_id}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.type} • {new Date(tx.created_at).toLocaleDateString("pl-PL")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                        {isPositive ? "+" : "-"}{tx.quantity} {item?.unit}
                      </p>
                      {tx.notes && <p className="text-xs text-muted-foreground">{tx.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
