import Anthropic from "@anthropic-ai/sdk";

import { createAdminClient } from "@/lib/supabase/admin";
import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Offer Win-Rate Analyzer Agent — analizuje realną skuteczność ofert
 * kontraktora na podstawie public.offers (status: draft/sent/accepted/rejected)
 * i public.offer_stages, żeby wskazać, które etapy/ceny korelują z odrzuceniem.
 */
export class OfferWinRateAnalyzerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "offer-win-rate-analyzer",
      name: "Offer Win-Rate Analyzer Agent",
      description:
        "Analizuje historię ofert kontraktora, wykrywa wzorce cenowe skorelowane z odrzuceniem i proponuje konkretne poprawki.",
      category: "sales",
      capabilities: [
        "win_rate_tracking",
        "pricing_pattern_detection",
        "stage_cost_analysis",
        "recommendation",
      ],
      dependencies: [],
      priority: 6,
    };
  }

  private db() {
    return createAdminClient();
  }

  /**
   * Realny win-rate kontraktora: accepted / (accepted + rejected), pomijając
   * draft i sent (jeszcze nierozstrzygnięte).
   */
  async winRate(contractorId: string): Promise<{
    totalDecided: number;
    accepted: number;
    rejected: number;
    winRatePct: number;
  }> {
    const { data, error } = await this.db()
      .from("offers")
      .select("status")
      .eq("contractor_id", contractorId)
      .in("status", ["accepted", "rejected"]);
    if (error) throw error;

    const accepted = (data ?? []).filter((o) => o.status === "accepted").length;
    const rejected = (data ?? []).filter((o) => o.status === "rejected").length;
    const totalDecided = accepted + rejected;

    return {
      totalDecided,
      accepted,
      rejected,
      winRatePct: totalDecided > 0 ? Math.round((accepted / totalDecided) * 1000) / 10 : 0,
    };
  }

  /**
   * Porównuje średni total_gross i rozkład kosztów etapów między ofertami
   * zaakceptowanymi i odrzuconymi — realne dane, nie szacunki.
   */
  async pricingPatterns(contractorId: string): Promise<{
    avgAcceptedGross: number;
    avgRejectedGross: number;
    acceptedStageAvg: Record<string, number>;
    rejectedStageAvg: Record<string, number>;
  }> {
    const db = this.db();
    const { data: offers, error } = await db
      .from("offers")
      .select("id, status, total_gross")
      .eq("contractor_id", contractorId)
      .in("status", ["accepted", "rejected"]);
    if (error) throw error;

    const accepted = (offers ?? []).filter((o) => o.status === "accepted");
    const rejected = (offers ?? []).filter((o) => o.status === "rejected");

    const avg = (rows: { total_gross: number }[]) =>
      rows.length > 0 ? rows.reduce((s, r) => s + Number(r.total_gross ?? 0), 0) / rows.length : 0;

    const stageAvgFor = async (offerIds: string[]): Promise<Record<string, number>> => {
      if (offerIds.length === 0) return {};
      const { data: stages, error: sErr } = await db
        .from("offer_stages")
        .select("stage_name, cost")
        .in("offer_id", offerIds);
      if (sErr) throw sErr;

      const byStage = new Map<string, { sum: number; count: number }>();
      for (const s of stages ?? []) {
        const entry = byStage.get(s.stage_name) ?? { sum: 0, count: 0 };
        entry.sum += Number(s.cost ?? 0);
        entry.count += 1;
        byStage.set(s.stage_name, entry);
      }
      const result: Record<string, number> = {};
      for (const [name, { sum, count }] of byStage) {
        result[name] = Math.round(sum / count);
      }
      return result;
    };

    const [acceptedStageAvg, rejectedStageAvg] = await Promise.all([
      stageAvgFor(accepted.map((o) => o.id)),
      stageAvgFor(rejected.map((o) => o.id)),
    ]);

    return {
      avgAcceptedGross: Math.round(avg(accepted)),
      avgRejectedGross: Math.round(avg(rejected)),
      acceptedStageAvg,
      rejectedStageAvg,
    };
  }

  /**
   * Rekomendacje wygenerowane realnym wywołaniem Claude na podstawie
   * właśnie zebranych danych win-rate i wzorców cenowych tego kontraktora.
   */
  async recommendations(contractorId: string): Promise<{
    summary: string;
    recommendations: string[];
  }> {
    const [rate, patterns] = await Promise.all([
      this.winRate(contractorId),
      this.pricingPatterns(contractorId),
    ]);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        summary: "Analiza AI niedostępna: brak konfiguracji ANTHROPIC_API_KEY.",
        recommendations: [],
      };
    }

    if (rate.totalDecided < 3) {
      return {
        summary: `Za mało rozstrzygniętych ofert (${rate.totalDecided}) do wiarygodnej analizy wzorców.`,
        recommendations: [],
      };
    }

    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `Jesteś doradcą sprzedażowym dla generalnego wykonawcy budowlanego w Polsce. Na podstawie rzeczywistych danych o ofertach zaproponuj 3-5 konkretnych, krótkich rekomendacji poprawy skuteczności ofert (po polsku):

Win-rate: ${rate.winRatePct}% (${rate.accepted} zaakceptowanych / ${rate.rejected} odrzuconych, ${rate.totalDecided} rozstrzygniętych)
Średnia kwota brutto ofert zaakceptowanych: ${patterns.avgAcceptedGross} PLN
Średnia kwota brutto ofert odrzuconych: ${patterns.avgRejectedGross} PLN
Średni koszt etapów w ofertach zaakceptowanych: ${JSON.stringify(patterns.acceptedStageAvg)}
Średni koszt etapów w ofertach odrzuconych: ${JSON.stringify(patterns.rejectedStageAvg)}

Odpowiedz w formacie: pierwsza linia to jednozdaniowe podsumowanie sytuacji, kolejne linie to rekomendacje (po jednej na linię, bez numeracji).`,
        },
      ],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const [summary, ...recommendations] = lines;

    return { summary: summary ?? "", recommendations };
  }

  getConfig(): AgentConfig {
    return this.config;
  }
}

export const offerWinRateAnalyzerAgent = new OfferWinRateAnalyzerAgent();
