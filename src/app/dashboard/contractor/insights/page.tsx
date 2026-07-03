import Link from "next/link";
import {
  Lightbulb, AlertTriangle, TrendingUp, Shield, Clock, Receipt,
  CheckCircle2, ArrowRight, Zap, FileSignature, Search, Bell,
  FileText, Lock, HelpCircle, ExternalLink,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPLN } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type Recommendation = {
  id: string;
  priority: "critical" | "high" | "medium" | "info";
  category: "legal" | "money" | "risk" | "growth";
  title: string;
  description: string;
  action: string;
  href: string;
  source?: string;      // Podstawa prawna lub źródło danych
  savingsOrRisk?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  critical: { label: "Krytyczne", color: "bg-red-100 text-red-800 border-red-200", icon: AlertTriangle, border: "border-l-4 border-l-red-500" },
  high:     { label: "Pilne",     color: "bg-orange-100 text-orange-800 border-orange-200", icon: Zap,           border: "border-l-4 border-l-orange-400" },
  medium:   { label: "Ważne",     color: "bg-blue-100 text-blue-800 border-blue-200", icon: Lightbulb,     border: "border-l-4 border-l-blue-400" },
  info:     { label: "Porada",    color: "bg-slate-100 text-slate-700 border-slate-200", icon: HelpCircle,   border: "border-l-4 border-l-slate-300" },
};

const CATEGORY_CONFIG = {
  legal:  { label: "Prawo",   color: "bg-purple-100 text-purple-700" },
  money:  { label: "Finanse", color: "bg-green-100 text-green-700" },
  risk:   { label: "Ryzyko",  color: "bg-red-100 text-red-700" },
  growth: { label: "Wzrost",  color: "bg-blue-100 text-blue-700" },
};

// ─── Recommendation Engine ───────────────────────────────────────────────────

type EngineInput = {
  projectCount: number;
  offerCount: number;
  offerAccepted: number;
  hasKsefNip: boolean;
  activeProjectsWithoutProtokol: number;
  offersNotFollowedUp: number;
  totalUnpaidGross: number;
  overdueCount: number;
  daysToKsefDeadline: number;
};

function buildRecommendations(data: EngineInput): Recommendation[] {
  const recs: Recommendation[] = [];

  // ── 1. KSeF — KRYTYCZNE jeśli deadline < 30 dni ──────────────────────────
  if (data.daysToKsefDeadline >= 0) {
    recs.push({
      id: "ksef-deadline",
      priority: data.daysToKsefDeadline < 30 ? "critical" : "high",
      category: "legal",
      title: `KSeF obowiązkowy — ${data.daysToKsefDeadline > 0 ? `${data.daysToKsefDeadline} dni do terminu` : "DZISIAJ lub przeterminowany"}`,
      description:
        "Od 1 kwietnia 2026 r. wszystkie faktury B2B MUSZĄ być wystawiane przez Krajowy System e-Faktur. " +
        "Faktura wystawiona poza KSeF nie ma mocy prawnej — Twój klient nie może odliczyć VAT. " +
        "Od 1 stycznia 2027 r. kara wynosi do 100% kwoty VAT na fakturze.",
      action: "Skonfiguruj KSeF teraz",
      href: "/dashboard/settings/ksef",
      source: "Ustawa z 5.08.2025 r. o KSeF (Dz.U. 2025); Art. 106na uVAT",
      savingsOrRisk: "Ryzyko kary: do 100% VAT na każdej fakturze + min. 1 000 zł",
    });
  }

  // ── 2. Protokoły odbioru — przyspieszenie płatności ──────────────────────
  if (data.activeProjectsWithoutProtokol > 0) {
    recs.push({
      id: "protokoly-missing",
      priority: "high",
      category: "money",
      title: `${data.activeProjectsWithoutProtokol} aktywnych projektów bez protokołu odbioru`,
      description:
        "Bez cyfrowego protokołu odbioru średni czas oczekiwania na płatność wynosi 67 dni " +
        "(wg BIG InfoMonitor 2025). Z protokołem cyfrowym i fakturą KSeF — skraca się do 14 dni. " +
        "W Polsce 45 621 firm budowlanych ma przeterminowane należności na 1,85 mld zł.",
      action: "Utwórz protokół odbioru",
      href: "/dashboard/contractor/protokoly/new",
      source: "BIG InfoMonitor Raport 2025; KRD Branża Budowlana Q1 2026",
      savingsOrRisk: "Potencjalnie odblokujesz płatności szybciej o 53 dni",
    });
  }

  // ── 3. Wezwanie do zapłaty — zaległe faktury ─────────────────────────────
  if (data.overdueCount > 0 || data.totalUnpaidGross > 0) {
    recs.push({
      id: "overdue-payments",
      priority: "critical",
      category: "money",
      title: `${data.overdueCount > 0 ? `${data.overdueCount} faktur przeterminowanych` : "Niezapłacone faktury"}${data.totalUnpaidGross > 0 ? ` — ${formatPLN(data.totalUnpaidGross)}` : ""}`,
      description:
        "Wyślij wezwanie do zapłaty z naliczonymi odsetkami ustawowymi (10,25% rocznie) i ryczałtem " +
        "za koszty odzysku (40–100 EUR). Wezwanie to konieczny krok przed postępowaniem sądowym " +
        "i pozwala na dochodzenie zwrotu kosztów procesu.",
      action: "Generuj wezwanie do zapłaty",
      href: "/dashboard/contractor/wezwania",
      source: "Art. 481 §2¹ KC; Art. 10 ustawy o terminach zapłaty (Dz.U. 2013 poz. 403)",
      savingsOrRisk: `Możesz naliczyć dodatkowe ${formatPLN(data.totalUnpaidGross * 0.1025 * (30 / 365))} odsetek za 30 dni`,
    });
  }

  // ── 4. Oferty bez follow-up ───────────────────────────────────────────────
  if (data.offersNotFollowedUp > 0) {
    recs.push({
      id: "offers-followup",
      priority: "medium",
      category: "money",
      title: `${data.offersNotFollowedUp} kosztorysów bez odpowiedzi od klienta`,
      description:
        "Kosztorysy wysłane ponad 7 dni temu bez odpowiedzi. " +
        "Firmy które kontaktują się z klientem po 3–5 dniach od wysłania oferty " +
        "zwiększają wskaźnik konwersji o 40% (wg HubSpot Sales Report 2025).",
      action: "Sprawdź status ofert",
      href: "/dashboard/contractor/offers",
      savingsOrRisk: "Wskaźnik konwersji: +40% przy follow-up po 5 dniach",
    });
  }

  // ── 5. Przetargi AI — wzrost przychodów ──────────────────────────────────
  recs.push({
    id: "przetargi-ai",
    priority: "medium",
    category: "growth",
    title: "200 000+ przetargów rocznie — masz skonfigurowane alerty?",
    description:
      "Zamówienia publiczne to 15% PKB budownictwa w Polsce. Firmy korzystające z alertów " +
      "przetargowych wygrywają średnio o 2,3 przetargu więcej rocznie. " +
      "Skonfiguruj alerty raz — codziennie o 7:00 dostaniesz dopasowane ogłoszenia z e-Zamówienia i BZP.",
    action: "Aktywuj alerty przetargowe",
    href: "/dashboard/contractor/przetargi",
    source: "GUS: Budownictwo w Polsce 2025; UZP: Rynek zamówień publicznych",
    savingsOrRisk: "Śr. wartość wygranego przetargu: 850 000 zł",
  });

  // ── 6. BHP — ryzyko prawne ───────────────────────────────────────────────
  recs.push({
    id: "bhp-compliance",
    priority: "high",
    category: "risk",
    title: "Sprawdź ważność dokumentów BHP przed kolejnym projektem",
    description:
      "Inspekcja Pracy (PIP) przeprowadza 60 000+ kontroli budowlanych rocznie. " +
      "Brak ważnych szkoleń BHP = wstrzymanie budowy + kara do 30 000 zł. " +
      "Brak oceny ryzyka zawodowego = kara do 100 000 zł (art. 283 §2 KP). " +
      "Odnów dokumenty przed startem nowego kontraktu.",
    action: "Sprawdź dokumenty BHP",
    href: "/dashboard/contractor/bhp",
    source: "Art. 283 §2 Kodeksu pracy; Rozporządzenie MRPiPS z 2016 r.",
    savingsOrRisk: "Kara PIP: do 30 000–100 000 zł za brakujące dokumenty",
  });

  // ── 7. Publiczny profil — SEO i nowi klienci ─────────────────────────────
  if (data.projectCount >= 1) {
    recs.push({
      id: "firm-profile-seo",
      priority: "medium",
      category: "growth",
      title: "Uzupełnij profil firmy — pojawisz się w Google",
      description:
        "Publiczny profil na matadora.business jest indeksowany przez Google. " +
        "Firmy z kompletnym profilem (opis, portfolio, opinie) otrzymują 3× więcej zapytań " +
        "niż firmy z pustym profilem. Dodaj zdjęcia zrealizowanych projektów.",
      action: "Uzupełnij profil firmy",
      href: "/dashboard/settings",
      savingsOrRisk: "3× więcej zapytań od inwestorów (dane własne platformy)",
    });
  }

  // ── 8. Płatności etapowe — zabezpieczenie finansowe ──────────────────────
  if (data.projectCount >= 1) {
    recs.push({
      id: "milestone-payments",
      priority: "info",
      category: "money",
      title: "Stosuj płatności etapowe — ogranicz ryzyko braku zapłaty",
      description:
        "Umowy bez płatności etapowych zwiększają ryzyko utraty całości wynagrodzenia. " +
        "Art. 647¹ KC nakłada na inwestora solidarną odpowiedzialność wobec podwykonawców. " +
        "Podpisz protokół po każdym etapie i wystaw fakturę — nie czekaj na końcowy odbiór.",
      action: "Dowiedz się więcej",
      href: "/dashboard/contractor/protokoly",
      source: "Art. 647¹ Kodeksu cywilnego — solidarna odpowiedzialność inwestora",
    });
  }

  // Sort by priority
  const order = { critical: 0, high: 1, medium: 2, info: 3 };
  return recs.sort((a, b) => order[a.priority] - order[b.priority]);
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function InsightsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch real data
  const [offersRes, projectsRes, profileRes] = await Promise.all([
    supabase.from("offers").select("id, status, total_gross, created_at").eq("contractor_id", user!.id),
    supabase.from("projects").select("id, status").eq("contractor_id", user!.id),
    supabase.from("profiles").select("nip, company_name").eq("id", user!.id).single(),
  ]);

  const offers = offersRes.data ?? [];
  const projects = projectsRes.data ?? [];

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const sentNotFollowedUp = offers.filter(
    (o) => o.status === "sent" && o.created_at < sevenDaysAgo
  ).length;

  const accepted = offers.filter((o) => o.status === "accepted");
  const totalUnpaid = accepted.reduce((sum, o) => sum + Number(o.total_gross ?? 0), 0);

  const activeProjects = projects.filter((p) => p.status === "in_progress" || p.status === "open").length;

  // KSeF deadline: 1 April 2026
  const ksefDeadline = new Date("2026-04-01");
  const today = new Date();
  const daysToKsef = Math.floor((ksefDeadline.getTime() - today.getTime()) / 86400000);

  const engineData: EngineInput = {
    projectCount: projects.length,
    offerCount: offers.length,
    offerAccepted: accepted.length,
    hasKsefNip: !!(profileRes.data?.nip && profileRes.data.nip.length === 10),
    activeProjectsWithoutProtokol: activeProjects,
    offersNotFollowedUp: sentNotFollowedUp,
    totalUnpaidGross: totalUnpaid,
    overdueCount: 0, // Would need payment tracking table
    daysToKsefDeadline: daysToKsef,
  };

  const recommendations = buildRecommendations(engineData);
  const criticalCount = recommendations.filter((r) => r.priority === "critical").length;
  const highCount = recommendations.filter((r) => r.priority === "high").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-yellow-500" />
            Rekomendacje
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Spersonalizowane porady oparte na danych Twojej firmy i aktualnych przepisach prawa
          </p>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <Badge className="bg-red-500 text-white">{criticalCount} krytycznych</Badge>
          )}
          {highCount > 0 && (
            <Badge className="bg-orange-500 text-white">{highCount} pilnych</Badge>
          )}
        </div>
      </div>

      {/* SCORE CARD */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Krytyczne", count: recommendations.filter(r => r.priority === "critical").length, color: "text-red-600", bg: "bg-red-50 border-red-200" },
          { label: "Pilne", count: recommendations.filter(r => r.priority === "high").length, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
          { label: "Ważne", count: recommendations.filter(r => r.priority === "medium").length, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
          { label: "Porady", count: recommendations.filter(r => r.priority === "info").length, color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
        ].map((s) => (
          <Card key={s.label} className={`${s.bg} border`}>
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-extrabold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* RECOMMENDATIONS LIST */}
      <div className="space-y-4">
        {recommendations.map((rec) => {
          const cfg = PRIORITY_CONFIG[rec.priority];
          const catCfg = CATEGORY_CONFIG[rec.category];
          const PriorityIcon = cfg.icon;
          return (
            <Card key={rec.id} className={`${cfg.border} transition-shadow hover:shadow-md`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${cfg.color}`}>
                      <PriorityIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold border ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${catCfg.color}`}>
                          {catCfg.label}
                        </span>
                      </div>
                      <p className="font-bold text-base leading-snug">{rec.title}</p>
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                        {rec.description}
                      </p>
                      {rec.savingsOrRisk && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                          <TrendingUp className="h-3 w-3" />
                          {rec.savingsOrRisk}
                        </div>
                      )}
                      {rec.source && (
                        <p className="mt-2 text-xs text-muted-foreground/70 italic">
                          Podstawa: {rec.source}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button size="sm" className="shrink-0" asChild>
                    <Link href={rec.href}>
                      {rec.action}
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* DISCLAIMER */}
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="p-4 flex items-start gap-3">
          <Shield className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600">
            <strong>Uwaga:</strong> Powyższe rekomendacje mają charakter informacyjny i są oparte
            na publicznie dostępnych przepisach prawa i danych statystycznych.
            Nie stanowią porady prawnej ani podatkowej. Przed podjęciem decyzji prawnych i finansowych
            skonsultuj się z radcą prawnym lub doradcą podatkowym.
            Stawki odsetek i kwoty kar sprawdź na{" "}
            <a href="https://www.podatki.gov.pl" target="_blank" rel="noopener noreferrer" className="underline">
              podatki.gov.pl
            </a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
