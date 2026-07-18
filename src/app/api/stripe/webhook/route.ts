import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Stripe sends raw body — must disable Next.js body parsing
export const dynamic = "force-dynamic";

async function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  // Stripe uses HMAC-SHA256 with timestamp to prevent replay attacks
  const parts = signature.split(",");
  const tsPart = parts.find((p) => p.startsWith("t="));
  const v1Part = parts.find((p) => p.startsWith("v1="));
  if (!tsPart || !v1Part) return false;

  const timestamp = tsPart.slice(2);
  const expected = v1Part.slice(3);
  const payload = `${timestamp}.${body}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Replay protection: reject events older than 5 minutes
  const ts = parseInt(timestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  return hex === expected;
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  const valid = await verifyStripeSignature(body, signature, webhookSecret);
  if (!valid) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const sessionId = session.id as string;
    const email = (session.customer_details as { email?: string } | null)?.email ?? "unknown";
    const tier = (session.metadata as Record<string, string> | null)?.tier ?? "standardowy";
    const amountTotal = (session.amount_total as number) ?? 0;
    const paymentIntent = session.payment_intent as string | null;

    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const supabase = createAdminClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = (s: any) => s as any;

      // Upsert: session may already exist as pending
      const { data: existing } = await db(supabase)
        .from("kosztorys_purchases")
        .select("id")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();

      if (existing) {
        await db(supabase)
          .from("kosztorys_purchases")
          .update({
            status: "paid",
            email,
            stripe_payment_id: paymentIntent,
            amount_pln: amountTotal,
            paid_at: new Date().toISOString(),
          })
          .eq("stripe_session_id", sessionId);
      } else {
        await db(supabase)
          .from("kosztorys_purchases")
          .insert({
            stripe_session_id: sessionId,
            stripe_payment_id: paymentIntent,
            email,
            tier,
            amount_pln: amountTotal,
            status: "paid",
            paid_at: new Date().toISOString(),
          });
      }

      console.log(`[stripe] purchase recorded: ${tier} ${email}`);
    } catch (err) {
      console.error("[stripe] db error:", err);
      // Return 200 anyway — Stripe will not retry on 200
    }
  }

  return NextResponse.json({ received: true });
}
