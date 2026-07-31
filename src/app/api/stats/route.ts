import { NextResponse } from "next/server";
import { getUserStats, getProjectStats } from "@/lib/actions/stats";

export async function GET() {
  try {
    const userStats = await getUserStats();
    const projectStats = await getProjectStats();
    
    return NextResponse.json({
      users: userStats,
      projects: projectStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
