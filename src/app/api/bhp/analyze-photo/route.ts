import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
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
          issue: { type: "string" },
          severity: {
            type: "string",
            enum: ["niskie", "umiarkowane", "wysokie", "krytyczne"],
          },
          legal_basis: { type: "string" },
          recommendation: { type: "string" },
        },
        required: ["issue", "severity", "legal_basis", "recommendation"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "overall_risk", "findings"],
  additionalProperties: false,
} as const;

const ANALYSIS_PROMPT = `Jesteś doświadczonym inspektorem BHP specjalizującym się w polskim prawie budowlanym. Przeanalizuj załączone zdjęcie placu budowy pod kątem zgodności z polskimi przepisami bezpieczeństwa i higieny pracy.

Podstawy prawne, na których masz się opierać:
- Ustawa z dnia 26 czerwca 1974 r. — Kodeks pracy (dział X, BHP)
- Rozporządzenie Ministra Infrastruktury z dnia 6 lutego 2003 r. w sprawie bezpieczeństwa i higieny pracy podczas wykonywania robót budowlanych (Dz.U. 2003 nr 47 poz. 401)
- Rozporządzenie Ministra Pracy i Polityki Socjalnej w sprawie ogólnych przepisów bezpieczeństwa i higieny pracy
- Przepisy dot. rusztowań, pracy na wysokości, wykopów, instalacji elektrycznych i środków ochrony indywidualnej (ŚOI)

Zwróć uwagę w szczególności na:
- brak lub nieprawidłowe stosowanie środków ochrony indywidualnej (kaski, kamizelki, uprzęże, obuwie ochronne)
- zabezpieczenia przed upadkiem z wysokości (balustrady, siatki, oznakowanie stref)
- stan i zabezpieczenie rusztowań oraz drabin
- zabezpieczenie wykopów i stref niebezpiecznych
- porządek na budowie (składowanie materiałów, drogi komunikacyjne, przewody)
- zagrożenia elektryczne i przeciwpożarowe
- oznakowanie i ogrodzenie terenu budowy

Dla każdego zauważonego naruszenia lub zagrożenia podaj:
- issue: krótki opis problemu widocznego na zdjęciu (po polsku)
- severity: poziom ryzyka (niskie / umiarkowane / wysokie / krytyczne)
- legal_basis: konkretny przepis, na który się powołujesz
- recommendation: konkretne, wykonalne zalecenie naprawcze

Jeśli na zdjęciu nie widać żadnych naruszeń, zwróć pustą listę findings i napisz to w summary. W summary podsumuj ogólny stan bezpieczeństwa widoczny na zdjęciu w 1-3 zdaniach. Oceń overall_risk na podstawie najpoważniejszego znalezionego zagrożenia.`;

const OVERALL_RISK_LABEL: Record<string, string> = {
  niskie: "Niskie",
  umiarkowane: "Umiarkowane",
  wysokie: "Wysokie",
  krytyczne: "Krytyczne",
};

type AnalysisResult = {
  summary: string;
  overall_risk: string;
  findings: Array<{
    issue: string;
    severity: string;
    legal_basis: string;
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
    return NextResponse.json({ error: "Zaloguj się, aby skorzystać z analizy." }, { status: 401 });
  }

  let file: File;
  let sessionId: string;
  let projectId: string | null = null;
  try {
    const formData = await req.formData();
    const uploaded = formData.get("file");
    if (!(uploaded instanceof File)) {
      return NextResponse.json({ error: "Nie znaleziono zdjęcia." }, { status: 400 });
    }
    file = uploaded;
    const sessionIdField = formData.get("session_id");
    if (typeof sessionIdField !== "string" || !sessionIdField) {
      return NextResponse.json({ error: "Brak potwierdzenia płatności." }, { status: 402 });
    }
    sessionId = sessionIdField;
    const projectIdField = formData.get("project_id");
    if (typeof projectIdField === "string" && projectIdField) {
      projectId = projectIdField;
    }
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe żądanie." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Plik musi być zdjęciem w formacie JPG, PNG lub WEBP." },
      { status: 400 }
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: `Plik jest za duży — limit to ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))} MB.` },
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
      { error: "Ta płatność została już wykorzystana do analizy zdjęcia." },
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
              type: "image",
              source: {
                type: "base64",
                media_type: file.type as "image/jpeg" | "image/png" | "image/webp",
                data: base64,
              },
            },
            { type: "text", text: ANALYSIS_PROMPT },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "Analiza zdjęcia została odrzucona przez system bezpieczeństwa AI." },
        { status: 422 }
      );
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Brak odpowiedzi z analizy AI." }, { status: 502 });
    }

    const parsed = JSON.parse(textBlock.text) as AnalysisResult;

    const documentContent = [
      parsed.summary,
      "",
      `Ogólny poziom ryzyka: ${OVERALL_RISK_LABEL[parsed.overall_risk] ?? parsed.overall_risk}`,
      ...(parsed.findings.length > 0
        ? [
            "",
            ...parsed.findings.map(
              (f, i) =>
                `${i + 1}. [${OVERALL_RISK_LABEL[f.severity] ?? f.severity}] ${f.issue}\n   Podstawa prawna: ${f.legal_basis}\n   Zalecenie: ${f.recommendation}`
            ),
          ]
        : []),
    ].join("\n");

    try {
      await db(supabase).from("bhp_documents").insert({
        contractor_id: user.id,
        project_id: projectId,
        doc_type: "other",
        title: `Analiza BHP zdjęcia — ${new Date().toLocaleDateString("pl-PL")}`,
        content: documentContent,
        status: "active",
      });
    } catch {
      // Non-blocking — the analysis result is still returned to the caller below
    }

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
    console.error("BHP photo analysis failed", err);
    return NextResponse.json(
      { error: "Analiza zdjęcia nie powiodła się. Spróbuj ponownie." },
      { status: 500 }
    );
  }
}
