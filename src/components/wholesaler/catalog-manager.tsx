"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatPLN } from "@/lib/utils";
import {
  createMaterial,
  updateMaterial,
  deleteMaterial,
  type MaterialInput,
} from "@/lib/actions/materials";
import type { Material, StockStatus } from "@/types/database";

const STOCK_OPTIONS: { value: StockStatus; label: string }[] = [
  { value: "in_stock", label: "Dostępny" },
  { value: "low_stock", label: "Niski stan" },
  { value: "out_of_stock", label: "Brak w magazynie" },
  { value: "on_order", label: "Zamówiony" },
];

const STOCK_LABEL: Record<StockStatus, string> = {
  in_stock: "Dostępny",
  low_stock: "Niski stan",
  out_of_stock: "Brak w magazynie",
  on_order: "Zamówiony",
};

const STOCK_VARIANT: Record<StockStatus, "success" | "warning" | "secondary" | "default"> = {
  in_stock: "success",
  low_stock: "warning",
  out_of_stock: "secondary",
  on_order: "default",
};

const EMPTY: MaterialInput = {
  product_name: "",
  sku: "",
  price_net: 0,
  unit: "szt",
  stock_status: "in_stock",
};

export function CatalogManager({ materials }: { materials: Material[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MaterialInput>(EMPTY);

  function patch(p: Partial<MaterialInput>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  function startEdit(m: Material) {
    setEditingId(m.id);
    setForm({
      product_name: m.product_name,
      sku: m.sku ?? "",
      price_net: Number(m.price_net),
      unit: m.unit,
      stock_status: m.stock_status,
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
  }

  function submit() {
    setError(null);
    if (!form.product_name.trim()) {
      setError("Nazwa produktu jest wymagana.");
      return;
    }
    startTransition(async () => {
      const res = editingId
        ? await updateMaterial(editingId, form)
        : await createMaterial(form);
      if (!res.ok) {
        setError(res.error ?? "Coś poszło nie tak");
        return;
      }
      cancelEdit();
      router.refresh();
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteMaterial(id);
      if (!res.ok) {
        setError(res.error ?? "Nie udało się usunąć");
        return;
      }
      if (editingId === id) cancelEdit();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edytuj produkt" : "Dodaj produkt"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="product_name">Nazwa produktu</Label>
              <Input
                id="product_name"
                value={form.product_name}
                onChange={(e) => patch({ product_name: e.target.value })}
                placeholder="Gładź gipsowa 20kg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={form.sku ?? ""}
                onChange={(e) => patch({ sku: e.target.value })}
                placeholder="GG-20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_net">Cena netto (PLN)</Label>
              <Input
                id="price_net"
                type="number"
                min={0}
                step="0.01"
                value={form.price_net || ""}
                onChange={(e) => patch({ price_net: Number(e.target.value) })}
                placeholder="45.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Jednostka</Label>
              <Input
                id="unit"
                value={form.unit}
                onChange={(e) => patch({ unit: e.target.value })}
                placeholder="szt"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock_status">Stan magazynowy</Label>
              <select
                id="stock_status"
                value={form.stock_status}
                onChange={(e) =>
                  patch({ stock_status: e.target.value as StockStatus })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {STOCK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button onClick={submit} disabled={pending}>
              {editingId ? (
                <>
                  <Pencil className="h-4 w-4" /> Zapisz zmiany
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Dodaj produkt
                </>
              )}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={cancelEdit} disabled={pending}>
                <X className="h-4 w-4" /> Anuluj
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Katalog ({materials.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Brak produktów. Dodaj pierwszy produkt powyżej.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3 font-medium">Produkt</th>
                    <th className="p-3 font-medium">SKU</th>
                    <th className="p-3 text-right font-medium">Cena netto</th>
                    <th className="p-3 font-medium">Jednostka</th>
                    <th className="p-3 font-medium">Stan</th>
                    <th className="p-3 text-right font-medium">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {materials.map((m) => (
                    <tr
                      key={m.id}
                      className={cn(editingId === m.id && "bg-primary/5")}
                    >
                      <td className="p-3 font-medium">{m.product_name}</td>
                      <td className="p-3 text-muted-foreground">
                        {m.sku ?? "—"}
                      </td>
                      <td className="p-3 text-right">
                        {formatPLN(Number(m.price_net))}
                      </td>
                      <td className="p-3 text-muted-foreground">{m.unit}</td>
                      <td className="p-3">
                        <Badge variant={STOCK_VARIANT[m.stock_status]}>
                          {STOCK_LABEL[m.stock_status] ?? m.stock_status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(m)}
                            aria-label="Edytuj"
                            disabled={pending}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(m.id)}
                            aria-label="Usuń"
                            disabled={pending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
