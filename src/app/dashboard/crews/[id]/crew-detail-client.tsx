"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Calendar, Settings, Trash2, Save, Plus, FolderOpen, Clock, BarChart3, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateCrew, deleteCrew, setCrewMembers, assignCrewToProject, deleteCrewAssignment,
  createCrewSchedule, deleteCrewSchedule, type ShiftType,
  type CrewWithMembers,
} from "@/lib/actions/workforce";
import type { WorkerCertification } from "@/lib/actions/worker-certifications";
import { CERT_LABELS, daysUntilExpiry } from "@/lib/certifications";
import type { Worker } from "@/types/database";

type Props = {
  crew: CrewWithMembers;
  initialAssignments: any[];
  initialSchedules: any[];
  initialProductivityStats: {
    totalHoursWorked: number;
    totalTasksCompleted: number;
    totalTasksTotal: number;
    averageEfficiency: number;
    averageQuality: number;
  };
  expiringCertifications: WorkerCertification[];
};

export function CrewDetailClient({ crew, initialAssignments, initialSchedules, initialProductivityStats, expiringCertifications }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(crew.name);
  const [editForeman, setEditForeman] = useState(crew.foreman_worker_id || "");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(crew.memberIds);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [schedules, setSchedules] = useState(initialSchedules);
  const [productivityStats, setProductivityStats] = useState(initialProductivityStats);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [assignForm, setAssignForm] = useState({
    projectId: "",
    startDate: "",
    endDate: "",
    note: "",
  });
  const [scheduleForm, setScheduleForm] = useState({
    shiftDate: "",
    shiftType: "morning" as ShiftType,
    startTime: "08:00",
    endTime: "16:00",
    breakDuration: 60,
    location: "",
    notes: "",
  });

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await updateCrew(crew.id, {
        name: editName,
        foreman_worker_id: editForeman || null,
      });
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      const membersRes = await setCrewMembers(crew.id, selectedMembers);
      if (!membersRes.ok) { setError(membersRes.error ?? "Помилка"); return; }
      setIsEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("Ви впевнені, що хочете видалити цю бригаду?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteCrew(crew.id);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      router.push("/dashboard/crews");
    });
  }

  function toggleMember(workerId: string) {
    if (selectedMembers.includes(workerId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== workerId));
    } else {
      setSelectedMembers([...selectedMembers, workerId]);
    }
  }

  function handleAssign() {
    setError(null);
    if (!assignForm.projectId) {
      setError("ID проекту є обов'язковим");
      return;
    }
    startTransition(async () => {
      const res = await assignCrewToProject({
        crewId: crew.id,
        projectId: assignForm.projectId,
        startDate: assignForm.startDate || null,
        endDate: assignForm.endDate || null,
        note: assignForm.note || null,
      });
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      setShowAssignForm(false);
      setAssignForm({ projectId: "", startDate: "", endDate: "", note: "" });
      // Reload assignments
      const newAssignments = await fetch(`/api/crews/${crew.id}/assignments`).then(r => r.json());
      setAssignments(newAssignments);
    });
  }

  function handleDeleteAssignment(assignmentId: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteCrewAssignment(assignmentId);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      setAssignments(assignments.filter((a) => a.id !== assignmentId));
    });
  }

  function handleCreateSchedule() {
    setError(null);
    if (!scheduleForm.shiftDate) {
      setError("Дата зміни є обов'язковою");
      return;
    }
    startTransition(async () => {
      const res = await createCrewSchedule({
        crewId: crew.id,
        orgId: crew.org_id,
        shiftDate: scheduleForm.shiftDate,
        shiftType: scheduleForm.shiftType,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        breakDuration: scheduleForm.breakDuration,
        location: scheduleForm.location || undefined,
        notes: scheduleForm.notes || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      setShowScheduleForm(false);
      setScheduleForm({
        shiftDate: "",
        shiftType: "morning",
        startTime: "08:00",
        endTime: "16:00",
        breakDuration: 60,
        location: "",
        notes: "",
      });
      // Reload schedules
      const newSchedules = await fetch(`/api/crews/${crew.id}/schedules`).then(r => r.json());
      setSchedules(newSchedules);
    });
  }

  function handleDeleteSchedule(scheduleId: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteCrewSchedule(scheduleId);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      setSchedules(schedules.filter((s) => s.id !== scheduleId));
    });
  }

  const shiftTypeLabels: Record<ShiftType, string> = {
    morning: "Ранкова",
    afternoon: "Денна",
    evening: "Вечірня",
    night: "Нічна",
    full_day: "Повний день",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{crew.name}</h1>
            <p className="text-sm text-muted-foreground">
              {crew.memberIds.length} членів · {assignments.length} призначень · {schedules.length} змін
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
            <CardTitle>Редагування бригади</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Назва бригади</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Бригадир</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mt-1"
                value={editForeman}
                onChange={(e) => setEditForeman(e.target.value)}
              >
                <option value="">— немає —</option>
              </select>
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
              <Users className="h-5 w-5" />
              Члени бригади
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Немає членів бригади</p>
            ) : (
              <div className="space-y-2">
                {selectedMembers.map((memberId) => (
                  <div key={memberId} className="flex items-center justify-between p-2 rounded bg-muted">
                    <span className="text-sm">Worker ID: {memberId}</span>
                    {isEditing && (
                      <Button variant="ghost" size="sm" onClick={() => toggleMember(memberId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Призначення до проектів
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowAssignForm(!showAssignForm)}>
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {expiringCertifications.length > 0 && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <p className="mb-1 flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Перед призначенням перевірте кваліфікації
                </p>
                <ul className="list-disc space-y-0.5 pl-4">
                  {expiringCertifications.map((cert) => {
                    const days = daysUntilExpiry(cert);
                    const label = cert.certification_type === "custom" ? cert.custom_name : CERT_LABELS[cert.certification_type];
                    return (
                      <li key={cert.id}>
                        {cert.worker_name ?? "Робітник"} — {label}{" "}
                        {days !== null && days < 0 ? "(термін дії закінчився)" : `(закінчується через ${days} дн.)`}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {showAssignForm && (
              <div className="space-y-3 mb-4 p-3 bg-muted rounded">
                <div>
                  <Label>Project ID</Label>
                  <Input
                    value={assignForm.projectId}
                    onChange={(e) => setAssignForm({ ...assignForm, projectId: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Дата початку</Label>
                  <Input
                    type="date"
                    value={assignForm.startDate}
                    onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Дата завершення</Label>
                  <Input
                    type="date"
                    value={assignForm.endDate}
                    onChange={(e) => setAssignForm({ ...assignForm, endDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Примітка</Label>
                  <Input
                    value={assignForm.note}
                    onChange={(e) => setAssignForm({ ...assignForm, note: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAssign} disabled={pending}>
                    Призначити
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowAssignForm(false)}>
                    Скасувати
                  </Button>
                </div>
              </div>
            )}
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Немає призначень</p>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-2 rounded bg-muted">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{assignment.projects?.name || "Project"}</p>
                      {assignment.start_date && (
                        <p className="text-xs text-muted-foreground">
                          {assignment.start_date} - {assignment.end_date || "present"}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteAssignment(assignment.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Розклад роботи
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowScheduleForm(!showScheduleForm)}>
            <Plus className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {showScheduleForm && (
            <div className="space-y-3 mb-4 p-3 bg-muted rounded">
              <div>
                <Label>Дата зміни</Label>
                <Input
                  type="date"
                  value={scheduleForm.shiftDate}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, shiftDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Тип зміни</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mt-1"
                  value={scheduleForm.shiftType}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, shiftType: e.target.value as ShiftType })}
                >
                  <option value="morning">Ранкова</option>
                  <option value="afternoon">Денна</option>
                  <option value="evening">Вечірня</option>
                  <option value="night">Нічна</option>
                  <option value="full_day">Повний день</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Час початку</Label>
                  <Input
                    type="time"
                    value={scheduleForm.startTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Час завершення</Label>
                  <Input
                    type="time"
                    value={scheduleForm.endTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>Перерва (хвилин)</Label>
                <Input
                  type="number"
                  value={scheduleForm.breakDuration}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, breakDuration: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Локація</Label>
                <Input
                  value={scheduleForm.location}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Примітки</Label>
                <Input
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateSchedule} disabled={pending}>
                  Додати зміну
                </Button>
    <Button variant="outline" size="sm" onClick={() => setShowScheduleForm(false)}>
                  Скасувати
                </Button>
              </div>
            </div>
          )}
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Немає розкладу</p>
          ) : (
            <div className="space-y-2">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between p-3 rounded bg-muted">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{schedule.shift_date}</p>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {shiftTypeLabels[schedule.shift_type as ShiftType]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {schedule.start_time} - {schedule.end_time}
                      {schedule.break_duration > 0 && ` · ${schedule.break_duration} хв перерва`}
                    </p>
                    {schedule.location && (
                      <p className="text-xs text-muted-foreground">📍 {schedule.location}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteSchedule(schedule.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Статистика продуктивності
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-3 bg-muted rounded">
              <p className="text-sm text-muted-foreground">Всього годин роботи</p>
              <p className="text-2xl font-bold">{productivityStats.totalHoursWorked.toFixed(1)}</p>
            </div>
            <div className="p-3 bg-muted rounded">
              <p className="text-sm text-muted-foreground">Завдань виконано</p>
              <p className="text-2xl font-bold">{productivityStats.totalTasksCompleted} / {productivityStats.totalTasksTotal}</p>
            </div>
            <div className="p-3 bg-muted rounded">
              <p className="text-sm text-muted-foreground">Середня ефективність</p>
              <p className="text-2xl font-bold">{productivityStats.averageEfficiency.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-muted rounded">
              <p className="text-sm text-muted-foreground">Середня якість</p>
              <p className="text-2xl font-bold">{productivityStats.averageQuality.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
