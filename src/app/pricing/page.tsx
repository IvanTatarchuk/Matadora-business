import Link from "next/link";
import { HardHat, CheckCircle2, ArrowRight, Zap, Phone, X, Clock, TrendingDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BuyButton } from "./buy-button";

const PAY_PER_USE = [
  {
    name: "Pierwszy kosztorys",
    price: "0",
    priceLabel: "bezpłatnie",
    desc: "Wypróbuj bez rejestracji",
    highlight: false,
    tag: null,
    features: [
      "Kalkulator KNR online",
      "Podgląd w przeglądarce",
      "Eksport PDF",
    ],
    excluded: [
      "Wysyłka do klienta",
      "Podpis elektroniczny",
      "Zapis w chmurze",
      "Faktura KSeF",
    ],
    cta: "Stwórz kosztorys",
    href: "/kosztorys",
  },
  {
    name: "Mały",
    price: "149",
    priceLabel: "zł / kosztorys",
    desc: "Mieszkania, proste remonty",
    highlight: false,
    tag: null,
    tier: "maly" as const,
    features: [
      "Do 30 pozycji KNR",
      "Kalkulacja robocizna + materiały",
      "Eksport PDF ze stopką firmy",
      "Wysyłka do klienta e-mailem",
      "Podpis elektroniczny (art. 60 KC)",
      "Zapis w chmurze (1 rok)",
    ],
    excluded: [
      "Wieloetapowy harmonogram",
      "Faktura KSeF automatyczna",
    ],
  },
  {
    name: "Standardowy",
    price: "299",
    priceLabel: "zł / kosztorys",
    desc: "Większe budowy, inwestycje",
    highlight: true,
    tag: "Najpopularniejszy",
    tier: "standardowy" as const,
    features: [
      "Do 100 pozycji KNR",
      "Wieloetapowy harmonogram",
      "Eksport PDF + .ath (Norma PRO)",
      "Wysyłka do klienta e-mailem",
      "Podpis elektroniczny (art. 60 KC)",
      "Zapis w chmurze (bezterminowo)",
      "Faktura KSeF po akceptacji",
      "Śledzenie projektu po wygraniu",
    ],
    excluded: [],
  },
  {
    name: "Kompleksowy",
    price: "499",
    priceLabel: "zł / kosztorys",
    desc: "Przetargi publiczne, deweloperzy",
    highlight: false,
    tag: null,
    tier: "kompleksowy" as const,
    features: [
      "Nielimitowane pozycje KNR",
      "Wieloetapowy harmonogram Gantt",
      "Eksport PDF + .ath + XML (e-Zamówienia)",
      "Wysyłka do klienta e-mailem",
      "Podpis elektroniczny (art. 60 KC)",
      "Zapis w chmurze (bezterminowo)",
      "Faktura KSeF po akceptacji",
      "Pełny moduł zarządzania projektem",
      "Portal inwestora real-time",
      "Wsparcie priorytetowe",
    ],
    excluded: [],
  },
];

const FAQ = [
  {
    q: "Czy za pierwszy kosztorys naprawdę nie płacę?",
    a: "Tak. Pierwszy kosztorys jest całkowicie bezpłatny — bez karty kredytowej i bez rejestracji. Dopiero przy wysyłce do klienta lub zapisie w chmurze wybierasz opcję płatną.",
  },
  {
    q: "Kiedy opłaca się subskrypcja PRO zamiast pay-per-use?",
    a: "Jeśli tworzysz 3 lub więcej kosztorysy miesięcznie, subskrypcja PRO (499 zł/mies.) jest tańsza — jeden kosztorys standardowy kosztuje 299 zł, więc już przy trzech masz oszczędność.",
  },
  {
    q: "Ile kosztuje kosztorysant na rynku?",
    a: "Stawki rynkowe kosztorysantów to 600–1500 zł za kosztorys, plus czas oczekiwania 3–10 dni roboczych. Matadora daje wynik w 3 minuty, od 149 zł.",
  },
  {
    q: "Czy mogę eksportować kosztorys do formatu Norma PRO?",
    a: "Tak. W opcjach Standardowy i Kompleksowy eksport do formatu .ath (kompatybilny z Norma PRO, ATH) jest dostępny od razu.",
  },
  {
    q: "Co to jest podpis elektroniczny klienta?",
    a: "Klient otrzymuje SMS lub e-mail z linkiem, otwiera kosztorys na telefonie i podpisuje palcem lub myszą. Podpis jest prawnie ważny na podstawie art. 60 KC.",
  },
  {
    q: "Czy mogę anulować subskrypcję PRO w dowolnym momencie?",
    a: "Tak, w każdej chwili bez dodatkowych opłat. Twoje kosztorysy i projekty pozostają dostępne przez 90 dni po anulowaniu.",
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <HardHat className="h-5 w-5 text-white" />
            </div>
            <span>matadora</span>
            <span className="text-primary">.business</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Zaloguj się</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/kosztorys">Stwórz kosztorys</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-16 text-white text-center">
          <div className="container">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium mb-4">
              <Zap className="h-3.5 w-3.5 text-yellow-400" />
              Płacisz za kosztorys — nie za subskrypcję
            </div>
            <h1 className="text-4xl font-extrabold sm:text-5xl">Cennik</h1>
            <p className="mt-4 text-xl text-white/70 max-w-xl mx-auto">
              Pierwszy kosztorys bezpłatnie. Kolejne od 149 zł za sztukę.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-500/20 border border-green-500/30 px-4 py-2 text-sm text-green-300">
              <CheckCircle2 className="h-4 w-4" />
              Bez miesięcznych zobowiązań · Bez karty kredytowej na start
            </div>
          </div>
        </section>

        {/* VS KOSZTORYSANT */}
        <section className="border-b bg-amber-50 py-10">
          <div className="container max-w-3xl">
            <div className="grid gap-4 sm:grid-cols-3 text-center">
              <div className="rounded-xl border border-red-200 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Kosztorysant ręczny</p>
                <p className="text-3xl font-extrabold text-red-500">900 zł</p>
                <p className="text-sm text-muted-foreground mt-1">średnia rynkowa</p>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-red-600">
                  <Clock className="h-3.5 w-3.5" />
                  3–10 dni roboczych
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <TrendingDown className="h-8 w-8 text-green-600 mx-auto" />
                  <p className="mt-1 text-sm font-bold text-green-700">Oszczędzasz</p>
                  <p className="text-2xl font-extrabold text-green-600">751 zł</p>
                  <p className="text-xs text-muted-foreground">vs kosztorys Mały</p>
                </div>
              </div>
              <div className="rounded-xl border border-green-200 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Matadora</p>
                <p className="text-3xl font-extrabold text-green-600">149 zł</p>
                <p className="text-sm text-muted-foreground mt-1">kosztorys Mały</p>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-green-700 font-semibold">
                  <Zap className="h-3.5 w-3.5" />
                  W 3 minuty zamiast 3 dni
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PAY-PER-USE CARDS */}
        <section className="container py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold">Pay-per-use — płać za kosztorys</h2>
            <p className="mt-2 text-muted-foreground">Idealne gdy zlecenia są nieregularne lub dopiero zaczynasz</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 items-start">
            {PAY_PER_USE.map((plan) => (
              <Card
                key={plan.name}
                className={`relative overflow-hidden ${plan.highlight ? "border-primary shadow-2xl" : "border"}`}
              >
                {plan.tag && (
                  <div className="absolute top-0 left-0 right-0 bg-primary py-1.5 text-center text-xs font-bold text-white tracking-widest uppercase">
                    {plan.tag}
                  </div>
                )}
                <CardContent className={`p-5 ${plan.tag ? "pt-9" : ""}`}>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{plan.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{plan.desc}</p>
                  <div className="mt-3 flex items-end gap-1">
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    <span className="mb-1 text-xs text-muted-foreground leading-tight">{plan.priceLabel}</span>
                  </div>
                  <ul className="mt-4 space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-500" />
                        {f}
                      </li>
                    ))}
                    {plan.excluded.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground/50">
                        <X className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {"tier" in plan && plan.tier ? (
                    <BuyButton
                      tier={plan.tier}
                      variant={plan.highlight ? "default" : "outline"}
                      label="Kup kosztorys"
                    />
                  ) : (
                    <Button
                      className="mt-6 w-full"
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <Link href={plan.href}>
                        {plan.cta} <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* PRO SUBSCRIPTION */}
        <section className="bg-slate-900 text-white py-14">
          <div className="container max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Dla aktywnych firm</p>
            <h2 className="text-3xl font-bold">Subskrypcja PRO</h2>
            <div className="mt-4 flex items-end justify-center gap-1">
              <span className="text-6xl font-extrabold">499</span>
              <span className="mb-3 text-xl text-slate-400">zł / miesiąc</span>
            </div>
            <p className="mt-2 text-slate-300">Nielimitowane kosztorysy + pełny projekt management</p>
            <p className="mt-1 text-sm text-slate-400">
              Opłaca się już przy <strong className="text-white">2 kosztorysach Standardowych</strong> miesięcznie (2 × 299 = 598 zł)
            </p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2 text-left max-w-lg mx-auto">
              {[
                "Nielimitowane kosztorysy KNR",
                "Pełny projekt management",
                "Protokoły odbioru + e-podpis",
                "Faktury KSeF automatyczne",
                "Alerty przetargowe",
                "BHP dokumentacja",
                "Harmonogram Gantt",
                "Finanse P&L + payroll",
                "Portal inwestora real-time",
                "Eksport .ath (Norma PRO)",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
                  {f}
                </li>
              ))}
            </ul>
            <Button size="lg" className="mt-8 bg-primary hover:bg-primary/90 font-bold" asChild>
              <Link href="/register?plan=pro">
                Zacznij PRO — 30 dni gratis <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="mt-3 text-xs text-slate-500">Bez karty kredytowej · Anulowanie w każdej chwili</p>
          </div>
        </section>

        {/* FAQ */}
        <section className="container py-14">
          <h2 className="text-center text-2xl font-bold mb-8">Często zadawane pytania</h2>
          <div className="max-w-2xl mx-auto space-y-3">
            {FAQ.map((f) => (
              <div key={f.q} className="rounded-lg border p-5">
                <p className="font-semibold text-sm">{f.q}</p>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary py-14 text-white text-center">
          <div className="container">
            <h2 className="text-3xl font-bold">Zacznij od darmowego kosztorysu</h2>
            <p className="mt-2 text-white/80">Bez rejestracji · Bez karty · Gotowy w 3 minuty</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-bold" asChild>
                <Link href="/kosztorys">
                  Stwórz kosztorys <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10" asChild>
                <Link href="mailto:vanbud.felix@gmail.com">
                  <Phone className="mr-2 h-4 w-4" /> Porozmawiaj z nami
                </Link>
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
