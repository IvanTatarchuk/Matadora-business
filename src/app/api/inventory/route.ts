import { NextRequest, NextResponse } from "next/server";
import { listInventoryItems, listInventoryTransactions } from "@/lib/actions/inventory";

export async function GET(req: NextRequest) {
  try {
    const items = await listInventoryItems();
    const transactions = await listInventoryTransactions();
    return NextResponse.json({ items, transactions });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
