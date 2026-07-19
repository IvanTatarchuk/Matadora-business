/**
 * Real Polish Public Procurement API integration — e-Zamówienia Platform (UZP)
 *
 * Endpoint: https://ezamowienia.gov.pl/mo-board/api/v1/notice
 * Reading domestic BZP notices requires no auth/API key. Confirmed live and
 * verified against real data on 2026-07-19 — the previously-used
 * bzp.uzp.gov.pl/api/... path has moved/changed and no longer resolves.
 *
 * Required query params: PageNumber, PageSize, NoticeType, PublicationDateFrom,
 * PublicationDateTo. NoticeType=ContractNotice returns ogłoszenia o zamówieniu.
 * `organizationProvince` in the response is the 2-digit Polish TERYT
 * voivodeship code (PL02..PL32, even numbers), not an EU NUTS-2 code.
 *
 * CPV codes for construction (Wspólny Słownik Zamówień) start with "45".
 *
 * NOTE: each raw notice includes a large `htmlBody` field (full rendered
 * announcement) — with PageSize=100 the raw response is several MB, which
 * exceeds Next.js's fetch data-cache limit (2MB) if you let `next.fetch`
 * cache it. We fetch without Next's cache and only keep the small
 * normalized fields, so callers (page/route) never hold the raw payload.
 */

const EZAMOWIENIA_BASE = "https://ezamowienia.gov.pl/mo-board/api/v1/notice";

const PROVINCE_CODE_TO_NAME: Record<string, string> = {
  PL02: "Dolnośląskie",
  PL04: "Kujawsko-Pomorskie",
  PL06: "Lubelskie",
  PL08: "Lubuskie",
  PL10: "Łódzkie",
  PL12: "Małopolskie",
  PL14: "Mazowieckie",
  PL16: "Opolskie",
  PL18: "Podkarpackie",
  PL20: "Podlaskie",
  PL22: "Pomorskie",
  PL24: "Śląskie",
  PL26: "Świętokrzyskie",
  PL28: "Warmińsko-Mazurskie",
  PL30: "Wielkopolskie",
  PL32: "Zachodniopomorskie",
};

type EzamowieniaNotice = {
  noticeNumber: string;
  bzpNumber: string;
  publicationDate: string;
  orderObject: string;
  cpvCode: string;
  submittingOffersDate: string | null;
  organizationName: string;
  organizationCity: string;
  organizationProvince: string;
  tenderId: string;
};

export type NormalizedTender = {
  id: string;
  title: string;
  buyer: string;
  location: string;
  voivodeship: string;
  valueMin: number | null;
  deadline: string | null;
  publishedAt: string;
  cpvCode: string;
  category: string;
  source: string;
  url: string;
};

const CPV_CATEGORIES: Record<string, string> = {
  "45000000": "Roboty budowlane",
  "45100000": "Przygotowanie terenu",
  "45200000": "Budownictwo kubaturowe",
  "45210000": "Roboty budowlane — budynki",
  "45213000": "Budynki użytkowe",
  "45230000": "Rurociągi, drogi, koleje",
  "45233000": "Roboty drogowe",
  "45300000": "Instalacje",
  "45310000": "Instalacje elektryczne",
  "45320000": "Roboty izolacyjne",
  "45330000": "Instalacje sanitarne",
  "45400000": "Roboty wykończeniowe",
  "45410000": "Tynkowanie",
  "45420000": "Stolarstwo",
  "45421000": "Stolarka okienna i drzwiowa",
  "45430000": "Posadzki",
  "45440000": "Malarstwo",
  "45450000": "Pozostałe wykończenia",
};

function getCpvCategory(cpv: string): string {
  const digits = cpv.replace(/\D/g, "");
  for (const len of [8, 6, 5, 4]) {
    const prefix = digits.slice(0, len).padEnd(8, "0");
    if (CPV_CATEGORIES[prefix]) return CPV_CATEGORIES[prefix];
  }
  return "Roboty budowlane";
}

function firstCpvCode(cpvCode: string): string {
  // API returns e.g. "45233140-2 (Roboty drogowe),45233120-6 (...)"
  return cpvCode.split(",")[0]?.trim().split(" ")[0] ?? cpvCode;
}

// Demo fallback — clearly labelled, shown only when the real API fails
const DEMO_FALLBACK: NormalizedTender[] = [
  {
    id: "demo-1",
    title: "[DEMO] Budowa hali magazynowej wraz z infrastrukturą",
    buyer: "Gmina Przykładowa",
    location: "Warszawa",
    voivodeship: "Mazowieckie",
    valueMin: 2400000,
    deadline: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]!,
    publishedAt: new Date().toISOString().split("T")[0]!,
    cpvCode: "45213100-6",
    category: "Budownictwo kubaturowe",
    source: "DEMO",
    url: "https://ezamowienia.gov.pl",
  },
];

// In-memory cache keyed by lookbackDays — the raw e-Zamówienia response is a
// few MB (each notice embeds full HTML), too big for Next's fetch data cache
// (2MB limit), so we cache the small normalized result here instead. Best
// effort only: a fresh serverless instance starts with an empty cache.
const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<number, { at: number; tenders: NormalizedTender[] }>();

async function fetchAllConstructionTenders(
  lookbackDays: number
): Promise<NormalizedTender[]> {
  const cached = cache.get(lookbackDays);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.tenders;
  }

  const to = new Date();
  const from = new Date(Date.now() - lookbackDays * 86400000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const params = new URLSearchParams({
    PageNumber: "1",
    PageSize: "100",
    NoticeType: "ContractNotice",
    PublicationDateFrom: fmt(from),
    PublicationDateTo: fmt(to),
  });

  const response = await fetch(`${EZAMOWIENIA_BASE}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "matadora.business/1.0 (kontakt@matadora.business)",
    },
    cache: "no-store", // raw payload can exceed Next's 2MB data-cache limit
  });

  if (!response.ok) {
    throw new Error(`e-Zamówienia API error: ${response.status}`);
  }

  const notices: EzamowieniaNotice[] = await response.json();
  const tenders: NormalizedTender[] = notices
    .filter((n) => n.cpvCode?.startsWith("45"))
    .sort((a, b) => b.publicationDate.localeCompare(a.publicationDate))
    .map((n) => {
      const cpv = firstCpvCode(n.cpvCode);
      return {
        id: n.tenderId,
        title: n.orderObject.replace(/^„|”$/g, ""),
        buyer: n.organizationName,
        location: n.organizationCity,
        voivodeship: PROVINCE_CODE_TO_NAME[n.organizationProvince] ?? "",
        valueMin: null, // Not disclosed in the notice-list envelope
        deadline: n.submittingOffersDate,
        publishedAt: n.publicationDate,
        cpvCode: cpv,
        category: getCpvCategory(cpv),
        source: "e-Zamówienia",
        url: `https://ezamowienia.gov.pl/mp-client/search/list/${n.tenderId}`,
      };
    });

  cache.set(lookbackDays, { at: Date.now(), tenders });
  return tenders;
}

export async function fetchConstructionTenders(opts: {
  limit?: number;
  voivodeship?: string | null;
  lookbackDays?: number;
}): Promise<{ tenders: NormalizedTender[]; isDemo: boolean; error?: string }> {
  const limit = Math.min(opts.limit ?? 20, 50);
  const lookbackDays = Math.min(opts.lookbackDays ?? 10, 30);

  try {
    const all = await fetchAllConstructionTenders(lookbackDays);
    const filtered = opts.voivodeship
      ? all.filter((t) => t.voivodeship === opts.voivodeship)
      : all;
    return { tenders: filtered.slice(0, limit), isDemo: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { tenders: DEMO_FALLBACK.slice(0, limit), isDemo: true, error: msg };
  }
}

