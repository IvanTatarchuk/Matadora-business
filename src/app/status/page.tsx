import Link from "next/link";
import {
  HardHat,
  CheckCircle2,
  Mail,
} from "lucide-react";

export const metadata = {
  title: "Status platformy — matadora.business",
  description:
    "Aktualny status działania matadora.business: aplikacja webowa, baza danych, płatności i powiadomienia e-mail.",
};

const COMPONENTS = [
  {
    name: "Aplikacja webowa i panele",
    desc: "Strona główna, logowanie, dashboardy Inwestora/Wykonawcy/Hurtowni.",
  },
  {
    name: "Baza danych",
    desc: "Zapisywanie i odczyt projektów, ofert, kosztorysów i dokumentów.",
  },
  {
    name: "Płatności (Stripe)",
    desc: "Checkout, faktury i rozliczenia jednorazowych usług AI.",
  },
  {
    name: "Powiadomienia e-mail",
    desc: "Potwierdzenia, zaproszenia i alerty wysyłane na adres e-mail konta.",
  },
];

export default function StatusPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
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
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <Link href="/kosztorys" className="text-muted-foreground hover:text-foreground">Kosztorys</Link>
            <Link href="/przetargi" className="text-muted-foreground hover:text-foreground">Przetargi</Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">Cennik</Link>
            <Link href="/o-nas" className="text-muted-foreground hover:text-foreground">O nas</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 bg-white">
        <div className="container max-w-3xl py-12">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Wszystkie systemy działają poprawnie
          </div>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Status platformy
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-700">
            Ta strona pokazuje, z jakich elementów składa się matadora.business i jaki jest ich
            bieżący stan. Nie prowadzimy jeszcze automatycznego, historycznego monitoringu
            dostępności (uptime) — poniższy status jest aktualizowany ręcznie w razie awarii.
            Jeśli coś nie działa mimo statusu &quot;Działa poprawnie&quot;, zgłoś to na adres
            e-mail poniżej.
          </p>

          <div className="mt-8 space-y-3">
            {COMPONENTS.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between gap-4 rounded-xl border p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">{c.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{c.desc}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Działa poprawnie
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border bg-slate-50 p-5">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <Mail className="h-4 w-4 text-primary" />
              Zgłoś problem lub sprawdź czas odpowiedzi
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Na zgłoszenia techniczne odpowiadamy w ciągu 24 godzin w dni robocze. Napisz na{" "}
              <a href="mailto:vanbud.felix@gmail.com" className="text-primary underline">
                vanbud.felix@gmail.com
              </a>{" "}
              lub użyj przycisku &quot;Zgłoś problem&quot; dostępnego w panelu po zalogowaniu.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} matadora.business ·{" "}
          <Link href="/" className="hover:text-foreground">Strona główna</Link>
          {" · "}
          <Link href="/bezpieczenstwo" className="hover:text-foreground">Bezpieczeństwo</Link>
        </div>
      </footer>
    </div>
  );
}
