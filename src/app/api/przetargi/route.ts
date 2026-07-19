import { NextRequest, NextResponse } from "next/server";
import { fetchConstructionTenders } from "@/lib/przetargi/fetch-tenders";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const voivodeship = searchParams.get("voivodeship") ?? undefined;
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const days = parseInt(searchParams.get("days") ?? "10");

  const { tenders, isDemo, error } = await fetchConstructionTenders({
    limit,
    voivodeship,
    lookbackDays: days,
  });

  return NextResponse.json({
    success: !isDemo,
    error,
    note: isDemo
      ? "e-Zamówienia API niedostępne — dane demonstracyjne. Sprawdź: https://ezamowienia.gov.pl"
      : undefined,
    count: tenders.length,
    source: isDemo ? "demo" : "ezamowienia.gov.pl",
    fetchedAt: new Date().toISOString(),
    tenders,
  });
}
