import { NextRequest, NextResponse } from "next/server";
import { globalSearch } from "@/lib/actions/search";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const type = searchParams.get("type") as any || undefined;

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await globalSearch(query, type);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
