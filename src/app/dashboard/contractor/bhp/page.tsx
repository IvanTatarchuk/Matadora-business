import Link from "next/link";
import { Plus, ShieldCheck, AlertTriangle, Clock, CheckCircle2, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const BHP_TEMPLATES = [
  {
    type: "szkolenie_bhp",
    title: "Instruktaż ogólny BHP",
    desc: "Obowiązkowy dla każdego nowego pracownika. Ważność: 1 rok.",
    urgency: "high",
    daysLeft: null,
    status: "missing",
  },
  {
    type: "instrukcja_stanowiskowa",
    title: "Instrukcja stanowiskowa — Murarz",
    desc: "Bezpieczne wykonywanie robót murarskich.",
    urgency: "medium",
    daysLeft: 45,
    status: "active",
  },
  {
    type: "ocena_ryzyka",
    title: "Ocena ryzyka zawodowego",
    desc: "Wymagana dla każdego stanowiska na budowie.",
    urgency: "high",
    daysLeft: 12,
    status: "expiring",
  },
  {
    type: "instrukcja_stanowiskowa",
    title: "Instrukcja stanowiskowa — Tynkarz",
    desc: "Bezpieczne wykonywanie robót tynkarskich.",
    urgency: "low",
    daysLeft: 280,
    status: "active",
  },
  {
    type: "protokol_bhp",
    title: "Protokół kontroli BHP na budowie",
    desc: "Tygodniowy protokół inspekcji bezpieczeństwa.",
    urgency: "medium",
    daysLeft: null,
    status: "missing",
  },
];

const STATUS_CONFIG = {
  active:    { label: "Aktywny",    color: "bg-green-100 text-green-700" },
  expiring:  { label: "Wygasa!",    color: "bg-orange-100 text-orange-700" },
  missing:   { label: "Brakuje",    color: "bg-red-100 text-red-700" },
  expired:   { label: "Wygasł",     color: "bg-red-100 text-red-700" },
};

const PIP_FINE = "100 000 zł";

export default function BhpPage() {
  const missing = BHP_TEMPLATES.filter((d) => d.status === "missing").length;
  const expiring = BHP_TEMPLATES.filter((d) => d.status === "expiring").length;
  const active = BHP_TEMPLATES.filter((d) => d.status === "active").length;

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
              <p className="text-xs text-muted-foreground">Wygasa w 30 dni</p>
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

      {/* DOCUMENT LIST */}
      <Card>
        <CardHeader>
          <CardTitle>Dokumenty BHP</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {BHP_TEMPLATES.map((doc, i) => {
              const cfg = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG];
              return (
                <div
                  key={i}
                  className={`rounded-lg border p-4 ${doc.status === "missing" ? "border-red-200 bg-red-50/50" : doc.status === "expiring" ? "border-orange-200 bg-orange-50/50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{doc.title}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{doc.desc}</p>
                      {doc.daysLeft !== null && (
                        <p className={`mt-1 text-xs font-medium ${doc.daysLeft <= 30 ? "text-orange-600" : "text-muted-foreground"}`}>
                          Ważny jeszcze {doc.daysLeft} dni
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {doc.status === "missing" ? (
                        <Button size="sm" variant="destructive" asChild>
                          <Link href="/dashboard/contractor/bhp/new">
                            Dodaj
                          </Link>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" asChild>
                          <Link href="/dashboard/contractor/bhp/new">
                            Edytuj
                          </Link>
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
