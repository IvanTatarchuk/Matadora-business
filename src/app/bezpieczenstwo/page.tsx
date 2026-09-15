import Link from "next/link";
import {
  HardHat,
  ShieldCheck,
  Lock,
  KeyRound,
  Users,
  Server,
  Mail,
} from "lucide-react";

export const metadata = {
  title: "Bezpieczeństwo i dane — matadora.business",
  description:
    "Jak matadora.business chroni dane Twojej firmy: izolacja danych na poziomie wiersza (RLS), szyfrowane połączenia, zgodność z RODO i zaufani dostawcy infrastruktury.",
};

const PRINCIPLES = [
  {
    icon: KeyRound,
    title: "Izolacja danych między firmami (Row Level Security)",
    desc:
      "Każda tabela w bazie danych ma włączone reguły Row Level Security (RLS) na poziomie PostgreSQL. Oznacza to, że dostęp do konkretnego wiersza danych (projektu, oferty, faktury) jest weryfikowany przez bazę danych przy każdym zapytaniu — Twoja firma nigdy nie zobaczy danych innego Inwestora, Wykonawcy ani Hurtowni, nawet w przypadku błędu w kodzie aplikacji.",
  },
  {
    icon: Lock,
    title: "Szyfrowane połączenia",
    desc:
      "Cała komunikacja między przeglądarką a serwerami Platformy odbywa się przez szyfrowane połączenie TLS/SSL. Dane logowania i sesji obsługiwane są przez uwierzytelnianie Supabase Auth.",
  },
  {
    icon: Users,
    title: "Dostęp oparty na rolach",
    desc:
      "Konto ma jedną z trzech ról — Inwestor, Wykonawca lub Hurtownia — a routing i uprawnienia w panelu są wymuszane po stronie serwera na podstawie roli zapisanej w bazie, nie tylko w interfejsie.",
  },
  {
    icon: Server,
    title: "Sprawdzeni dostawcy infrastruktury",
    desc:
      "Platforma korzysta z uznanych dostawców: Supabase (baza danych, uwierzytelnianie), Vercel (hosting aplikacji), Stripe (płatności) i Resend (e-mail transakcyjny). Żaden z nich nie otrzymuje pełnych danych karty płatniczej — to obsługuje bezpośrednio Stripe.",
  },
  {
    icon: ShieldCheck,
    title: "Zgodność z RODO",
    desc:
      "Przetwarzanie danych osobowych odbywa się zgodnie z RODO — pełny zakres, podstawy prawne i prawa Użytkownika opisane są w Polityce prywatności.",
  },
];

export default function BezpieczenstwoPage() {
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
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <ShieldCheck className="h-4 w-4" />
            Bezpieczeństwo i dane
          </div>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Jak chronimy dane Twojej firmy
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-700">
            Matadora obsługuje dane wrażliwe biznesowo — kosztorysy, oferty, faktury i dokumenty
            projektowe wielu firm na jednej platformie. Poniżej opisujemy konkretne mechanizmy
            techniczne, które to zabezpieczają, bez marketingowych ogólników.
          </p>

          <div className="mt-8 space-y-6">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="flex gap-4 rounded-xl border p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <p.icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">{p.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border bg-slate-50 p-5">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <Mail className="h-4 w-4 text-primary" />
              Zgłoś problem bezpieczeństwa
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Jeśli znalazłeś/aś lukę bezpieczeństwa lub masz pytanie dotyczące ochrony danych,
              napisz bezpośrednio na{" "}
              <a href="mailto:vanbud.felix@gmail.com" className="text-primary underline">
                vanbud.felix@gmail.com
              </a>
              . Traktujemy takie zgłoszenia priorytetowo.
            </p>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Pełny zakres przetwarzania danych osobowych, podstawy prawne i prawa Użytkownika
            opisuje{" "}
            <Link href="/polityka-prywatnosci" className="text-primary underline">
              Polityka prywatności
            </Link>
            .
          </p>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} matadora.business ·{" "}
          <Link href="/" className="hover:text-foreground">Strona główna</Link>
          {" · "}
          <Link href="/regulamin" className="hover:text-foreground">Regulamin</Link>
        </div>
      </footer>
    </div>
  );
}
