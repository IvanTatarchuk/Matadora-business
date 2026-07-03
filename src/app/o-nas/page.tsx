import Link from "next/link";
import {
  HardHat,
  Target,
  Sparkles,
  MapPin,
  Mail,
  Calculator,
  Search,
  Building2,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "O nas — matadora.business",
  description:
    "Matadora — polska platforma ConTech ze Szczecina. Automatyzujemy kosztorysowanie i zakupy materiałów dla firm budowlanych przy pomocy AI.",
};

const TECH_STACK = [
  {
    name: "Claude API (Anthropic)",
    desc: "Analiza dokumentów PDF, ekstrakcja pozycji kosztorysowych i wsparcie decyzyjne oparte na sztucznej inteligencji.",
  },
  {
    name: "Next.js",
    desc: "Nowoczesna, szybka aplikacja webowa działająca bezpośrednio w przeglądarce — bez instalacji.",
  },
  {
    name: "Supabase",
    desc: "Bezpieczna baza danych i uwierzytelnianie, z pełną kontrolą dostępu na poziomie wiersza (RLS).",
  },
];

const VALUES = [
  {
    icon: Calculator,
    title: "Kosztorysowanie bez tarcia",
    desc: "Zastępujemy drogie, przestarzałe oprogramowanie (Norma PRO) przeglądarkowym kreatorem zgodnym z normami KNR — dostępnym w 5 minut, nie w 5 dni.",
  },
  {
    icon: Sparkles,
    title: "AI jako asystent, nie zabawka",
    desc: "Analiza PDF przez Claude API to nasz główny wyróżnik — wgrywasz rzut lub przedmiar, a AI proponuje gotowe pozycje z ilościami i stawkami.",
  },
  {
    icon: Search,
    title: "Nigdy więcej przegapionego przetargu",
    desc: "Codzienne alerty o zamówieniach publicznych z e-Zamówień i BZP, dopasowane do profilu firmy.",
  },
];

export default function ONasPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <HardHat className="h-5 w-5 text-white" />
            </div>
            <span>matadora</span>
            <span className="text-primary">.business</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <Link href="/kosztorys" className="text-muted-foreground hover:text-foreground">Kosztorys</Link>
            <Link href="/przetargi" className="text-muted-foreground hover:text-foreground">Przetargi</Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">Cennik</Link>
            <Link href="/o-nas" className="font-semibold text-primary">O nas</Link>
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
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-primary/90 py-20 text-white">
          <div className="container max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur">
              <MapPin className="h-3.5 w-3.5" />
              Szczecin, Polska
            </div>
            <h1 className="mt-6 text-4xl font-extrabold sm:text-5xl">O Matadora</h1>
            <p className="mt-6 text-xl text-white/80 leading-relaxed">
              Matadora to polska platforma ConTech założona w 2026 roku w Szczecinie.
              Budujemy narzędzia, które oszczędzają czas i pieniądze firmom budowlanym —
              od pierwszego kosztorysu, aż po odbiór końcowy inwestycji.
            </p>
          </div>
        </section>

        {/* MISSION */}
        <section className="container py-16">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold sm:text-3xl">Nasza misja</h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Automatyzujemy kosztorysowanie i zakupy materiałów dla polskich firm
                budowlanych. Wiemy, że wyceny robocizny i materiałów potrafią zająć
                kosztorysantowi kilka dni i kosztować setki złotych — a decyzje o
                zakupie materiałów wciąż zapadają na kartce papieru albo w telefonie
                z hurtownią. Chcemy to zmienić: dać każdej firmie budowlanej — od
                jednoosobowej działalności po średniej wielkości wykonawcę —
                dostęp do narzędzi, na które wcześniej było stać tylko duże firmy.
              </p>
            </div>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <p className="text-sm font-semibold text-primary uppercase tracking-wide">Krótko o nas</p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <dt className="text-muted-foreground">Rok założenia</dt>
                    <dd className="font-semibold">2026</dd>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <dt className="text-muted-foreground">Siedziba</dt>
                    <dd className="font-semibold">Szczecin, Polska</dd>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <dt className="text-muted-foreground">Operator</dt>
                    <dd className="font-semibold">VANBUD Ivan Tatarchuk</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Rynek</dt>
                    <dd className="font-semibold">Polska (PLN, KSeF, KNR)</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* VALUES */}
        <section className="bg-slate-50 py-16">
          <div className="container">
            <div className="text-center">
              <h2 className="text-2xl font-bold sm:text-3xl">Co dla nas ważne</h2>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {VALUES.map((v) => (
                <Card key={v.title}>
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                      <v.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-bold">{v.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* TECH */}
        <section className="container py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">Technologia</h2>
            <p className="mt-3 text-muted-foreground">
              Nowoczesny stack, na którym budujemy Matadora
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {TECH_STACK.map((t) => (
              <Card key={t.name} className="border-slate-200">
                <CardContent className="p-6">
                  <h3 className="font-bold">{t.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CONTACT / OPERATOR */}
        <section className="bg-slate-900 py-16 text-white">
          <div className="container max-w-2xl text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-bold sm:text-3xl">Podmiot prowadzący</h2>
            <p className="mt-4 text-white/70 leading-relaxed">
              Platforma matadora.business prowadzona jest przez <strong className="text-white">VANBUD Ivan Tatarchuk</strong>,
              z siedzibą przy ul. Mieleckiej 5, 70-740 Szczecin, NIP 955-235-98-44.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-white/70">
              <Mail className="h-4 w-4" />
              <a href="mailto:vanbud.felix@gmail.com" className="hover:text-white hover:underline">
                vanbud.felix@gmail.com
              </a>
            </div>
            <div className="mt-8">
              <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                <Link href="/kosztorys">
                  Wypróbuj kosztorys online <ArrowRight className="ml-2 h-4 w-4" />
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
          <Link href="/regulamin" className="hover:text-foreground">Regulamin</Link>
          {" · "}
          <Link href="/polityka-prywatnosci" className="hover:text-foreground">Polityka prywatności</Link>
        </div>
      </footer>
    </div>
  );
}
