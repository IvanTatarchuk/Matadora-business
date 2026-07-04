"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Phone, Mail, Globe, Star, Edit, Save, FileText, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  rateSubcontractor,
  type Subcontractor,
} from "@/lib/actions/subcontractors";
import { SPECIALTY_LABELS } from "@/lib/constants/subcontractors";

type Props = {
  subcontractor: Subcontractor;
};

const STATUS_CONFIG = {
  active: { label: "Активний", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  inactive: { label: "Неактивний", color: "bg-slate-100 text-slate-500", icon: XCircle },
  blacklisted: { label: "Заблокований", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

function StarRating({ rating, onRate }: { rating: number | null; onRate: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <button key={s} onClick={() => onRate(s)}
          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}>
          <Star className={`h-4 w-4 transition-colors ${(hover || (rating ?? 0)) >= s ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
        </button>
      ))}
      {rating && <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>}
    </div>
  );
}

export function PodwykonawcaDetailClient({ subcontractor }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: subcontractor.name,
    nip: subcontractor.nip || "",
    regon: subcontractor.regon || "",
    address: subcontractor.address || "",
    city: subcontractor.city || "",
    postalCode: subcontractor.postal_code || "",
    contactName: subcontractor.contact_name || "",
    contactEmail: subcontractor.contact_email || "",
    contactPhone: subcontractor.contact_phone || "",
    website: subcontractor.website || "",
    specialty: subcontractor.specialty,
    insuranceExpiry: subcontractor.insurance_expiry || "",
    licenseNumber: subcontractor.license_number || "",
    notes: subcontractor.notes || "",
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

  function handleRate(rating: number) {
    startTransition(async () => {
      await rateSubcontractor(subcontractor.id, rating);
      router.refresh();
    });
  }

  const statusCfg = STATUS_CONFIG[subcontractor.status];
  const StatusIcon = statusCfg.icon;
  const insuranceDays = subcontractor.insurance_expiry
    ? Math.floor((new Date(subcontractor.insurance_expiry).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{subcontractor.name}</h1>
            <p className="text-sm text-muted-foreground">
              {SPECIALTY_LABELS[subcontractor.specialty]}
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
            <CardTitle>Редагування підрядника</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Назва компанії</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>NIP</Label>
                <Input value={editForm.nip} onChange={(e) => setEditForm({ ...editForm, nip: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>REGON</Label>
                <Input value={editForm.regon} onChange={(e) => setEditForm({ ...editForm, regon: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Адреса</Label>
              <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Місто</Label>
                <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Поштовий індекс</Label>
                <Input value={editForm.postalCode} onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Контактна особа</Label>
                <Input value={editForm.contactName} onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Телефон</Label>
                <Input value={editForm.contactPhone} onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={editForm.contactEmail} onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Веб-сайт</Label>
              <Input value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Страхування до</Label>
                <Input type="date" value={editForm.insuranceExpiry} onChange={(e) => setEditForm({ ...editForm, insuranceExpiry: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Номер ліцензії</Label>
                <Input value={editForm.licenseNumber} onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })} className="mt-1" />
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
              <Building2 className="h-5 w-5" />
              Статус
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${statusCfg.color}`}>
                <StatusIcon className="h-4 w-4" />
                {statusCfg.label}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Оцінка
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <StarRating rating={subcontractor.rating} onRate={handleRate} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Контракти
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-3xl font-bold">{subcontractor.contracts_count || 0}</p>
              <p className="text-sm text-muted-foreground">контрактів</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {insuranceDays !== null && (
        <Card className={insuranceDays < 0 || insuranceDays <= 30 ? "border-orange-200" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Страхування
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`font-medium ${insuranceDays < 0 ? "text-red-600" : insuranceDays <= 30 ? "text-orange-600" : "text-foreground"}`}>
              {insuranceDays < 0
                ? `Страхування закінчилось ${Math.abs(insuranceDays)} днів тому`
                : insuranceDays <= 30
                ? `Страхування закінчується через ${insuranceDays} днів`
                : `Страхування дійсне до: ${new Date(subcontractor.insurance_expiry!).toLocaleDateString("uk-UA")}`}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Контактна інформація</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {subcontractor.city && (
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Місто</p>
                  <p className="font-medium">{subcontractor.city}</p>
                </div>
              </div>
            )}
            {subcontractor.contact_name && (
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Контактна особа</p>
                  <p className="font-medium">{subcontractor.contact_name}</p>
                </div>
              </div>
            )}
            {subcontractor.contact_phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Телефон</p>
                  <p className="font-medium">{subcontractor.contact_phone}</p>
                </div>
              </div>
            )}
            {subcontractor.contact_email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{subcontractor.contact_email}</p>
                </div>
              </div>
            )}
            {subcontractor.website && (
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Веб-сайт</p>
                  <a href={subcontractor.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                    {subcontractor.website}
                  </a>
                </div>
              </div>
            )}
            {subcontractor.nip && (
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">NIP</p>
                  <p className="font-medium">{subcontractor.nip}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {subcontractor.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Примітки</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{subcontractor.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
