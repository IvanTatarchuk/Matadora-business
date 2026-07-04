import { NextRequest, NextResponse } from "next/server";
import { listGeneratedOffers } from "@/lib/actions/offer-generator";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }
    
    const offers = await listGeneratedOffers(projectId);
    return NextResponse.json({ offers });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch offers" },
      { status: 500 }
    );
  }
}
