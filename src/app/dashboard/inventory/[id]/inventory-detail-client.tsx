"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, TrendingUp, AlertTriangle, Edit, Trash2, Plus, ArrowUpRight, ArrowDownRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateInventoryItem, createInventoryTransaction,
  type InventoryItem, type InventoryTransaction,
} from "@/lib/actions/inventory";

type Props = {
  item: InventoryItem;
  transactions: InventoryTransaction[];
};

export function InventoryDetailClient({ item, transactions }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: item.name,
    description: item.description || "",
    category: item.category || "",
    unit: item.unit,
    minStockLevel: item.min_stock_level,
    maxStockLevel: item.max_stock_level || "",
    unitCost: item.unit_cost || "",
    location: item.location || "",
  });
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    type: "purchase" as "purchase" | "sale" | "transfer" | "adjustment" | "consumption" | "return",
    quantity: 0,
    unitCost: item.unit_cost || "",
    notes: "",
  });

  function handleSave() {
    setError(null);
    if (!editForm.name.trim()) {
      setError("Назва є обов'язковою");
      return;
    }
    startTransition(async () => {
      const res = await updateInventoryItem(item.id, {
        name: editForm.name,
        description: editForm.description,
        category: editForm.category,
        unit: editForm.unit,
        min_stock_level: editForm.minStockLevel,
        max_stock_level: editForm.maxStockLevel ? Number(editForm.maxStockLevel) : undefined,
        unit_cost: editForm.unitCost ? Number(editForm.unitCost) : undefined,
        location: editForm.location,
      });
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      setIsEditing(false);
      router.refresh();
    });
  }

  function handleAddTransaction() {
    setError(null);
    if (transactionForm.quantity <= 0) {
      setError("Кількість має бути більше 0");
      return;
    }
    startTransition(async () => {
      const res = await createInventoryTransaction({
        itemId: item.id,
        type: transactionForm.type,
        quantity: transactionForm.quantity,
        unitCost: transactionForm.unitCost ? Number(transactionForm.unitCost) : undefined,
        notes: transactionForm.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      setShowTransactionForm(false);
      setTransactionForm({ type: "purchase", quantity: 0, unitCost: item.unit_cost || "", notes: "" });
      router.refresh();
    });
  }

  const isLowStock = item.current_stock <= item.min_stock_level;
  const transactionTypeLabels: Record<string, string> = {
    purchase: "Закупівля",
    sale: "Продаж",
    transfer: "Переміщення",
    adjustment: "Коригування",
    consumption: "Використання",
    return: "Повернення",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{item.name}</h1>
            <p className="text-sm text-muted-foreground">
              SKU: {item.sku} · {item.category || "Без категорії"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? <Save className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
            {isEditing ? "Зберегти" : "Редагувати"}
          </Button>
        </div>
      </div>

      {isEditing && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Редагування позиції</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Назва</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Опис</Label>
              <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Категорія</Label>
                <Input value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Одиниця виміру</Label>
                <Input value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Мін. рівень запасу</Label>
                <Input type="number" value={editForm.minStockLevel} onChange={(e) => setEditForm({ ...editForm, minStockLevel: parseFloat(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <Label>Макс. рівень запасу</Label>
                <Input type="number" value={editForm.maxStockLevel} onChange={(e) => setEditForm({ ...editForm, maxStockLevel: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Вартість одиниці</Label>
                <Input type="number" value={editForm.unitCost} onChange={(e) => setEditForm({ ...editForm, unitCost: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Локація</Label>
                <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="mt-1" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={pending}>
                Зберегти зміни
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Скасувати
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className={isLowStock ? "border-orange-200" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Поточний стан
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-4xl font-bold">{item.current_stock}</p>
              <p className="text-sm text-muted-foreground">{item.unit}</p>
              {isLowStock && (
                <div className="flex items-center justify-center gap-1 mt-2 text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Низький рівень</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Загальна вартість
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-4xl font-bold">{item.total_value.toLocaleString("uk-UA")}</p>
              <p className="text-sm text-muted-foreground">грн</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Локація</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-2xl font-bold">{item.location || "Не вказано"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Транзакції</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowTransactionForm(!showTransactionForm)}>
            <Plus className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {showTransactionForm && (
            <div className="space-y-3 mb-4 p-3 bg-muted rounded">
              <div>
                <Label>Тип транзакції</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mt-1"
                  value={transactionForm.type}
                  onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value as any })}
                >
                  <option value="purchase">Закупівля (+)</option>
                  <option value="sale">Продаж (-)</option>
                  <option value="consumption">Використання (-)</option>
                  <option value="return">Повернення (+)</option>
                  <option value="adjustment">Коригування</option>
                  <option value="transfer">Переміщення</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Кількість</Label>
                  <Input type="number" value={transactionForm.quantity} onChange={(e) => setTransactionForm({ ...transactionForm, quantity: parseFloat(e.target.value) })} className="mt-1" />
                </div>
                <div>
                  <Label>Вартість одиниці</Label>
                  <Input type="number" value={transactionForm.unitCost} onChange={(e) => setTransactionForm({ ...transactionForm, unitCost: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Примітки</Label>
                <Input value={transactionForm.notes} onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })} className="mt-1" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddTransaction} disabled={pending}>
                  Додати транзакцію
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowTransactionForm(false)}>
                  Скасувати
                </Button>
              </div>
            </div>
          )}
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Немає транзакцій</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const isPositive = tx.type === "purchase" || tx.type === "return";
                return (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded bg-muted">
                    <div className="flex items-center gap-3">
                      {isPositive ? (
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{transactionTypeLabels[tx.type]}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleString("uk-UA")}
                        </p>
                        {tx.notes && <p className="text-xs text-muted-foreground">{tx.notes}</p>}
                      </div>
                    </div>
                    <p className={`font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                      {isPositive ? "+" : "-"}{tx.quantity} {item.unit}
                    </p>
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
