"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Mail, Phone, DollarSign, Calendar, Settings, Trash2, Save, Users as UsersIcon, Plus, FolderOpen, GraduationCap, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateWorker, deleteWorker, setCrewMembers, createWorkerHistory, deleteWorkerHistory,
  type CrewWithMembers,
} from "@/lib/actions/workforce";
import type { WorkerCertification } from "@/lib/actions/worker-certifications";
import { CERT_LABELS, daysUntilExpiry } from "@/lib/certifications";
import type { Worker } from "@/types/database";

type Props = {
  worker: Worker;
  crews: CrewWithMembers[];
  initialHistory: any[];
  certifications: WorkerCertification[];
};

const EXPIRY_CONFIG = {
  permanent: { label: "Bezterminowe",  color: "bg-blue-100 text-blue-700",     icon: CheckCircle2 },
  ok:        { label: "Ważne",         color: "bg-green-100 text-green-700",   icon: CheckCircle2 },
  warning:   { label: "Wygasa wkrótce",color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
  critical:  { label: "Krytyczne",     color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  expired:   { label: "Wygasłe",       color: "bg-red-100 text-red-700",       icon: XCircle },
  unknown:   { label: "Brak daty",     color: "bg-slate-100 text-slate-500",   icon: CheckCircle2 },
} as const;

function expiryStatus(cert: WorkerCertification): keyof typeof EXPIRY_CONFIG {
  if (cert.is_permanent) return "permanent";
  const days = daysUntilExpiry(cert);
  if (days === null) return "unknown";
  if (days < 0) return "expired";
  if (days <= 30) return "critical";
  if (days <= 60) return "warning";
  return "ok";
}

export function WorkerDetailClient({ worker, crews, initialHistory, certifications }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: worker.full_name,
    specialty: worker.specialty || "",
    hourly_rate: worker.hourly_rate?.toString() || "",
    phone: worker.phone || "",
    email: worker.email || "",
    is_active: worker.is_active,
  });
  const [selectedCrews, setSelectedCrews] = useState(
    crews.filter((crew) => crew.memberIds.includes(worker.id)).map((c) => c.id)
  );
  const [history, setHistory] = useState(initialHistory);
  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [historyForm, setHistoryForm] = useState({
    projectId: "",
    crewId: "",
    startDate: "",
    endDate: "",
    role: "",
    notes: "",
  });

  function handleSave() {
    setError(null);
    if (!editForm.full_name.trim()) {
      setError("Ім'я є обов'язковим");
      return;
    }
    startTransition(async () => {
      const res = await updateWorker(worker.id, {
        full_name: editForm.full_name,
        specialty: editForm.specialty || null,
        hourly_rate: editForm.hourly_rate ? parseFloat(editForm.hourly_rate) : null,
        phone: editForm.phone || null,
        email: editForm.email || null,
        is_active: editForm.is_active,
      });
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      setIsEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("Ви впевнені, що хочете видалити цього працівника?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteWorker(worker.id);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      router.push("/dashboard/workers");
    });
  }

  function toggleCrew(crewId: string) {
    const newSelected = selectedCrews.includes(crewId)
      ? selectedCrews.filter((id) => id !== crewId)
      : [...selectedCrews, crewId];
    setSelectedCrews(newSelected);
    
    // Update crew memberships
    startTransition(async () => {
      for (const crew of crews) {
        const isMember = crew.memberIds.includes(worker.id);
        const shouldBeMember = newSelected.includes(crew.id);
        
        if (isMember !== shouldBeMember) {
          const nextMembers = shouldBeMember
            ? [...crew.memberIds, worker.id]
            : crew.memberIds.filter((id) => id !== worker.id);
          await setCrewMembers(crew.id, nextMembers);
        }
      }
      router.refresh();
    });
  }

  function handleCreateHistory() {
    setError(null);
    if (!historyForm.startDate) {
      setError("Дата початку є обов'язковою");
      return;
    }
    startTransition(async () => {
      const res = await createWorkerHistory({
        workerId: worker.id,
        orgId: worker.org_id,
        projectId: historyForm.projectId || undefined,
        crewId: historyForm.crewId || undefined,
        startDate: historyForm.startDate,
        endDate: historyForm.endDate || undefined,
        role: historyForm.role || undefined,
        notes: historyForm.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      setShowHistoryForm(false);
      setHistoryForm({ projectId: "", crewId: "", startDate: "", endDate: "", role: "", notes: "" });
      // Reload history
      const newHistory = await fetch(`/api/workers/${worker.id}/history`).then(r => r.json());
      setHistory(newHistory);
    });
  }

  function handleDeleteHistory(historyId: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteWorkerHistory(historyId);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      setHistory(history.filter((h) => h.id !== historyId));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{worker.full_name}</h1>
            <p className="text-sm text-muted-foreground">
              {worker.specialty || "Без спеціальності"} · {worker.is_active ? "Активний" : "Неактивний"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? <Save className="h-4 w-4 mr-2" /> : <Settings className="h-4 w-4 mr-2" />}
            {isEditing ? "Зберегти" : "Редагувати"}
          </Button>
          {isEditing && (
            <Button variant="destructive" onClick={handleDelete} disabled={pending}>
              <Trash2 className="h-4 w-4 mr-2" />
              Видалити
            </Button>
          )}
        </div>
      </div>

      {isEditing && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Редагування працівника</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Повне ім'я</Label>
              <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Спеціальність</Label>
              <Input value={editForm.specialty} onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Погодинна ставка</Label>
              <Input type="number" value={editForm.hourly_rate} onChange={(e) => setEditForm({ ...editForm, hourly_rate: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Телефон</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="mt-1" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={editForm.is_active}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
              />
              <label htmlFor="active" className="text-sm">Активний</label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={pending}>
                <Save className="h-4 w-4 mr-2" />
                Зберегти зміни
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Скасувати
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Інформація про працівника
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Повне ім'я</p>
                <p className="font-medium">{worker.full_name}</p>
              </div>
            </div>
            {worker.specialty && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Спеціальність</p>
                  <p className="font-medium">{worker.specialty}</p>
                </div>
              </div>
            )}
            {worker.hourly_rate && (
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Погодинна ставка</p>
                  <p className="font-medium">{worker.hourly_rate} грн/год</p>
                </div>
              </div>
            )}
            {worker.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Телефон</p>
                  <p className="font-medium">{worker.phone}</p>
                </div>
              </div>
            )}
            {worker.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{worker.email}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Статус</p>
                <p className="font-medium">{worker.is_active ? "Активний" : "Неактивний"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Бригади
            </CardTitle>
          </CardHeader>
          <CardContent>
            {crews.length === 0 ? (
              <p className="text-sm text-muted-foreground">Немає бригад</p>
            ) : (
              <div className="space-y-2">
                {crews.map((crew) => (
                  <label key={crew.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCrews.includes(crew.id)}
                      onChange={() => toggleCrew(crew.id)}
                      disabled={pending}
                    />
                    {crew.name}
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Сертифікати та кваліфікації
          </CardTitle>
        </CardHeader>
        <CardContent>
          {certifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Немає доданих сертифікатів</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {certifications.map((cert) => {
                const status = expiryStatus(cert);
                const expCfg = EXPIRY_CONFIG[status];
                const ExpIcon = expCfg.icon;
                const days = daysUntilExpiry(cert);
                return (
                  <div
                    key={cert.id}
                    className={`rounded-lg border p-3 ${status === "expired" ? "border-red-200 bg-red-50/20" : status === "critical" ? "border-orange-200" : ""}`}
                  >
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${expCfg.color}`}>
                      <ExpIcon className="h-3 w-3" />{expCfg.label}
                    </span>
                    <p className="mt-1 font-medium text-sm">
                      {cert.certification_type === "custom" ? cert.custom_name : CERT_LABELS[cert.certification_type]}
                    </p>
                    {cert.is_permanent ? (
                      <p className="text-xs text-blue-600 mt-0.5">Bezterminowe</p>
                    ) : cert.expiry_date ? (
                      <p className={`text-xs mt-0.5 ${days !== null && days < 0 ? "text-red-600" : days !== null && days <= 30 ? "text-orange-600" : "text-muted-foreground"}`}>
                        {days !== null && days < 0
                          ? `Wygasłe ${Math.abs(days)} dni temu`
                          : `Ważne do: ${new Date(cert.expiry_date).toLocaleDateString("pl-PL")}`}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Історія роботи
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowHistoryForm(!showHistoryForm)}>
            <Plus className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {showHistoryForm && (
            <div className="space-y-3 mb-4 p-3 bg-muted rounded">
              <div>
                <Label>Project ID</Label>
                <Input
                  value={historyForm.projectId}
                  onChange={(e) => setHistoryForm({ ...historyForm, projectId: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Crew ID</Label>
                <Input
                  value={historyForm.crewId}
                  onChange={(e) => setHistoryForm({ ...historyForm, crewId: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Дата початку</Label>
                  <Input
                    type="date"
                    value={historyForm.startDate}
                    onChange={(e) => setHistoryForm({ ...historyForm, startDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Дата завершення</Label>
                  <Input
                    type="date"
                    value={historyForm.endDate}
                    onChange={(e) => setHistoryForm({ ...historyForm, endDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>Роль</Label>
                <Input
                  value={historyForm.role}
                  onChange={(e) => setHistoryForm({ ...historyForm, role: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Примітки</Label>
                <Input
                  value={historyForm.notes}
                  onChange={(e) => setHistoryForm({ ...historyForm, notes: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateHistory} disabled={pending}>
                  Додати запис
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowHistoryForm(false)}>
                  Скасувати
                </Button>
              </div>
            </div>
          )}
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Немає історії роботи</p>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded bg-muted">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{entry.start_date}</p>
                      {entry.end_date && (
                        <span className="text-xs text-muted-foreground">- {entry.end_date}</span>
                      )}
                      {entry.role && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {entry.role}
                        </span>
                      )}
                    </div>
                    {entry.projects?.name && (
                      <p className="text-xs text-muted-foreground">📁 {entry.projects.name}</p>
                    )}
                    {entry.crews?.name && (
                      <p className="text-xs text-muted-foreground">👥 {entry.crews.name}</p>
                    )}
                    {entry.notes && (
                      <p className="text-xs text-muted-foreground">{entry.notes}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteHistory(entry.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
