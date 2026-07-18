"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Mail, Phone, DollarSign, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createWorker, setCrewMembers,
  type CrewWithMembers,
} from "@/lib/actions/workforce";

type Props = {
  orgId: string;
  crews: CrewWithMembers[];
};

export function WorkerCreateClient({ orgId, crews }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    specialty: "",
    hourlyRate: "",
    phone: "",
    email: "",
  });
  const [selectedCrews, setSelectedCrews] = useState<string[]>([]);

  function handleSave() {
    setError(null);
    if (!form.fullName.trim()) {
      setError("Ім'я є обов'язковим");
      return;
    }
    startTransition(async () => {
      const res = await createWorker({
        orgId,
        fullName: form.fullName,
        specialty: form.specialty || undefined,
        hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "Помилка");
        return;
      }
      if (res.id && selectedCrews.length > 0) {
        for (const crewId of selectedCrews) {
          await setCrewMembers(crewId, [res.id]);
        }
      }
      router.push("/dashboard/workers");
    });
  }

  function toggleCrew(crewId: string) {
    setSelectedCrews(selectedCrews.includes(crewId)
      ? selectedCrews.filter((id) => id !== crewId)
      : [...selectedCrews, crewId]
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Створити працівника</h1>
          <p className="text-sm text-muted-foreground">
            Додайте нового працівника до організації
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Інформація про працівника</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Powne imię i nazwisko</Label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Іван Петренко"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Спеціальність</Label>
            <Input
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              placeholder="наприклад, Муляр, Електрик"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Погодинна ставка (грн/год)</Label>
            <Input
              type="number"
              value={form.hourlyRate}
              onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
              placeholder="100"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Телефон</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+380 50 123 4567"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="ivan@example.com"
              className="mt-1"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={pending}>
              <Save className="h-4 w-4 mr-2" />
              Зберегти
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Скасувати
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Бригади</CardTitle>
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
  );
}
