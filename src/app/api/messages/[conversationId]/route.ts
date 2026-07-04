import { NextRequest, NextResponse } from "next/server";
import { listMessages } from "@/lib/actions/messenger";

export async function GET(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const messages = await listMessages(params.conversationId);
    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
