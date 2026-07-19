import Link from "next/link";
import { HardHat, CheckCircle2, ArrowRight, Sparkles, Phone, Clock, TrendingDown } from "lucide-react";

import { Button } from "@/components/ui/button";

const FAQ = [
  {
    q: "Czy platforma Matadora jest naprawdę bezpłatna?",
    a: "Tak. Rejestracja, zarządzanie projektami, finanse, brygady, podwykonawcy, kosztorysy budowane ręcznie w kalkulatorze KNR — wszystko jest bezpłatne, bez limitów i bez subskrypcji.",
  },
  {
    q: "Za co więc płacę?",
    a: "Wyłącznie za trzy funkcje AI, każda rozliczana jednorazowo, tylko wtedy gdy z niej korzystasz: analiza AI kosztorysu z PDF (500 zł), analiza AI zdjęcia budowy pod kątem BHP (99 zł) oraz sesja Adwokata AI — generator umów i analiza dokumentu prawnego (19,99 zł).",
  },
  {
    q: "Ile kosztuje kosztorysant na rynku?",
    a: "Stawki rynkowe kosztorysantów to 600–1500 zł za kosztorys, plus czas oczekiwania 3–10 dni roboczych. Analiza AI w Matadorze daje wynik w kilkadziesiąt sekund, za 500 zł.",
  },
  {
    q: "Czy mogę stworzyć kosztorys bez płacenia?",
    a: "Tak — kalkulator KNR (dodawanie pozycji ręcznie, wyszukiwanie w katalogu, eksport PDF, wysyłka do klienta) jest w pełni bezpłatny. Płatna jest wyłącznie automatyczna analiza AI z przesłanego pliku PDF.",
  },
  {
    q: "Czy dostanę fakturę VAT za zakup?",
    a: "Tak — faktura VAT jest wystawiana i wysyłana automatycznie na Twój adres e-mail od razu po zaksięgowaniu płatności, a dodatkowo zawsze dostępna do pobrania pod stałym linkiem.",
  },
  {
    q: "Co się dzieje, jeśli zapłacę, a analiza się nie powiedzie?",
    a: "Napisz do nas na vanbud.felix@gmail.com z numerem transakcji — rozliczymy zwrot lub ponowną analizę ręcznie.",
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
              <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
              Cała platforma bezpłatna — płacisz tylko za funkcje AI
            </div>
            <h1 className="text-4xl font-extrabold sm:text-5xl">Cennik</h1>
            <p className="mt-4 text-xl text-white/70 max-w-xl mx-auto">
              Matadora jest bezpłatna. Płatne są wyłącznie trzy funkcje AI — analiza kosztorysu z PDF,
              analiza BHP zdjęcia budowy oraz sesja Adwokata AI — każda rozliczana jednorazowo.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-500/20 border border-green-500/30 px-4 py-2 text-sm text-green-300">
              <CheckCircle2 className="h-4 w-4" />
              Bez subskrypcji · Bez kart na start · Bez ukrytych opłat
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
                  <p className="text-2xl font-extrabold text-green-600">400 zł</p>
                  <p className="text-xs text-muted-foreground">vs kosztorysant ręczny</p>
                </div>
              </div>
              <div className="rounded-xl border border-green-200 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Matadora — analiza AI</p>
                <p className="text-3xl font-extrabold text-green-600">500 zł</p>
                <p className="text-sm text-muted-foreground mt-1">za dokument</p>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-green-700 font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  Wynik w kilkadziesiąt sekund
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CO JEST BEZPŁATNE / CO JEST PŁATNE */}
        <section className="container py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold">Prosty podział: platforma bezpłatna, AI płatne</h2>
            <p className="mt-2 text-muted-foreground">Bez taryf, bez subskrypcji — płacisz tylko wtedy, gdy korzystasz z konkretnej funkcji AI</p>
          </div>

          <div className="mx-auto mb-6 max-w-3xl rounded-xl border border-green-200 bg-green-50/50 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-700 mb-3">Bezpłatnie, zawsze</p>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {[
                "Konto i pełny dostęp do dashboardu",
                "Kalkulator KNR — ręczne tworzenie kosztorysu",
                "Zarządzanie projektami, harmonogram, finanse",
                "Brygady, podwykonawcy, sprzęt, CRM",
                "Eksport PDF, wysyłka do klienta, podpis elektroniczny",
                "Faktury KSeF, portal inwestora",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Analiza AI kosztorysu</p>
              <p className="text-2xl font-extrabold">500 zł</p>
              <p className="mb-3 text-xs text-muted-foreground">za dokument</p>
              <ul className="space-y-2 text-sm">
                {[
                  "Analiza AI przesłanego PDF (rzut, przedmiar, inwentaryzacja)",
                  "Wyodrębnienie pozycji robót z ilościami",
                  "Dopasowanie kodów KNR i orientacyjnych stawek",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="mt-6 w-full" asChild>
                <Link href="/kosztorys">
                  Wypróbuj <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Analiza BHP zdjęcia</p>
              <p className="text-2xl font-extrabold">99 zł</p>
              <p className="mb-3 text-xs text-muted-foreground">za zdjęcie</p>
              <ul className="space-y-2 text-sm">
                {[
                  "Analiza AI zdjęcia placu budowy",
                  "Wykrycie naruszeń przepisów BHP",
                  "Podstawa prawna i rekomendacje naprawcze",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="mt-6 w-full" variant="outline" asChild>
                <Link href="/login">
                  Zaloguj się, aby skorzystać <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Adwokat AI — sesja</p>
              <p className="text-2xl font-extrabold">19,99 zł</p>
              <p className="mb-3 text-xs text-muted-foreground">za sesję</p>
              <ul className="space-y-2 text-sm">
                {[
                  "Wygenerowanie jednego projektu umowy",
                  "Analiza jednego dokumentu prawnego",
                  "Obie funkcje w ramach tej samej sesji",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="mt-6 w-full" variant="outline" asChild>
                <Link href="/login">
                  Zaloguj się, aby skorzystać <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
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
            <h2 className="text-3xl font-bold">Zacznij bezpłatnie</h2>
            <p className="mt-2 text-white/80">Bez karty · Bez subskrypcji · Płacisz tylko za analizę AI, jeśli z niej skorzystasz</p>
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
