"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createWorker,
  deleteWorker,
  updateWorker,
} from "@/lib/actions/workforce";
import type { Worker } from "@/types/database";

export function WorkersManager({
  orgId,
  initialWorkers,
}: {
  orgId: string;
  initialWorkers: Worker[];
}) {
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

  function add() {
    setError(null);
    if (!form.fullName.trim()) {
      setError("Imię i nazwisko jest wymagane");
      return;
    }
    startTransition(async () => {
      const res = await createWorker({
        orgId,
        fullName: form.fullName,
        specialty: form.specialty,
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : null,
        phone: form.phone,
        email: form.email,
      });
      if (!res.ok) {
        setError(res.error ?? "Błąd zapisu");
        return;
      }
      setForm({ fullName: "", specialty: "", hourlyRate: "", phone: "", email: "" });
      router.refresh();
    });
  }

  function toggleActive(w: Worker) {
    startTransition(async () => {
      await updateWorker(w.id, { is_active: !w.is_active });
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteWorker(id);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Dodaj pracownika</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Imię i nazwisko</Label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Jan Kowalski"
            />
          </div>
          <div className="space-y-1">
            <Label>Specjalizacja</Label>
            <Input
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              placeholder="np. Murarz, Elektryk"
            />
          </div>
          <div className="space-y-1">
            <Label>Stawka godzinowa (PLN/h)</Label>
            <Input
              type="number"
              value={form.hourlyRate}
              onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
              placeholder="80"
            />
          </div>
          <div className="space-y-1">
            <Label>Telefon</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={add} disabled={pending} className="w-full">
            <Plus className="mr-1 h-4 w-4" /> Dodaj pracownika
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Zespół ({initialWorkers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {initialWorkers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak pracowników. Dodaj pierwszego powyżej.</p>
          ) : (
            <div className="divide-y">
              {initialWorkers.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {w.full_name}
                      {!w.is_active && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (nieaktywny)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {[w.specialty, w.hourly_rate ? `${w.hourly_rate}/h` : null, w.phone]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/workers/${w.id}`)}
                      disabled={pending}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(w)}
                      disabled={pending}
                    >
                      {w.is_active ? "Dezaktywuj" : "Aktywuj"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(w.id)}
                      disabled={pending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
