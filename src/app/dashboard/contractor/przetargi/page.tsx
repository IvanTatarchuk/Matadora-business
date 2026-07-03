import Link from "next/link";
import { Search, Bell, MapPin, Clock, TrendingUp, ExternalLink, ArrowRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SAMPLE_TENDERS = [
  {
    id: "1",
    title: "Budowa hali magazynowej wraz z infrastrukturą techniczną",
    location: "Warszawa, Mazowieckie",
    value: "2 400 000 zł",
    deadline: "2026-06-15",
    category: "Roboty budowlane",
    source: "e-Zamówienia",
    match: 98,
    isNew: true,
    url: "https://ezamowienia.gov.pl",
  },
  {
    id: "2",
    title: "Remont elewacji budynku szkolnego — termomodernizacja",
    location: "Kraków, Małopolskie",
    value: "890 000 zł",
    deadline: "2026-06-18",
    category: "Roboty remontowe",
    source: "BZP",
    match: 94,
    isNew: true,
    url: "https://bzp.uzp.gov.pl",
  },
  {
    id: "3",
    title: "Instalacja systemu fotowoltaicznego na obiektach użyteczności publicznej",
    location: "Gdańsk, Pomorskie",
    value: "650 000 zł",
    deadline: "2026-06-22",
    category: "Instalacje elektryczne",
    source: "TED",
    match: 91,
    isNew: true,
    url: "https://ted.europa.eu",
  },
  {
    id: "4",
    title: "Przebudowa drogi gminnej z budową chodnika i oświetlenia",
    location: "Wrocław, Dolnośląskie",
    value: "1 200 000 zł",
    deadline: "2026-06-20",
    category: "Infrastruktura drogowa",
    source: "BZP",
    match: 87,
    isNew: false,
    url: "https://bzp.uzp.gov.pl",
  },
  {
    id: "5",
    title: "Budowa przedszkola — stan surowy zamknięty i wykończenie wnętrz",
    location: "Poznań, Wielkopolskie",
    value: "3 800 000 zł",
    deadline: "2026-06-25",
    category: "Budownictwo kubaturowe",
    source: "e-Zamówienia",
    match: 85,
    isNew: false,
    url: "https://ezamowienia.gov.pl",
  },
  {
    id: "6",
    title: "Remont kapitalny budynku wielorodzinnego — instalacje sanitarne",
    location: "Łódź, Łódzkie",
    value: "420 000 zł",
    deadline: "2026-06-28",
    category: "Instalacje sanitarne",
    source: "BZP",
    match: 82,
    isNew: false,
    url: "https://bzp.uzp.gov.pl",
  },
];

export default async function PrzetargiDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const newCount = SAMPLE_TENDERS.filter((t) => t.isNew).length;
  const subscription = null; // Will be populated after migration 0012 is applied

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Przetargi AI</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Przetargi z e-Zamówienia, BZP i TED dopasowane do Twojego profilu
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/contractor/przetargi/settings">
            <Bell className="h-4 w-4 mr-2" /> Konfiguruj alerty
          </Link>
        </Button>
      </div>

      {/* STATS */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{SAMPLE_TENDERS.length}</p>
              <p className="text-xs text-muted-foreground">Przetargów dziś</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Bell className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{newCount}</p>
              <p className="text-xs text-muted-foreground">Nowych od wczoraj</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Search className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">200 000+</p>
              <p className="text-xs text-muted-foreground">Przetargów/rok w Polsce</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SUBSCRIPTION STATUS */}
      {!subscription ? (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-4">
            <Bell className="h-10 w-10 text-orange-400 shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-orange-900">Aktywuj codzienne alerty przetargowe</p>
              <p className="mt-1 text-sm text-orange-700">
                Skonfiguruj swoje kategorie i województwo — o 7:00 dostaniesz email
                z przetargami dopasowanymi tylko do Ciebie.
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/dashboard/contractor/przetargi/settings">
                Aktywuj alerty <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Bell className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800">
              <strong>Alerty aktywne</strong> — dostajesz codzienne powiadomienia o przetargach.
              Ostatnia wysyłka: dzisiaj o 07:00.
            </p>
          </CardContent>
        </Card>
      )}

      {/* TENDER LIST */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Przetargi dopasowane do Twojego profilu</CardTitle>
            <Badge variant="secondary" className="text-xs">
              Aktualizacja: dziś 07:00
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {SAMPLE_TENDERS.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {t.isNew && (
                        <Badge className="bg-green-500 text-white text-xs">NOWE</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{t.source}</Badge>
                      <span className="text-xs text-muted-foreground">{t.category}</span>
                    </div>
                    <p className="font-semibold text-sm">{t.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {t.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> do {new Date(t.deadline).toLocaleDateString("pl-PL")}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary">{t.value}</p>
                    <div className="flex items-center gap-1 justify-end mt-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-xs font-semibold text-green-600">{t.match}% match</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button size="sm" variant="outline" asChild>
                    <a href={t.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1 h-3 w-3" /> Otwórz ogłoszenie
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
