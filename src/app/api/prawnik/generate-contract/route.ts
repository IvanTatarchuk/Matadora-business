import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const CONTRACT_SCHEMA = {
  type: "object",
  properties: {
    contract_title: { type: "string" },
    contract_text: { type: "string" },
    key_points: { type: "array", items: { type: "string" } },
    legal_notes: { type: "string" },
  },
  required: ["contract_title", "contract_text", "key_points", "legal_notes"],
  additionalProperties: false,
} as const;

type ContractResult = {
  contract_title: string;
  contract_text: string;
  key_points: string[];
  legal_notes: string;
};

/** Verifies payment directly against Stripe (source of truth — avoids waiting on webhook latency). */
async function fetchPaidSession(sessionId: string, stripeKey: string) {
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${stripeKey}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as { id: string; payment_status: string };
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Generowanie AI jest chwilowo niedostępne. Spróbuj ponownie później." },
      { status: 503 }
    );
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Płatności są chwilowo niedostępne." }, { status: 503 });
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabaseUser = createClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Zaloguj się, aby skorzystać z Adwokata AI." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  if (!sessionId) {
    return NextResponse.json({ error: "Brak potwierdzenia płatności." }, { status: 402 });
  }

  const contractType = typeof body.contractType === "string" ? body.contractType.trim() : "";
  const partyA = typeof body.partyA === "string" ? body.partyA.trim() : "";
  const partyB = typeof body.partyB === "string" ? body.partyB.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const value = typeof body.value === "string" ? body.value.trim() : "";
  const dates = typeof body.dates === "string" ? body.dates.trim() : "";
  const paymentTerms = typeof body.paymentTerms === "string" ? body.paymentTerms.trim() : "";
  const specialTerms = typeof body.specialTerms === "string" ? body.specialTerms.trim() : "";

  if (!contractType || !partyA || !partyB || !subject) {
    return NextResponse.json(
      { error: "Podaj typ umowy, strony umowy oraz przedmiot umowy." },
      { status: 400 }
    );
  }

  const session = await fetchPaidSession(sessionId, stripeKey);
  if (!session || session.payment_status !== "paid") {
    return NextResponse.json({ error: "Płatność nie została potwierdzona." }, { status: 402 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (s: any) => s as any;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data: purchase } = await db(supabase)
    .from("kosztorys_purchases")
    .select("id, metadata")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (purchase?.metadata?.product !== "adwokat") {
    return NextResponse.json({ error: "Płatność nie dotyczy tej usługi." }, { status: 402 });
  }
  if (purchase?.metadata?.contract_generated) {
    return NextResponse.json(
      { error: "W tej sesji umowa została już wygenerowana." },
      { status: 409 }
    );
  }

  const prompt = `Jesteś doświadczonym polskim prawnikiem specjalizującym się w prawie cywilnym i budowlanym. Przygotuj kompletny projekt umowy zgodny z polskim prawem (Kodeks cywilny) na podstawie poniższych danych.

Typ umowy: ${contractType}
Strona A: ${partyA}
Strona B: ${partyB}
Przedmiot umowy: ${subject}
Wynagrodzenie / wartość: ${value || "nie podano — pomiń lub oznacz jako do uzupełnienia"}
Terminy realizacji: ${dates || "nie podano — pomiń lub oznacz jako do uzupełnienia"}
Warunki płatności: ${paymentTerms || "nie podano — zaproponuj standardowe warunki"}
Dodatkowe warunki / klauzule specjalne: ${specialTerms || "brak"}

Wygeneruj pełny tekst umowy po polsku, z numerowanymi paragrafami (§1, §2, ...), zawierający co najmniej: strony umowy, przedmiot umowy, wynagrodzenie i warunki płatności, terminy i sposób realizacji, obowiązki stron, warunki odstąpienia/wypowiedzenia, kary umowne (jeśli zasadne), postanowienia końcowe (właściwość sądu, forma zmian, liczba egzemplarzy). Tekst umowy umieść w polu contract_text jako gotowy do wydruku dokument tekstowy (bez markdown, zwykły tekst z podziałem na paragrafy i akapity).

W key_points podaj krótką listę (4-7 punktów) najważniejszych ustaleń zawartych w umowie. W legal_notes napisz krótkie zastrzeżenie (2-4 zdania) — że to wstępny projekt wygenerowany przez AI, wymagający weryfikacji przez radcę prawnego/adwokata przed podpisaniem, oraz wskaż ewentualne elementy wymagające uzupełnienia przez strony.`;

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8192,
      output_config: { format: { type: "json_schema", schema: CONTRACT_SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "Wygenerowanie umowy zostało odrzucone przez system bezpieczeństwa AI." },
        { status: 422 }
      );
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Brak odpowiedzi z generatora AI." }, { status: 502 });
    }

    const parsed = JSON.parse(textBlock.text) as ContractResult;

    try {
      await db(supabase)
        .from("kosztorys_purchases")
        .update({ status: "paid", metadata: { ...(purchase?.metadata ?? {}), contract_generated: true } })
        .eq("stripe_session_id", sessionId);
    } catch {
      // Non-blocking — worst case the same session could be replayed once more
    }

    return NextResponse.json({ success: true, ...parsed });
  } catch (err) {
    console.error("Contract generation failed", err);
    return NextResponse.json(
      { error: "Generowanie umowy nie powiodło się. Spróbuj ponownie." },
      { status: 500 }
    );
  }
}
