"use client";

import { useState, useTransition } from "react";
import { subscribePrzetargi } from "@/lib/actions/przetargi";
import Link from "next/link";
import {
  HardHat,
  Bell,
  Search,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Zap,
  Building2,
  Clock,
  TrendingUp,
  Filter,
  Mail,
  Phone,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const SAMPLE_TENDERS = [
  {
    id: 1,
    title: "Budowa hali magazynowej wraz z infrastrukturą techniczną",
    location: "Warszawa, Mazowieckie",
    value: "2 400 000 zł",
    deadline: "2026-06-15",
    category: "Roboty budowlane",
    source: "e-Zamówienia",
    match: 98,
    new: true,
  },
  {
    id: 2,
    title: "Remont elewacji budynku szkolnego — termomodernizacja",
    location: "Kraków, Małopolskie",
    value: "890 000 zł",
    deadline: "2026-06-18",
    category: "Roboty remontowe",
    source: "BZP",
    match: 94,
    new: true,
  },
  {
    id: 3,
    title: "Przebudowa drogi gminnej z budową chodnika",
    location: "Wrocław, Dolnośląskie",
    value: "1 200 000 zł",
    deadline: "2026-06-20",
    category: "Infrastruktura",
    source: "BZP",
    match: 87,
    new: false,
  },
  {
    id: 4,
    title: "Instalacja systemu fotowoltaicznego na obiektach użyteczności",
    location: "Gdańsk, Pomorskie",
    value: "650 000 zł",
    deadline: "2026-06-22",
    category: "Instalacje elektryczne",
    source: "TED",
    match: 91,
    new: true,
  },
  {
    id: 5,
    title: "Budowa przedszkola — stan surowy i wykończenie",
    location: "Poznań, Wielkopolskie",
    value: "3 800 000 zł",
    deadline: "2026-06-25",
    category: "Budownictwo kubaturowe",
    source: "e-Zamówienia",
    match: 85,
    new: false,
  },
];

const STATS = [
  { value: "200 000+", label: "Przetargów rocznie w Polsce" },
  { value: "87%", label: "Firm pomija przetargi przez brak czasu" },
  { value: "0 zł", label: "Konfiguracja alertów — bezpłatna" },
  { value: "< 5 min", label: "Konfiguracja alertów" },
];

const SOURCES = [
  { name: "e-Zamówienia", desc: "Ogólnopolski portal zamówień publicznych", count: "80 000+ ogłoszeń/rok" },
  { name: "BZP", desc: "Biuletyn Zamówień Publicznych", count: "60 000+ ogłoszeń/rok" },
  { name: "TED", desc: "Tenders Electronic Daily (UE)", count: "30 000+ ogłoszeń/rok" },
  { name: "Portale samorządowe", desc: "Urzędy miast i gmin", count: "50 000+ ogłoszeń/rok" },
];

export default function PrzetargiPage() {
  const [email, setEmail] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [voivodeship, setVoivodeship] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  function toggleCat(c: string) {
    setCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await subscribePrzetargi(email, categories, voivodeship);
      if (result.ok) {
        setSubmitted(true);
      } else {
        setFormError(result.error ?? "Wystąpił błąd. Spróbuj ponownie.");
      }
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 whitespace-nowrap font-extrabold text-xl tracking-tight">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
              <HardHat className="h-5 w-5 text-white" />
            </div>
            <span>
              MATADORA<span className="text-primary">.business</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Zaloguj się</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Zacznij za darmo</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900/80 py-20 text-white">
          <div className="container text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium">
              <Zap className="h-3.5 w-3.5 text-yellow-400" />
              200 000+ przetargów rocznie — AI dobiera tylko te dla Ciebie
            </div>
            <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-extrabold leading-tight">
              Przetargi budowlane{" "}
              <span className="text-orange-400">dopasowane przez AI</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-xl text-white/80">
              Codziennie o 7:00 rano dostajesz email z przetargami z e-Zamówienia,
              BZP i TED dopasowanymi do Twojej specjalizacji i lokalizacji.
              Nigdy więcej nie przegap intratnego zlecenia.
            </p>
          </div>
        </section>

        {/* STATS */}
        <section className="border-b bg-orange-50 py-10">
          <div className="container grid grid-cols-2 gap-6 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-extrabold text-orange-600">{s.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MAIN CONTENT: SIGNUP + SAMPLE */}
        <section className="container py-16">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* LEFT: SIGNUP FORM */}
            <div>
              <h2 className="text-2xl font-bold">
                Skonfiguruj alerty przetargowe — bezpłatnie
              </h2>
              <p className="mt-2 text-muted-foreground">
                Podaj swój email i wybierz kategorie. Jutro rano dostaniesz
                pierwszą listę przetargów dopasowanych do Twojej firmy.
              </p>

              {submitted ? (
                <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                  <h3 className="mt-3 text-lg font-bold text-green-800">Gotowe!</h3>
                  <p className="mt-1 text-green-700">
                    Jutro o 7:00 dostaniesz pierwsze alerty przetargowe.
                  </p>
                  <Button className="mt-4" asChild>
                    <Link href="/register">
                      Utwórz pełne konto — zarządzaj projektami →
                    </Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  <div>
                    <label className="text-sm font-medium">Email firmowy</label>
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
                      onChange={(e) => setVoivodeship(e.target.value)}
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    >
                      <option value="">Cała Polska</option>
                      <option>Mazowieckie</option>
                      <option>Małopolskie</option>
                      <option>Dolnośląskie</option>
                      <option>Śląskie</option>
                      <option>Wielkopolskie</option>
                      <option>Łódzkie</option>
                      <option>Pomorskie</option>
                      <option>Kujawsko-Pomorskie</option>
                      <option>Lubelskie</option>
                      <option>Podkarpackie</option>
                      <option>Warmińsko-Mazurskie</option>
                      <option>Zachodniopomorskie</option>
                      <option>Lubuskie</option>
                      <option>Opolskie</option>
                      <option>Podlaskie</option>
                      <option>Świętokrzyskie</option>
                    </select>
                  </div>
                  {formError && (
                    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                      {formError}
                    </p>
                  )}
                  <Button type="submit" size="lg" className="w-full" disabled={pending}>
                    <Bell className="mr-2 h-4 w-4" />
                    {pending ? "Zapisywanie..." : "Aktywuj alerty przetargowe — bezpłatnie"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Bez karty kredytowej · Wypisz się w każdej chwili
                  </p>
                </form>
              )}

              {/* SOURCES */}
              <div className="mt-8">
                <p className="text-sm font-semibold text-muted-foreground mb-3">
                  Monitorujemy automatycznie:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {SOURCES.map((s) => (
                    <div key={s.name} className="rounded-lg border p-3">
                      <p className="font-semibold text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: SAMPLE TENDERS */}
            <div>
              <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-2xl font-bold">Przykładowe przetargi</h2>
                <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 bg-orange-50">
                  ⚠️ Dane demonstracyjne — nie są ogłoszeniami aktualnymi
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                Poniższe ogłoszenia służą wyłącznie jako przykład działania systemu.
                Aktualne przetargi z e-Zamówienia, BZP i TED są dostępne po rejestracji.
                Przed złożeniem oferty zawsze weryfikuj dane na{" "}
                <a href="https://ezamowienia.gov.pl" target="_blank" rel="noopener noreferrer" className="underline text-primary">ezamowienia.gov.pl</a>.
              </p>
              <div className="space-y-3">
                {SAMPLE_TENDERS.map((t) => (
                  <Card
                    key={t.id}
                    className="border transition-shadow hover:shadow-md"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {t.new && (
                              <Badge className="bg-green-500 text-white text-xs px-2 py-0">
                                NOWE
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {t.source}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {t.category}
                            </span>
                          </div>
                          <p className="mt-1.5 font-semibold text-sm leading-snug">
                            {t.title}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {t.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> do{" "}
                              {new Date(t.deadline).toLocaleDateString("pl-PL")}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-primary">{t.value}</p>
                          <div className="mt-1 flex items-center gap-1 justify-end">
                            <TrendingUp className="h-3 w-3 text-green-500" />
                            <span className="text-xs font-semibold text-green-600">
                              {t.match}% match
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Widzisz tylko 5 z 47 przetargów dopasowanych dziś.{" "}
                <Link href="/register" className="font-medium text-primary hover:underline">
                  Zaloguj się aby zobaczyć wszystkie →
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-slate-50 py-16">
          <div className="container">
            <h2 className="text-center text-3xl font-bold">Jak działają alerty AI?</h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {[
                {
                  step: "1",
                  icon: Filter,
                  title: "Skonfigurujesz raz",
                  desc: "Podajesz kategorie robót, lokalizację, minimalną wartość. AI uczy się Twojego profilu.",
                },
                {
                  step: "2",
                  icon: Search,
                  title: "AI skanuje 24/7",
                  desc: "Codziennie przeszukujemy e-Zamówienia, BZP, TED i portale samorządowe — ponad 700 źródeł.",
                },
                {
                  step: "3",
                  icon: Mail,
                  title: "Dostajesz dopasowane",
                  desc: "O 7:00 email z listą przetargów posortowanych wg dopasowania. Klikasz, czytasz, składasz ofertę.",
                },
              ].map((s) => (
                <div key={s.step} className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white text-xl font-bold">
                    {s.step}
                  </div>
                  <h3 className="font-bold text-lg">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary py-16 text-white text-center">
          <div className="container">
            <h2 className="text-3xl font-bold">
              Przestań tracić przetargi przez brak czasu
            </h2>
            <p className="mt-3 text-xl text-white/80">
              Dołącz do firm które wygrywają więcej zleceń publicznych
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-bold" asChild>
                <Link href="/register">
                  Zacznij za darmo <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10" asChild>
                <Link href="/pricing">Zobacz cennik →</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} matadora.business ·{" "}
          <Link href="/" className="hover:text-foreground">Strona główna</Link>
          {" · "}
          <Link href="/kosztorys" className="hover:text-foreground">Kosztorys online</Link>
          {" · "}
          <Link href="/o-nas" className="hover:text-foreground">O nas</Link>
          {" · "}
          <Link href="/regulamin" className="hover:text-foreground">Regulamin</Link>
          {" · "}
          <Link href="/polityka-prywatnosci" className="hover:text-foreground">Polityka prywatności</Link>
        </div>
      </footer>
    </div>
  );
}
