"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupportAdmin } from "@/lib/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export type MarketingDraftType = "social_post" | "blog_article" | "ad_campaign";
export type MarketingDraftStatus = "draft" | "approved" | "rejected" | "published";

export type MarketingDraft = {
  id: string;
  type: MarketingDraftType;
  platform: string | null;
  topic: string;
  title: string | null;
  content: string;
  meta: Record<string, unknown> | null;
  status: MarketingDraftStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isSupportAdmin(user.email)) return null;
  return user;
}

const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    content: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
    headline_variants: { type: "array", items: { type: "string" } },
    targeting_notes: { type: "string" },
    budget_suggestion_pln: { type: "string" },
  },
  required: ["title", "content"],
  additionalProperties: false,
} as const;

const TYPE_PROMPT: Record<MarketingDraftType, (topic: string, platform: string) => string> = {
  social_post: (topic, platform) =>
    `Napisz angażujący post na ${platform || "social media"} po polsku dla platformy matadora.business ` +
    `(ConTech SaaS łączący inwestorów, wykonawców i hurtownie materiałów budowlanych w Polsce). ` +
    `Temat/brief: ${topic}. Ton: profesjonalny, ale przystępny, budowlana branża. ` +
    `Podaj title (krótki wewnętrzny opis posta), content (gotowy tekst posta, max 200 słów) ` +
    `oraz hashtags (3-6 trafnych, po polsku, bez spacji).`,
  blog_article: (topic, _platform) =>
    `Napisz szkic artykułu blogowego (SEO) po polsku dla matadora.business na temat: ${topic}. ` +
    `Docelowa grupa: wykonawcy, inwestorzy i hurtownie materiałów budowlanych w Polsce. ` +
    `Podaj title (nagłówek SEO) i content (pełny szkic artykułu, nagłówki H2, 400-700 słów, ` +
    `naturalnie wspominający funkcje platformy tam gdzie to zasadne, bez nachalnej reklamy).`,
  ad_campaign: (topic, platform) =>
    `Przygotuj brief kampanii reklamowej (${platform || "Google/Meta Ads"}) po polsku dla matadora.business ` +
    `na temat: ${topic}. To WYŁĄCZNIE brief do ręcznej konfiguracji przez właściciela — nie jest to ` +
    `publikowane ani uruchamiane automatycznie. Podaj title (nazwa kampanii), content (główny opis/uzasadnienie ` +
    `kampanii), headline_variants (3-5 wariantów nagłówka reklamy, każdy max 30 znaków), ` +
    `targeting_notes (sugerowane targetowanie: rola/branża/region) i budget_suggestion_pln ` +
    `(orientacyjny sugerowany budżet miesięczny w PLN, jako tekst z uzasadnieniem).`,
};

export async function generateMarketingDraft(input: {
  type: MarketingDraftType;
  platform: string;
  topic: string;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Brak uprawnień" };

  const topic = input.topic.trim();
  if (!topic) return { ok: false, error: "Podaj temat/brief." };

  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "Generowanie AI jest chwilowo niedostępne." };
  }

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const prompt = TYPE_PROMPT[input.type](topic, input.platform);

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      output_config: { format: { type: "json_schema", schema: DRAFT_SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, error: "Brak odpowiedzi z generatora AI." };
    }

    const parsed = JSON.parse(textBlock.text) as {
      title: string;
      content: string;
      hashtags?: string[];
      headline_variants?: string[];
      targeting_notes?: string;
      budget_suggestion_pln?: string;
    };

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();
    const { data, error } = await db(supabase)
      .from("marketing_drafts")
      .insert({
        type: input.type,
        platform: input.platform || null,
        topic,
        title: parsed.title,
        content: parsed.content,
        meta: {
          hashtags: parsed.hashtags ?? [],
          headline_variants: parsed.headline_variants ?? [],
          targeting_notes: parsed.targeting_notes ?? null,
          budget_suggestion_pln: parsed.budget_suggestion_pln ?? null,
        },
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };

    revalidatePath("/dashboard/marketing");
    return { ok: true, id: data.id };
  } catch (err) {
    console.error("Marketing draft generation failed", err);
    return { ok: false, error: "Generowanie nie powiodło się. Spróbuj ponownie." };
  }
}

export async function listMarketingDrafts(): Promise<MarketingDraft[]> {
  const admin = await requireAdmin();
  if (!admin) return [];

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data } = await db(supabase)
    .from("marketing_drafts")
    .select("*")
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function updateDraftContent(id: string, content: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Brak uprawnień" };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { error } = await db(supabase).from("marketing_drafts").update({ content }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/marketing");
  return { ok: true };
}

export async function setDraftStatus(
  id: string,
  status: MarketingDraftStatus
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Brak uprawnień" };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const patch: Record<string, unknown> = { status, reviewed_by: admin.id, reviewed_at: new Date().toISOString() };
  if (status === "published") patch.published_at = new Date().toISOString();

  const { error } = await db(supabase).from("marketing_drafts").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/marketing");
  return { ok: true };
}
