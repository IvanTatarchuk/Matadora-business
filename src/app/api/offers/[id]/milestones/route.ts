import { NextRequest, NextResponse } from "next/server";
import { listPaymentMilestones } from "@/lib/actions/payment-milestones";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const milestones = await listPaymentMilestones(params.id);
    return NextResponse.json({ milestones });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch milestones" },
      { status: 500 }
    );
  }
}
