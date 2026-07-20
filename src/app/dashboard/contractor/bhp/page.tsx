import Link from "next/link";
import { Plus, ShieldCheck, AlertTriangle, Clock, CheckCircle2, Camera, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listBhpDocuments, type BhpDocType } from "@/lib/actions/bhp";

const REQUIRED_TYPES: { type: BhpDocType; title: string; desc: string }[] = [
  {
    type: "szkolenie_bhp",
    title: "Instruktaż ogólny BHP",
    desc: "Obowiązkowy dla każdego nowego pracownika. Ważność: 1 rok.",
  },
  {
    type: "instrukcja_stanowiskowa",
    title: "Instrukcja stanowiskowa",
    desc: "Bezpieczne wykonywanie robót dla danego stanowiska.",
  },
  {
    type: "ocena_ryzyka",
    title: "Ocena ryzyka zawodowego",
    desc: "Wymagana dla każdego stanowiska na budowie.",
  },
  {
    type: "lista_pracownikow",
    title: "Lista pracowników z potwierdzeniem szkoleń",
    desc: "Ewidencja przeszkolonych pracowników.",
  },
  {
    type: "protokol_bhp",
    title: "Protokół kontroli BHP na budowie",
    desc: "Tygodniowy protokół inspekcji bezpieczeństwa.",
  },
];

type RowStatus = "active" | "expiring" | "missing" | "expired";

const STATUS_CONFIG: Record<RowStatus, { label: string; color: string }> = {
  active: { label: "Aktywny", color: "bg-green-100 text-green-700" },
  expiring: { label: "Wygasa!", color: "bg-orange-100 text-orange-700" },
  missing: { label: "Brakuje", color: "bg-red-100 text-red-700" },
  expired: { label: "Wygasł", color: "bg-red-100 text-red-700" },
};

const PIP_FINE = "100 000 zł";

export default async function BhpPage() {
  const documents = await listBhpDocuments();

  function latestFor(type: BhpDocType) {
    return documents
      .filter((d) => d.doc_type === type && d.status !== "archived")
      .sort((a, b) => (b.valid_until ?? "").localeCompare(a.valid_until ?? ""))[0];
  }

  const requiredRows = REQUIRED_TYPES.map((req) => {
    const doc = latestFor(req.type);
    let status: RowStatus = "missing";
    let daysLeft: number | null = null;

    if (doc) {
      if (doc.valid_until) {
        daysLeft = Math.floor(
          (new Date(doc.valid_until).getTime() - Date.now()) / 86400000
        );
        status = daysLeft < 0 ? "expired" : daysLeft <= 30 ? "expiring" : "active";
      } else {
        status = "active";
      }
    }

    return { ...req, doc, status, daysLeft };
  });

  const missing = requiredRows.filter((r) => r.status === "missing").length;
  const expiring = requiredRows.filter((r) => r.status === "expiring" || r.status === "expired").length;
  const active = requiredRows.filter((r) => r.status === "active").length;

  // Documents beyond the one shown per required type (older versions, extra
  // instrukcje stanowiskowe for other trades, "other" type docs, etc.)
  const shownIds = new Set(requiredRows.map((r) => r.doc?.id).filter(Boolean));
  const additionalDocs = documents.filter((d) => !shownIds.has(d.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dokumentacja BHP</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kompletna dokumentacja bezpieczeństwa wymagana przez Inspekcję Pracy (PIP)
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/contractor/bhp/new">
            <Plus className="h-4 w-4 mr-2" /> Nowy dokument
          </Link>
        </Button>
      </div>

      {/* AI PHOTO ANALYSIS CTA */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">Analiza BHP zdjęcia budowy</p>
                <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
                  <Sparkles className="mr-1 h-3 w-3" /> AI
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Wgraj zdjęcie placu budowy — AI wskaże naruszenia przepisów BHP z podstawą prawną i
                zaleceniami. 99 zł za jedną analizę.
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/dashboard/contractor/bhp/analiza-zdjecia">
              <Camera className="mr-2 h-4 w-4" /> Analizuj zdjęcie
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* WARNING BANNER */}
      {(missing > 0 || expiring > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-red-800">
                Uwaga: {missing} brakujących i {expiring} wygasających dokumentów BHP
              </p>
              <p className="mt-1 text-sm text-red-700">
                Brak wymaganych dokumentów BHP = kara PIP do <strong>{PIP_FINE}</strong> oraz
                możliwość wstrzymania robót. Uzupełnij dokumentację.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{active}</p>
              <p className="text-xs text-muted-foreground">Aktywnych dokumentów</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{expiring}</p>
              <p className="text-xs text-muted-foreground">Wygasa w 30 dni lub wygasło</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{missing}</p>
              <p className="text-xs text-muted-foreground">Brakujących</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* REQUIRED DOCUMENT LIST */}
      <Card>
        <CardHeader>
          <CardTitle>Wymagane dokumenty BHP</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {requiredRows.map((row) => {
              const cfg = STATUS_CONFIG[row.status];
              return (
                <div
                  key={row.type}
                  className={`rounded-lg border p-4 ${row.status === "missing" ? "border-red-200 bg-red-50/50" : row.status === "expiring" || row.status === "expired" ? "border-orange-200 bg-orange-50/50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{row.doc?.title ?? row.title}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{row.desc}</p>
                      {row.daysLeft !== null && (
                        <p className={`mt-1 text-xs font-medium ${row.daysLeft <= 30 ? "text-orange-600" : "text-muted-foreground"}`}>
                          {row.daysLeft < 0
                            ? `Wygasł ${Math.abs(row.daysLeft)} dni temu`
                            : `Ważny jeszcze ${row.daysLeft} dni`}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {row.status === "missing" ? (
                        <Button size="sm" variant="destructive" asChild>
                          <Link href={`/dashboard/contractor/bhp/new?type=${row.type}`}>Dodaj</Link>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/dashboard/contractor/bhp/new?id=${row.doc!.id}`}>Edytuj</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ADDITIONAL DOCUMENTS */}
      {additionalDocs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pozostałe dokumenty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {additionalDocs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/dashboard/contractor/bhp/new?id=${doc.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/40"
                >
                  <span className="font-medium">{doc.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString("pl-PL")}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* REQUIRED DOCS INFO */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-blue-900">Wymagane przez prawo dokumenty BHP</p>
              <ul className="mt-2 space-y-1 text-sm text-blue-700">
                <li>• Instruktaż ogólny BHP (każdy pracownik, co roku)</li>
                <li>• Instrukcja stanowiskowa (dla każdego stanowiska)</li>
                <li>• Ocena ryzyka zawodowego (aktualizacja co 2 lata)</li>
                <li>• Lista pracowników z potwierdzeniem szkoleń</li>
                <li>• Protokół kontroli BHP (co tydzień na budowie)</li>
              </ul>
              <p className="mt-2 text-xs text-blue-600">
                Podstawa: Kodeks pracy Art. 2373–2375, Rozporządzenie MRPiPS z 2016 r.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
