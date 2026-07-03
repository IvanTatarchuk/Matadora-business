/**
 * Real Polish Public Procurement API integration
 *
 * Sources:
 * 1. e-Zamówienia REST API (UZP)
 *    Base: https://ezamowienia.gov.pl/mo-board/api/v1/
 *    Docs: https://ezamowienia.gov.pl/pl/api-docs/
 *    Auth: None required for public searches
 *
 * 2. BZP (Biuletyn Zamówień Publicznych)
 *    Base: https://bzp.uzp.gov.pl/api/
 *
 * CPV codes for construction (Wspólny Słownik Zamówień):
 *   45000000-7 Roboty budowlane (główny)
 *   45100000-8 Przygotowanie terenu
 *   45200000-9 Roboty budowlane w zakresie wznoszenia
 *   45300000-0 Roboty instalacyjne
 *   45400000-1 Roboty wykończeniowe
 */

import { NextRequest, NextResponse } from "next/server";

const BZP_BASE = "https://bzp.uzp.gov.pl/api";

type BzpNotice = {
  id: string;
  numerOgloszenia: string;
  tytul: string;
  nazwaZamawiajacego: string;
  miejscowosc: string;
  wojewodztwo: string;
  wartoscZamowienia?: number;
  terminSkladaniaOfert?: string;
  dataPublikacji: string;
  kodCPV: string;
  linkOgloszenia: string;
  rodzajZamowienia: string;
};

type NormalizedTender = {
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
  "45300000": "Instalacje",
  "45310000": "Instalacje elektryczne",
  "45320000": "Roboty izolacyjne",
  "45330000": "Instalacje sanitarne",
  "45400000": "Roboty wykończeniowe",
  "45410000": "Tynkowanie",
  "45420000": "Stolarstwo",
  "45430000": "Posadzki",
  "45440000": "Malarstwo",
  "45450000": "Pozostałe wykończenia",
};

function getCpvCategory(cpv: string): string {
  const prefix6 = cpv.substring(0, 6).padEnd(8, "0");
  const prefix4 = cpv.substring(0, 4).padEnd(8, "0");
  return (
    CPV_CATEGORIES[prefix6] ??
    CPV_CATEGORIES[prefix4] ??
    "Roboty budowlane"
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const voivodeship = searchParams.get("voivodeship") ?? "";
  const category = searchParams.get("category") ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

  try {
    // Query BZP public API — no auth required
    // Filter by CPV 45* (construction) and optional voivodeship
    const params = new URLSearchParams({
      cpv: "45",           // prefix match — all construction CPVs
      limit: String(limit),
      offset: "0",
      sortField: "dataPublikacji",
      sortDir: "DESC",
    });
    if (voivodeship) params.set("wojewodztwo", voivodeship);

    const response = await fetch(
      `${BZP_BASE}/Ogloszenia/ListaOgloszen?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "matadora.business/1.0 (kontakt@matadora.business)",
        },
        next: { revalidate: 3600 }, // Cache 1 hour
      }
    );

    if (!response.ok) {
      throw new Error(`BZP API error: ${response.status}`);
    }

    const raw = await response.json();
    const notices: BzpNotice[] = Array.isArray(raw)
      ? raw
      : raw?.items ?? raw?.data ?? raw?.ogloszenia ?? [];

    const normalized: NormalizedTender[] = notices.slice(0, limit).map((n) => ({
      id: n.id ?? n.numerOgloszenia,
      title: n.tytul,
      buyer: n.nazwaZamawiajacego,
      location: n.miejscowosc ?? "",
      voivodeship: n.wojewodztwo ?? "",
      valueMin: n.wartoscZamowienia ?? null,
      deadline: n.terminSkladaniaOfert ?? null,
      publishedAt: n.dataPublikacji,
      cpvCode: n.kodCPV ?? "45000000-7",
      category: getCpvCategory(n.kodCPV ?? "45000000"),
      source: "BZP",
      url: n.linkOgloszenia ?? `https://bzp.uzp.gov.pl/ZP400PodgladOpublikowanego.aspx?id=${n.id}`,
    }));

    return NextResponse.json({
      success: true,
      count: normalized.length,
      source: "bzp.uzp.gov.pl",
      fetchedAt: new Date().toISOString(),
      tenders: normalized,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";

    // Fallback: return demo data with clear label
    return NextResponse.json({
      success: false,
      error: msg,
      note: "BZP API niedostępne — dane demonstracyjne. Sprawdź: https://bzp.uzp.gov.pl",
      tenders: DEMO_FALLBACK,
      fetchedAt: new Date().toISOString(),
    });
  }
}

// Demo fallback — clearly labelled, shown only when real API fails
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
