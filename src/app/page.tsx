import Link from "next/link";
import {
  HardHat,
  Building2,
  Truck,
  ArrowRight,
  FileText,
  CheckCircle2,
  PackageCheck,
  Search,
  ShieldCheck,
  Zap,
  BarChart3,
  Bell,
  FileSignature,
  Hammer,
  Users,

  TrendingUp,
  Lock,
  Phone,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATS = [
  { value: "< 5 min", label: "Do pierwszego kosztorysu" },
  { value: "0 zł", label: "Cała platforma, na zawsze" },
  { value: "500 zł", label: "Analiza AI kosztorysu z PDF" },
  { value: "KSeF", label: "Zgodność z e-fakturą" },
];

const FEATURES = [
  {
    icon: FileText,
    title: "Kosztorys online",
    badge: "BEZPŁATNIE",
    badgeColor: "bg-green-100 text-green-700",
    desc: "Twórz profesjonalne kosztorysy zgodne z normami KNR bez instalacji. Zastąp Norma PRO w przeglądarce. Eksport PDF i .ath.",
    href: "/kosztorys",
    cta: "Stwórz kosztorys →",
  },
  {
    icon: Search,
    title: "Przetargi AI",
    badge: "HOT",
    badgeColor: "bg-orange-100 text-orange-700",
    desc: "Codzienne powiadomienia o przetargach budowlanych z e-Zamówienia, BZP i TED dopasowane do Twojego profilu. Nigdy więcej nie przegap zlecenia.",
    href: "/przetargi",
    cta: "Subskrybuj alerty →",
  },
  {
    icon: FileSignature,
    title: "Protokół odbioru",
    badge: "NOWE",
    badgeColor: "bg-blue-100 text-blue-700",
    desc: "Cyfrowe podpisanie protokołu odbioru robót na telefonie. Faktura KSeF generuje się automatycznie. Otrzymuj zapłatę 6 tygodni szybciej.",
    href: "/register",
    cta: "Wypróbuj →",
  },
  {
    icon: ShieldCheck,
    title: "BHP Dokumentacja",
    badge: "OBOWIĄZKOWE",
    badgeColor: "bg-red-100 text-red-700",
    desc: "Kompletna dokumentacja BHP zgodna z przepisami PIP. Szkolenia, instrukcje, ocena ryzyka. Unikaj kar do 100 000 zł.",
    href: "/register",
    cta: "Sprawdź →",
  },
  {
    icon: Building2,
    title: "Portal inwestora",
    badge: "TRANSPARENTNOŚĆ",
    badgeColor: "bg-purple-100 text-purple-700",
    desc: "Inwestor widzi postęp budowy w czasie rzeczywistym: zdjęcia, harmonogram, wydatki. Koniec z telefonami 'jak idzie budowa?'",
    href: "/register",
    cta: "Zobacz demo →",
  },
  {
    icon: BarChart3,
    title: "Finanse projektu",
    badge: "P&L",
    badgeColor: "bg-slate-100 text-slate-700",
    desc: "Zysk, koszty, czas pracy brygady — wszystko w jednym miejscu. Wiedz dokładnie ile zarabiasz na każdym projekcie.",
    href: "/register",
    cta: "Zarządzaj →",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: FileText,
    title: "Stwórz kosztorys",
    desc: "Wykonawca tworzy profesjonalny kosztorys etapowy z KNR w kilka minut.",
  },
  {
    step: "02",
    icon: CheckCircle2,
    title: "Klient akceptuje online",
    desc: "Inwestor przegląda i akceptuje przez bezpieczny link. Żadnych maili i wydruków.",
  },
  {
    step: "03",
    icon: PackageCheck,
    title: "Projekt automatycznie",
    desc: "Po akceptacji projekt, harmonogram i budżet są gotowe. Baza materiałów zamówiona.",
  },
  {
    step: "04",
    icon: FileSignature,
    title: "Protokół i faktura",
    desc: "Po ukończeniu etapu klient podpisuje protokół → faktura KSeF w 1 kliknięciu.",
  },
];



const COMPARISON = [
  { feature: "Kosztorys online (przeglądarka)", us: true, norma: false, planradar: false },
  { feature: "Alerty przetargowe AI", us: true, norma: false, planradar: false },
  { feature: "Protokół odbioru cyfrowy", us: true, norma: false, planradar: true },
  { feature: "Faktury KSeF automatyczne", us: true, norma: false, planradar: false },
  { feature: "BHP dokumentacja", us: true, norma: false, planradar: false },
  { feature: "Portal inwestora real-time", us: true, norma: false, planradar: true },
  { feature: "Zarządzanie projektem", us: true, norma: false, planradar: true },
  { feature: "Mobile / offline", us: true, norma: false, planradar: true },
  { feature: "Cena miesięczna", us: "99 zł", norma: "167 zł", planradar: "420 zł" },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <HardHat className="h-5 w-5 text-white" />
            </div>
            <span>matadora</span>
            <span className="text-primary">.business</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <Link href="/kosztorys" className="text-muted-foreground hover:text-foreground">Kosztorys</Link>
            <Link href="/przetargi" className="text-muted-foreground hover:text-foreground">Przetargi</Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">Cennik</Link>
            <Link href="/o-nas" className="text-muted-foreground hover:text-foreground">O nas</Link>
          </nav>
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
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-primary/90 py-24 text-white">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="container relative text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur">
              <Zap className="h-3.5 w-3.5 text-yellow-400" />
              Jedyna polska platforma łącząca kosztorys, projekty i przetargi
            </div>
            <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
              Platforma dla polskich{" "}
              <span className="text-primary">firm budowlanych</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-xl text-white/80">
              Kosztorys online, alerty przetargowe AI, cyfrowe protokoły odbioru,
              BHP i zarządzanie projektami — wszystko w jednym miejscu,{" "}
              <span className="font-bold text-white">całkowicie bezpłatnie</span>.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white px-8 h-12 text-base" asChild>
                <Link href="/register">
                  Zacznij za darmo — bez karty kredytowej
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 h-12 text-base" asChild>
                <Link href="/kosztorys">
                  Wypróbuj kosztorys online →
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-white/50">
              Zawsze bezpłatnie · Bez karty kredytowej · Bez zobowiązań
            </p>
          </div>
        </section>

        {/* STATS */}
        <section className="border-b bg-slate-50 py-12">
          <div className="container grid grid-cols-2 gap-6 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-extrabold text-primary">{s.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section className="container py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Wszystko czego potrzebuje firma budowlana
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Jeden plan zastępuje 4 osobne narzędzia za cenę kawy dziennie
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="group border transition-all hover:shadow-lg hover:-translate-y-0.5">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <f.icon className="h-6 w-6 text-primary" />
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${f.badgeColor}`}>
                      {f.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                  <Link
                    href={f.href}
                    className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline"
                  >
                    {f.cta}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-slate-50 py-20">
          <div className="container">
            <div className="text-center">
              <h2 className="text-3xl font-bold sm:text-4xl">Jak to działa?</h2>
              <p className="mt-3 text-muted-foreground">
                Od kosztorysu do zapłaty — w jednym przepływie
              </p>
            </div>
            <div className="mt-14 grid gap-8 md:grid-cols-4">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={step.step} className="relative text-center">
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="absolute left-1/2 top-7 hidden h-0.5 w-full bg-primary/20 md:block" />
                  )}
                  <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white font-bold text-lg shadow-lg">
                    {step.step}
                  </div>
                  <h3 className="font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMPARISON TABLE */}
        <section className="container py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Porównanie z konkurencją
            </h2>
            <p className="mt-3 text-muted-foreground">
              Dlaczego tysiące firm przechodzi z Norma PRO i PlanRadar
            </p>
          </div>
          <div className="mt-10 overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Funkcja</th>
                  <th className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1 font-bold text-primary">
                      <HardHat className="h-4 w-4" /> matadora.business
                    </span>
                  </th>
                  <th className="px-6 py-4 text-center text-muted-foreground">Norma PRO</th>
                  <th className="px-6 py-4 text-center text-muted-foreground">PlanRadar</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-6 py-3 font-medium">{row.feature}</td>
                    <td className="px-6 py-3 text-center">
                      {typeof row.us === "boolean" ? (
                        row.us ? (
                          <CheckCircle2 className="mx-auto h-5 w-5 text-green-500" />
                        ) : (
                          <span className="text-red-400">✕</span>
                        )
                      ) : (
                        <span className="font-bold text-primary">{row.us}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {typeof row.norma === "boolean" ? (
                        row.norma ? (
                          <CheckCircle2 className="mx-auto h-5 w-5 text-green-500" />
                        ) : (
                          <span className="text-red-400">✕</span>
                        )
                      ) : (
                        <span className="text-muted-foreground">{row.norma}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {typeof row.planradar === "boolean" ? (
                        row.planradar ? (
                          <CheckCircle2 className="mx-auto h-5 w-5 text-green-500" />
                        ) : (
                          <span className="text-red-400">✕</span>
                        )
                      ) : (
                        <span className="text-muted-foreground">{row.planradar}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>


        <section className="bg-orange-50 border-y border-orange-100 py-20">
          <div className="container max-w-2xl text-center">
            <span className="inline-block rounded-full bg-orange-100 px-4 py-1 text-xs font-bold uppercase tracking-widest text-orange-600 mb-4">
              Beta
            </span>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Pierwsi użytkownicy
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Matadora jest w fazie beta. Pierwsze{" "}
              <strong className="text-foreground">50 firm</strong>, które
              założą konto, otrzymują{" "}
              <strong className="text-foreground">1 bezpłatną analizę AI kosztorysu</strong>{" "}
              (wartość 500 zł) — bez karty kredytowej, bez zobowiązań.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              W zamian prosimy o szczery feedback, który pomoże nam budować
              najlepsze narzędzie dla polskich firm budowlanych.
            </p>
            <div className="mt-8">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-8 py-3 text-base font-semibold text-white shadow hover:bg-orange-600 transition-colors"
              >
                Dołącz do programu beta
              </Link>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="container py-20" id="cennik">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold sm:text-4xl">Cennik</h2>
            <p className="mt-3 text-muted-foreground">
              Cała platforma bezpłatna — płacisz tylko za analizę AI
            </p>
          </div>

          {/* VS KOSZTORYSANT */}
          <div className="max-w-2xl mx-auto mb-10 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Kosztorysant ręczny</p>
                <p className="mt-1 text-2xl font-extrabold text-red-500">900 zł</p>
                <p className="text-xs text-muted-foreground">3–10 dni</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-xs font-bold text-green-700">vs Matadora AI</p>
                <p className="text-xl font-extrabold text-green-600">−400 zł</p>
                <p className="text-xs text-muted-foreground">oszczędność</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Matadora — analiza AI</p>
                <p className="mt-1 text-2xl font-extrabold text-green-600">500 zł</p>
                <p className="text-xs text-green-700 font-semibold">w kilkadziesiąt sekund</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl mx-auto">
            <Card className="text-center border">
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Platforma</p>
                <p className="mt-2 text-3xl font-extrabold text-green-600">0 zł</p>
                <p className="text-xs text-muted-foreground mt-0.5">zawsze</p>
                <p className="mt-2 text-sm font-medium">Konto, projekty, finanse, kalkulator KNR</p>
                <p className="text-xs text-muted-foreground">bez limitów, bez subskrypcji</p>
              </CardContent>
            </Card>
            <Card className="text-center border-primary shadow-lg">
              <CardContent className="p-5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Opcjonalnie</div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Analiza AI z PDF</p>
                <p className="mt-2 text-3xl font-extrabold">500 zł</p>
                <p className="text-xs text-muted-foreground mt-0.5">za dokument</p>
                <p className="mt-2 text-sm font-medium">Automatyczne pozycje z rzutu/przedmiaru</p>
                <p className="text-xs text-muted-foreground">płatność jednorazowa, przy użyciu</p>
              </CardContent>
            </Card>
          </div>
          <div className="mt-8 text-center">
            <Link href="/pricing" className="text-sm font-semibold text-primary underline underline-offset-2">
              Zobacz pełny cennik →
            </Link>
          </div>
        </section>

        {/* FOR WHOM */}
        <section className="bg-slate-900 py-20 text-white">
          <div className="container">
            <h2 className="text-center text-3xl font-bold sm:text-4xl">
              Dla kogo jest matadora.business?
            </h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {[
                {
                  icon: Hammer,
                  title: "Wykonawcy i firmy budowlane",
                  items: [
                    "Kosztorysy online (bez Norma PRO)",
                    "Znajdź przetargi AI",
                    "Zarządzaj projektami",
                    "Wystawiaj faktury KSeF",
                    "Prowadź BHP dokumentację",
                  ],
                },
                {
                  icon: Building2,
                  title: "Inwestorzy i deweloperzy",
                  items: [
                    "Przejrzystość kosztów w real-time",
                    "Podpisuj protokoły odbioru online",
                    "Zatwierdź oferty jednym kliknięciem",
                    "Kontroluj budżet i harmonogram",
                    "Weryfikuj wykonawców",
                  ],
                },
                {
                  icon: Truck,
                  title: "Hurtownie materiałów",
                  items: [
                    "Publikuj katalogi produktów",
                    "Automatyczne zamówienia",
                    "Oferty B2B dla wykonawców",
                    "Panel raportowy",
                    "Integracja z kosztorysami",
                  ],
                },
              ].map((role) => (
                <div key={role.title} className="rounded-xl bg-white/5 p-6 backdrop-blur">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                    <role.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold">{role.title}</h3>
                  <ul className="mt-4 space-y-2">
                    {role.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-white/70">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA BOTTOM */}
        <section className="bg-primary py-20 text-white">
          <div className="container text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Gotowy na więcej zleceń i mniej papierkowej roboty?
            </h2>
            <p className="mt-4 text-xl text-white/80">
              Platforma stworzona dla polskich firm budowlanych
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 h-12 px-8 text-base font-bold" asChild>
                <Link href="/register">
                  Zacznij za darmo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 h-12 text-base" asChild>
                <Link href="/kosztorys">
                  Wypróbuj kosztorys online →
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-white/60">
              <span className="flex items-center gap-1.5"><Lock className="h-4 w-4" /> Bezpieczne SSL</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> RODO zgodność</span>
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Polska platforma</span>
              <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> Wsparcie 7 dni w tygodniu</span>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t bg-slate-900 py-12 text-white">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 font-bold text-lg">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                  <HardHat className="h-4 w-4 text-white" />
                </div>
                matadora.business
              </div>
              <p className="mt-3 text-sm text-white/50">
                Platforma dla polskich firm budowlanych. Kosztorysy, projekty, przetargi, BHP — wszystko w jednym miejscu.
              </p>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3">Produkt</p>
              <ul className="space-y-2 text-sm text-white/50">
                <li><Link href="/kosztorys" className="hover:text-white">Kosztorys online</Link></li>
                <li><Link href="/przetargi" className="hover:text-white">Przetargi AI</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Cennik</Link></li>
                <li><Link href="/register" className="hover:text-white">Rejestracja</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3">Dla firm</p>
              <ul className="space-y-2 text-sm text-white/50">
                <li><Link href="/register" className="hover:text-white">Wykonawcy</Link></li>
                <li><Link href="/register" className="hover:text-white">Inwestorzy</Link></li>
                <li><Link href="/register" className="hover:text-white">Hurtownie</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-sm mb-3">Kontakt</p>
              <ul className="space-y-2 text-sm text-white/50">
                <li>
                  <a href="mailto:vanbud.felix@gmail.com" className="hover:text-white">
                    vanbud.felix@gmail.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-white/10 pt-6 flex flex-col items-center justify-between gap-4 text-xs text-white/30 sm:flex-row">
            <span>© {new Date().getFullYear()} matadora.business — Wszystkie prawa zastrzeżone</span>
            <div className="flex gap-4">
              <Link href="/o-nas" className="hover:text-white">O nas</Link>
              <Link href="/polityka-prywatnosci" className="hover:text-white">Polityka prywatności</Link>
              <Link href="/regulamin" className="hover:text-white">Regulamin</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
