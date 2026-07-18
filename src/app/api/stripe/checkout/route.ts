import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// The platform itself is free — the only paid action is AI-assisted kosztorys
// generation (PDF upload → extracted line items), a flat one-off fee.
const PRODUCT = {
  name: "Analiza AI kosztorysu",
  description: "Automatyczne rozpoznanie pozycji kosztorysowych z przesłanego dokumentu PDF przy pomocy AI.",
  amount: 50000, // grosz (PLN × 100) = 500,00 zł
} as const;

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  // ── Fallback: no Stripe keys configured ─────────────────────────────────
  if (!stripeKey) {
    return NextResponse.json(
      { error: "payments_not_configured", fallbackEmail: "vanbud.felix@gmail.com" },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));

  // Optional buyer NIP (Polish tax ID), for invoicing — sanitize to digits/dashes, max 20 chars
  const nipRaw = typeof body.nip === "string" ? body.nip : "";
  const nip = nipRaw.replace(/[^0-9-]/g, "").slice(0, 20);

  const product = PRODUCT;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://matadora.business";

  try {
    const params = new URLSearchParams({
      "payment_method_types[]": "card",
      "mode": "payment",
      "locale": "pl",
      "line_items[0][price_data][currency]": "pln",
      "line_items[0][price_data][unit_amount]": String(product.amount),
      "line_items[0][price_data][product_data][name]": product.name,
      "line_items[0][price_data][product_data][description]": product.description,
      "line_items[0][quantity]": "1",
      "success_url": `${siteUrl}/kosztorys/success?session_id={CHECKOUT_SESSION_ID}`,
      "cancel_url": `${siteUrl}/kosztorys`,
      "metadata[amount_pln]": String(product.amount),
    });
    if (nip) {
      params.set("metadata[nip]", nip);
      params.set("payment_intent_data[metadata][nip]", nip);
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const session = await res.json();

    if (!res.ok) {
      console.error("Stripe error:", session);
      return NextResponse.json({ error: session.error?.message ?? "stripe_error" }, { status: 502 });
    }

    // Insert pending purchase record
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const supabase = createAdminClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("kosztorys_purchases").insert({
        stripe_session_id: session.id,
        email: session.customer_details?.email ?? "unknown",
        // `tier` is a fixed DB enum (maly/standardowy/kompleksowy) from the old
        // tiered-pricing model; kept as a bookkeeping label since adding a new
        // enum value needs a migration (reserved for manual, owner-run changes).
        tier: "standardowy",
        amount_pln: product.amount,
        status: "pending",
        metadata: nip ? { nip } : null,
      });
    } catch {
      // Non-blocking — record will be created by webhook
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
