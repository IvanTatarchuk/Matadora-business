import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 4 * 1024 * 1024;

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    document_type: { type: "string" },
    summary: { type: "string" },
    overall_risk: {
      type: "string",
      enum: ["niskie", "umiarkowane", "wysokie", "krytyczne"],
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          clause: { type: "string" },
          issue: { type: "string" },
          severity: {
            type: "string",
            enum: ["niskie", "umiarkowane", "wysokie", "krytyczne"],
          },
          recommendation: { type: "string" },
        },
        required: ["clause", "issue", "severity", "recommendation"],
        additionalProperties: false,
      },
    },
  },
  required: ["document_type", "summary", "overall_risk", "findings"],
  additionalProperties: false,
} as const;

const ANALYSIS_PROMPT = `Jesteś doświadczonym polskim prawnikiem specjalizującym się w prawie cywilnym i umowach gospodarczych. Przeanalizuj załączony dokument (umowę lub inny dokument prawny) pod kątem ryzyk dla strony, która go otrzymała do podpisu.

Zwróć uwagę w szczególności na:
- niekorzystne lub jednostronne klauzule (np. nadmierne kary umowne, brak wzajemności zobowiązań)
- brakujące istotne postanowienia (np. brak terminu realizacji, brak warunków odstąpienia, brak określenia odpowiedzialności)
- niejasne lub nieprecyzyjne sformułowania mogące prowadzić do sporów
- klauzule niezgodne z Kodeksem cywilnym lub innymi obowiązującymi przepisami
- nierównowagę w prawach i obowiązkach stron

Dla każdego znalezionego problemu podaj:
- clause: fragment lub numer paragrafu, którego dotyczy uwaga (krótki cytat lub opis lokalizacji)
- issue: opis problemu (po polsku)
- severity: poziom ryzyka (niskie / umiarkowane / wysokie / krytyczne)
- recommendation: konkretna, wykonalna rekomendacja zmiany lub negocjacji zapisu

Podaj też document_type — rozpoznany typ dokumentu (np. "Umowa o roboty budowlane"). W summary podsumuj ogólną ocenę dokumentu w 1-3 zdaniach. Oceń overall_risk na podstawie najpoważniejszego znalezionego problemu. Jeśli dokument nie budzi zastrzeżeń, zwróć pustą listę findings i napisz to w summary.`;

type AnalysisResult = {
  document_type: string;
  summary: string;
  overall_risk: string;
  findings: Array<{
    clause: string;
    issue: string;
    severity: string;
    recommendation: string;
  }>;
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
      { error: "Analiza AI jest chwilowo niedostępna. Spróbuj ponownie później." },
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

  if (purchase?.metadata?.product !== "adwokat") {
    return NextResponse.json({ error: "Płatność nie dotyczy tej usługi." }, { status: 402 });
  }
  if (purchase?.metadata?.document_analyzed) {
    return NextResponse.json(
      { error: "W tej sesji dokument został już przeanalizowany." },
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

    const parsed = JSON.parse(textBlock.text) as AnalysisResult;

    try {
      await db(supabase)
        .from("kosztorys_purchases")
        .update({ status: "paid", metadata: { ...(purchase?.metadata ?? {}), document_analyzed: true } })
        .eq("stripe_session_id", sessionId);
    } catch {
      // Non-blocking — worst case the same session could be replayed once more
    }

    return NextResponse.json({ success: true, ...parsed });
  } catch (err) {
    console.error("Legal document analysis failed", err);
    return NextResponse.json(
      { error: "Analiza dokumentu nie powiodła się. Spróbuj ponownie." },
      { status: 500 }
    );
  }
}
