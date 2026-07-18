import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

// Keep well under Anthropic's 32 MB request limit and Vercel's serverless
// request body ceiling (~4.5 MB on the default plan).
const MAX_PDF_BYTES = 4 * 1024 * 1024;

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    project_name: { type: ["string", "null"] },
    summary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          unit: { type: "string" },
          qty: { type: "number" },
          knr_code: { type: ["string", "null"] },
          labor_rate: { type: "number" },
          material_rate: { type: "number" },
        },
        required: ["name", "unit", "qty", "knr_code", "labor_rate", "material_rate"],
        additionalProperties: false,
      },
    },
  },
  required: ["project_name", "summary", "items"],
  additionalProperties: false,
} as const;

const ANALYSIS_PROMPT = `Jesteś ekspertem kosztorysowym budowlanym w Polsce. Przeanalizuj załączony dokument PDF — może to być rzut architektoniczny, wykaz pomieszczeń, przedmiar robót, inwentaryzacja lub istniejący kosztorys — i wyodrębnij z niego pozycje robót budowlanych.

Dla każdej pozycji podaj:
- name: nazwa robocizny/materiału zgodna z terminologią budowlaną (po polsku)
- unit: jednostka (m², m, szt, kpl)
- qty: ilość — oszacowana na podstawie wymiarów, powierzchni lub danych podanych w dokumencie
- knr_code: kod KNR jeśli można go rozsądnie dopasować (np. "KNR 4-01 0501-01"), w przeciwnym razie null
- labor_rate: orientacyjna stawka robocizny w PLN za jednostkę (region centralny, ceny rynkowe)
- material_rate: orientacyjna stawka materiału w PLN za jednostkę (ceny rynkowe)

Jeśli dokument zawiera nazwę inwestycji lub projektu, podaj ją w project_name (inaczej null). W summary napisz 1-2 zdania po polsku podsumowujące, co znalazłeś w dokumencie i na jakiej podstawie oszacowałeś ilości.

Jeśli w dokumencie nie ma żadnych sensownych pozycji budowlanych do wyodrębnienia, zwróć pustą listę items i wyjaśnij dlaczego w summary.`;

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
      { error: "Analiza AI jest chwilowo niedostępna. Spróbuj ponownie później." },
      { status: 503 }
    );
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Płatności są chwilowo niedostępne." }, { status: 503 });
  }

  let file: File;
  let sessionId: string;
  try {
    const formData = await req.formData();
    const uploaded = formData.get("file");
    if (!(uploaded instanceof File)) {
      return NextResponse.json({ error: "Nie znaleziono pliku PDF." }, { status: 400 });
    }
    file = uploaded;
    const sessionIdField = formData.get("session_id");
    if (typeof sessionIdField !== "string" || !sessionIdField) {
      return NextResponse.json({ error: "Brak potwierdzenia płatności." }, { status: 402 });
    }
    sessionId = sessionIdField;
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe żądanie." }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Plik musi być w formacie PDF." }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: `Plik jest za duży — limit to ${Math.floor(MAX_PDF_BYTES / (1024 * 1024))} MB.` },
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

  if (purchase?.metadata?.analysis_used) {
    return NextResponse.json(
      { error: "Ta płatność została już wykorzystana do analizy dokumentu." },
      { status: 409 }
    );
  }

  try {
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      output_config: { format: { type: "json_schema", schema: ANALYSIS_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            },
            { type: "text", text: ANALYSIS_PROMPT },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "Analiza dokumentu została odrzucona przez system bezpieczeństwa AI." },
        { status: 422 }
      );
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Brak odpowiedzi z analizy AI." }, { status: 502 });
    }

    const parsed = JSON.parse(textBlock.text) as {
      project_name: string | null;
      summary: string;
      items: Array<{
        name: string;
        unit: string;
        qty: number;
        knr_code: string | null;
        labor_rate: number;
        material_rate: number;
      }>;
    };

    try {
      await db(supabase)
        .from("kosztorys_purchases")
        .update({ status: "paid", metadata: { ...(purchase?.metadata ?? {}), analysis_used: true } })
        .eq("stripe_session_id", sessionId);
    } catch {
      // Non-blocking — worst case the same session could be replayed once more
    }

    return NextResponse.json({ success: true, ...parsed });
  } catch (err) {
    console.error("kosztorys PDF analysis failed", err);
    return NextResponse.json(
      { error: "Analiza dokumentu nie powiodła się. Spróbuj ponownie." },
      { status: 500 }
    );
  }
}
