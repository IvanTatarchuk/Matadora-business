"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, CheckCircle2 } from "lucide-react";

import { subscribePrzetargi } from "@/lib/actions/przetargi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ALL_CATS = [
  "Roboty budowlane",
  "Roboty remontowe",
  "Instalacje elektryczne",
  "Instalacje sanitarne",
  "Budownictwo kubaturowe",
  "Infrastruktura",
  "Termomodernizacja",
  "Drogowe",
];

const VOIVODESHIPS = [
  "Mazowieckie", "Małopolskie", "Dolnośląskie", "Śląskie", "Wielkopolskie",
  "Łódzkie", "Pomorskie", "Kujawsko-Pomorskie", "Lubelskie", "Podkarpackie",
  "Warmińsko-Mazurskie", "Zachodniopomorskie", "Lubuskie", "Opolskie",
  "Podlaskie", "Świętokrzyskie",
];

type Subscription = {
  email: string;
  categories: string[];
  voivodeship: string | null;
  is_active: boolean;
} | null;

export function PrzetargiSettingsClient({
  defaultEmail,
  subscription,
}: {
  defaultEmail: string;
  subscription: Subscription;
}) {
  const [email, setEmail] = useState(subscription?.email ?? defaultEmail);
  const [categories, setCategories] = useState<string[]>(subscription?.categories ?? []);
  const [voivodeship, setVoivodeship] = useState(subscription?.voivodeship ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleCat(c: string) {
    setCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
    setSaved(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await subscribePrzetargi(email, categories, voivodeship);
      if (result.ok) {
        setSaved(true);
      } else {
        setError(result.error ?? "Wystąpił błąd. Spróbuj ponownie.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href="/dashboard/contractor/przetargi"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Wróć do przetargów
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> Alerty przetargowe
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Wybierz kategorie robót i województwo — codziennie o 7:00 dostaniesz
            email z dopasowanymi przetargami.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium">Email do powiadomień</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="twoj@firma.pl"
                required
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Kategorie robót (wybierz minimum 1)
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {ALL_CATS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCat(cat)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      categories.includes(cat)
                        ? "border-primary bg-primary text-white"
                        : "border-gray-200 bg-white text-muted-foreground hover:border-primary"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Województwo</label>
              <select
                value={voivodeship}
                onChange={(e) => {
                  setVoivodeship(e.target.value);
                  setSaved(false);
                }}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Cała Polska</option>
                {VOIVODESHIPS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
            {saved && (
              <p className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" /> Zapisano — alerty aktywne.
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              <Bell className="mr-2 h-4 w-4" />
              {pending ? "Zapisywanie..." : subscription ? "Zaktualizuj alerty" : "Aktywuj alerty przetargowe"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
