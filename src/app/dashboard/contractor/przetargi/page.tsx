import Link from "next/link";
import { Search, Bell, MapPin, Clock, TrendingUp, ExternalLink, ArrowRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Tender = {
  id: string;
  title: string;
  buyer: string;
  location: string;
  voivodeship: string;
  valueMin: number | null;
  deadline: string | null;
  publishedAt: string;
  category: string;
  source: string;
  url: string;
};

async function fetchTenders(): Promise<{ tenders: Tender[]; isDemo: boolean }> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${siteUrl}/api/przetargi?limit=6`, {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    return { tenders: data.tenders ?? [], isDemo: data.success === false };
  } catch {
    return { tenders: [], isDemo: true };
  }
}

export default async function PrzetargiDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (s: any) => s as any;
  const [{ tenders, isDemo }, { data: subscription }] = await Promise.all([
    fetchTenders(),
    db(supabase)
      .from("przetargi_subscriptions")
      .select("id, is_active")
      .eq("email", (user?.email ?? "").toLowerCase().trim())
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const isNew = (publishedAt: string) =>
    Date.now() - new Date(publishedAt).getTime() < 48 * 60 * 60 * 1000;
  const newCount = tenders.filter((t) => isNew(t.publishedAt)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Przetargi AI</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aktualne przetargi budowlane z Biuletynu Zamówień Publicznych
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
              <p className="text-2xl font-bold">{tenders.length}</p>
              <p className="text-xs text-muted-foreground">Przetargów na liście</p>
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
              <strong>Alerty aktywne</strong> — dostajesz codzienne powiadomienia o przetargach.{" "}
              <Link href="/dashboard/contractor/przetargi/settings" className="underline">
                Zmień ustawienia
              </Link>
            </p>
          </CardContent>
        </Card>
      )}

      {isDemo && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-3 text-sm text-amber-800">
            Rejestr przetargów publicznych (BZP) jest chwilowo niedostępny — poniżej dane
            demonstracyjne. Spróbuj ponownie później lub sprawdź{" "}
            <a href="https://bzp.uzp.gov.pl" target="_blank" rel="noreferrer" className="underline">
              bzp.uzp.gov.pl
            </a>{" "}
            bezpośrednio.
          </CardContent>
        </Card>
      )}

      {/* TENDER LIST */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Aktualne przetargi budowlane</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {isDemo ? "Dane demonstracyjne" : "Źródło: BZP"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {tenders.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Brak przetargów do wyświetlenia. Spróbuj ponownie później.
            </p>
          ) : (
            <div className="space-y-3">
              {tenders.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {isNew(t.publishedAt) && (
                          <Badge className="bg-green-500 text-white text-xs">NOWE</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">{t.source}</Badge>
                        <span className="text-xs text-muted-foreground">{t.category}</span>
                      </div>
                      <p className="font-semibold text-sm">{t.title}</p>
                      {t.buyer && (
                        <p className="text-xs text-muted-foreground">{t.buyer}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {t.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {t.location}
                          </span>
                        )}
                        {t.deadline && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> do {new Date(t.deadline).toLocaleDateString("pl-PL")}
                          </span>
                        )}
                      </div>
                    </div>
                    {t.valueMin != null && (
                      <div className="text-right shrink-0">
                        <p className="font-bold text-primary">
                          {new Intl.NumberFormat("pl-PL").format(t.valueMin)} zł
                        </p>
                      </div>
                    )}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
