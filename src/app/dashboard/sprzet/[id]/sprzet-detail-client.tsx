"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Wrench, Settings, AlertTriangle, Edit, Save, Calendar, DollarSign, MapPin, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateEquipmentStatus,
  type Equipment, type EquipmentStatus, type EquipmentAssignment,
} from "@/lib/actions/equipment";
import { EQUIPMENT_CATEGORY_LABELS } from "@/lib/constants/equipment";

type Props = {
  equipment: Equipment;
  history: EquipmentAssignment[];
};

const STATUS_CONFIG: Record<EquipmentStatus, { label: string; color: string }> = {
  available: { label: "Доступний", color: "bg-green-100 text-green-700" },
  in_use: { label: "Використовується", color: "bg-blue-100 text-blue-700" },
  maintenance: { label: "Сервіс", color: "bg-orange-100 text-orange-700" },
  retired: { label: "Виведено", color: "bg-slate-100 text-slate-500" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 }).format(n);
}

export function SprzetDetailClient({ equipment, history }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: equipment.name,
    brand: equipment.brand || "",
    model: equipment.model || "",
    serialNumber: equipment.serial_number || "",
    year: equipment.year?.toString() || "",
    purchasePrice: equipment.purchase_price?.toString() || "",
    dailyRate: equipment.daily_rate?.toString() || "",
    location: equipment.location || "",
    nextServiceDate: equipment.next_service_date || "",
    insuranceExpiry: equipment.insurance_expiry || "",
    notes: equipment.notes || "",
  });

  function handleSave() {
    setError(null);
    if (!editForm.name.trim()) {
      setError("Назва є обов'язковою");
      return;
    }
    // Save logic would go here
    setIsEditing(false);
  }

  function handleStatus(status: EquipmentStatus) {
    startTransition(async () => {
      await updateEquipmentStatus(equipment.id, status);
      router.refresh();
    });
  }

  const serviceDays = equipment.next_service_date
    ? Math.floor((new Date(equipment.next_service_date).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{equipment.name}</h1>
            <p className="text-sm text-muted-foreground">
              {EQUIPMENT_CATEGORY_LABELS[equipment.category]}
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
            <CardTitle>Редагування обладнання</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Назва</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Марка</Label>
                <Input value={editForm.brand} onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Модель</Label>
                <Input value={editForm.model} onChange={(e) => setEditForm({ ...editForm, model: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Серійний номер</Label>
                <Input value={editForm.serialNumber} onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Рік виробництва</Label>
                <Input type="number" value={editForm.year} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Вартість покупки</Label>
                <Input type="number" value={editForm.purchasePrice} onChange={(e) => setEditForm({ ...editForm, purchasePrice: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Денна ставка</Label>
                <Input type="number" value={editForm.dailyRate} onChange={(e) => setEditForm({ ...editForm, dailyRate: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Локація</Label>
              <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Наступний сервіс</Label>
                <Input type="date" value={editForm.nextServiceDate} onChange={(e) => setEditForm({ ...editForm, nextServiceDate: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Страхування до</Label>
                <Input type="date" value={editForm.insuranceExpiry} onChange={(e) => setEditForm({ ...editForm, insuranceExpiry: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Примітки</Label>
              <Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="mt-1" />
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Статус
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${STATUS_CONFIG[equipment.status].color}`}>
                {STATUS_CONFIG[equipment.status].label}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Вартість
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-2xl font-bold">{equipment.purchase_price ? fmt(equipment.purchase_price) : "-"}</p>
              {equipment.daily_rate && (
                <p className="text-sm text-muted-foreground">{fmt(equipment.daily_rate)}/день</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Локація
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-xl font-bold">{equipment.location || "Не вказано"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {serviceDays !== null && (
        <Card className={serviceDays < 0 || serviceDays <= 14 ? "border-orange-200" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Сервіс
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`font-medium ${serviceDays < 0 ? "text-red-600" : serviceDays <= 14 ? "text-orange-600" : "text-foreground"}`}>
              {serviceDays < 0
                ? `Сервіс прострочено на ${Math.abs(serviceDays)} днів`
                : serviceDays <= 14
                ? `Сервіс через ${serviceDays} днів`
                : `Сервіс: ${new Date(equipment.next_service_date!).toLocaleDateString("uk-UA")}`}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Історія використання
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Немає історії використання</p>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded bg-muted">
                  <div>
                    <p className="text-sm font-medium">Проект: {entry.project_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.assigned_date).toLocaleDateString("uk-UA")}
                      {entry.returned_date && ` - ${new Date(entry.returned_date).toLocaleDateString("uk-UA")}`}
                    </p>
                    {entry.days_used && <p className="text-xs text-muted-foreground">Використано: {entry.days_used} днів</p>}
                  </div>
                  {entry.cost && (
                    <p className="font-semibold">{fmt(entry.cost)}</p>
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
