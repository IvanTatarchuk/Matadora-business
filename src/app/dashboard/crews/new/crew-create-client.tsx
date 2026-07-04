"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCrew, setCrewMembers } from "@/lib/actions/workforce";
import type { Worker } from "@/types/database";

type Props = {
  orgId: string;
  workers: Worker[];
};

export function CrewCreateClient({ orgId, workers }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [foreman, setForeman] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Назва бригади є обов'язковою");
      return;
    }
    startTransition(async () => {
      const res = await createCrew(orgId, name, foreman || null);
      if (!res.ok) { setError(res.error ?? "Помилка"); return; }
      if (selectedMembers.length > 0 && res.id) {
        const membersRes = await setCrewMembers(res.id, selectedMembers);
        if (!membersRes.ok) { setError(membersRes.error ?? "Помилка"); return; }
      }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Нова бригада</h1>
          <p className="text-sm text-muted-foreground">
            Створіть нову бригаду та додайте членів
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Інформація про бригаду</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Назва бригади</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Бригада A"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Бригадир</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mt-1"
              value={foreman}
              onChange={(e) => setForeman(e.target.value)}
            >
              <option value="">— немає —</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.full_name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Члени бригади
          </CardTitle>
        </CardHeader>
        <CardContent>
          {workers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Спочатку додайте працівників
            </p>
          ) : (
            <div className="space-y-2">
              {workers.map((w) => (
                <label key={w.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(w.id)}
                    onChange={() => toggleMember(w.id)}
                    disabled={pending}
                  />
                  {w.full_name}
                  {w.specialty && (
                    <span className="text-muted-foreground">
                      · {w.specialty}
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            Вибрано: {selectedMembers.length} працівників
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={pending}>
          <Save className="h-4 w-4 mr-2" />
          Створити бригаду
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Скасувати
        </Button>
      </div>
    </div>
  );
}
