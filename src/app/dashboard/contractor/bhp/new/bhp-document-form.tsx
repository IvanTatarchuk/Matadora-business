"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2 } from "lucide-react";

import { saveBhpDocument, deleteBhpDocument, type BhpDocument, type BhpDocType } from "@/lib/actions/bhp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TYPE_OPTIONS: { value: BhpDocType; label: string }[] = [
  { value: "szkolenie_bhp", label: "Instruktaż ogólny BHP" },
  { value: "instrukcja_stanowiskowa", label: "Instrukcja stanowiskowa" },
  { value: "ocena_ryzyka", label: "Ocena ryzyka zawodowego" },
  { value: "lista_pracownikow", label: "Lista pracowników" },
  { value: "wypadek", label: "Zgłoszenie wypadku" },
  { value: "protokol_bhp", label: "Protokół kontroli BHP" },
  { value: "other", label: "Inny dokument" },
];

export function BhpDocumentForm({
  existing,
  defaultType,
}: {
  existing: BhpDocument | null;
  defaultType: BhpDocType;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    doc_type: existing?.doc_type ?? defaultType,
    title: existing?.title ?? "",
    content: existing?.content ?? "",
    valid_from: existing?.valid_from ?? "",
    valid_until: existing?.valid_until ?? "",
  });

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await saveBhpDocument({ id: existing?.id, ...form });
      if (!res.ok) {
        setError(res.error ?? "Błąd zapisu");
        return;
      }
      router.push("/dashboard/contractor/bhp");
    });
  }

  function handleDelete() {
    if (!existing) return;
    if (!confirm("Czy na pewno usunąć ten dokument?")) return;
    startTransition(async () => {
      const res = await deleteBhpDocument(existing.id);
      if (!res.ok) {
        setError(res.error ?? "Błąd usuwania");
        return;
      }
      router.push("/dashboard/contractor/bhp");
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/contractor/bhp"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Wróć do dokumentacji BHP
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{existing ? "Edytuj dokument BHP" : "Nowy dokument BHP"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Typ dokumentu</Label>
            <select
              value={form.doc_type}
              onChange={(e) => setForm({ ...form, doc_type: e.target.value as BhpDocType })}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Tytuł</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="np. Instruktaż ogólny BHP — ekipa murarska"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Treść / notatki</Label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={5}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ważny od</Label>
              <Input
                type="date"
                value={form.valid_from}
                onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Ważny do</Label>
              <Input
                type="date"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={pending}>
              <Save className="h-4 w-4 mr-2" /> Zapisz
            </Button>
            {existing && (
              <Button variant="destructive" onClick={handleDelete} disabled={pending}>
                <Trash2 className="h-4 w-4 mr-2" /> Usuń
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
