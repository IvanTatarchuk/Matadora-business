"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Calendar, Settings, Trash2, Save, Plus, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateCrew, deleteCrew, setCrewMembers, assignCrewToProject, deleteCrewAssignment,
  type CrewWithMembers,
} from "@/lib/actions/workforce";
import type { Worker } from "@/types/database";

type Props = {
  crew: CrewWithMembers;
  initialAssignments: any[];
};

export function CrewDetailClient({ crew, initialAssignments }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(crew.name);
  const [editForeman, setEditForeman] = useState(crew.foreman_worker_id || "");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(crew.memberIds);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignForm, setAssignForm] = useState({
    projectId: "",
    startDate: "",
    endDate: "",
    note: "",
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
        note: assignForm.note || undefined,
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
              {crew.memberIds.length} членів · {assignments.length} призначень
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Розклад роботи
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Розклад роботи бригади скоро буде доступний
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Статистика продуктивності</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Статистика продуктивності бригади скоро буде доступна
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
