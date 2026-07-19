import Link from "next/link";
import { HardHat, Sparkles } from "lucide-react";

import { APP_VERSION } from "@/lib/version";

export const metadata = {
  title: "Co nowego — matadora.business",
  description: "Historia aktualizacji platformy matadora.business.",
};

type Entry = {
  version: string;
  date: string;
  items: string[];
};

const ENTRIES: Entry[] = [
  {
    version: "1.0.0",
    date: "19 lipca 2026",
    items: [
      "Nowość: Adwokat AI — jedna sesja (19,99 zł) łącząca generator projektów umów i analizę przesłanego dokumentu prawnego.",
      "Nowość: Analiza BHP zdjęcia budowy (AI) — wykrywanie naruszeń przepisów BHP na podstawie przesłanego zdjęcia, wraz z rekomendacjami.",
      "Nowość: Faktura VAT wysyłana automatycznie e-mailem zaraz po zaksięgowaniu płatności, zawsze dostępna do pobrania.",
      "Ulepszenie: realne dane przetargów publicznych w module Przetargi AI (zamiast przykładowych).",
      "Ulepszenie: nowy, czytelniejszy wygląd publicznej oferty wysyłanej do inwestora.",
      "Poprawki: pełne tłumaczenie panelu wykonawcy i inwestora na język polski.",
    ],
  },
];

export default function ChangelogPage() {
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
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">Cennik</Link>
            <Link href="/o-nas" className="text-muted-foreground hover:text-foreground">O nas</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 bg-white">
        <div className="container max-w-2xl py-12">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Co nowego</h1>
          <p className="mt-2 text-sm text-muted-foreground">Aktualna wersja platformy: v{APP_VERSION}</p>

          <div className="mt-8 space-y-10">
            {ENTRIES.map((entry) => (
              <section key={entry.version}>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="text-lg font-bold text-slate-900">
                    v{entry.version} <span className="font-normal text-muted-foreground">— {entry.date}</span>
                  </h2>
                </div>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
                  {entry.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
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
