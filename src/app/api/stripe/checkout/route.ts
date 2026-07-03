import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const TIERS = {
  maly: {
    name: "Kosztorys Mały",
    description: "Do 30 pozycji KNR · Wysyłka + podpis elektroniczny · Zapis w chmurze 1 rok",
    amount: 14900, // grosz (PLN × 100)
  },
  standardowy: {
    name: "Kosztorys Standardowy",
    description: "Do 100 pozycji KNR · Harmonogram · Eksport .ath · Faktura KSeF · Projekt",
    amount: 29900,
  },
  kompleksowy: {
    name: "Kosztorys Kompleksowy",
    description: "Nielimitowane pozycje · Portal inwestora · Pełny projekt management · XML przetargi",
    amount: 49900,
  },
} as const;

type Tier = keyof typeof TIERS;

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
  const tier = body.tier as Tier;

  if (!tier || !(tier in TIERS)) {
    return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
  }

  // Optional buyer NIP (Polish tax ID), for invoicing — sanitize to digits/dashes, max 20 chars
  const nipRaw = typeof body.nip === "string" ? body.nip : "";
  const nip = nipRaw.replace(/[^0-9-]/g, "").slice(0, 20);

  const product = TIERS[tier];
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
      "success_url": `${siteUrl}/kosztorys/success?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
      "cancel_url": `${siteUrl}/pricing`,
      "metadata[tier]": tier,
      "metadata[amount_pln]": String(product.amount),
      // Save pending purchase after session created via webhook
      "payment_intent_data[metadata][tier]": tier,
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
        tier,
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
