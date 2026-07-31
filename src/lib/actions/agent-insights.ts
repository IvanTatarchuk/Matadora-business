"use server";

import { createClient } from "@/lib/supabase/server";
import { cashFlowAnalyzerAgent } from "@/agents/cash-flow-analyzer";

export interface CashFlowInsight {
  receivableOutstanding: number;
  payableOutstanding: number;
  retentionHeldByUs: number;
  netPosition: number;
  liquidityRisk: "low" | "medium" | "high";
  risks: Array<{ type: string; severity: "low" | "medium" | "high"; detail: string }>;
  overallRisk: "low" | "medium" | "high";
  summary: string;
  recommendations: string[];
}

/**
 * Uruchamia CashFlowAnalyzerAgent dla konkretnego projektu. Agent sam
 * używa klienta service-role (omija RLS), dlatego autoryzacja jest
 * sprawdzana tutaj jawnie — tylko wykonawca będący właścicielem projektu.
 */
export async function getCashFlowInsight(
  projectId: string
): Promise<CashFlowInsight | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nie zalogowano" };

  const { data: project } = await supabase
    .from("projects")
    .select("id, contractor_id")
    .eq("id", projectId)
    .single();
  if (!project || project.contractor_id !== user.id) {
    return { error: "Brak dostępu do tego projektu" };
  }

  try {
    const [liquidity, risks, optimization] = await Promise.all([
      cashFlowAnalyzerAgent.analyzeLiquidity(projectId),
      cashFlowAnalyzerAgent.assessRisks(projectId),
      cashFlowAnalyzerAgent.optimizeCashFlow(projectId),
    ]);

    return {
      ...liquidity,
      risks: risks.risks,
      overallRisk: risks.overallRisk,
      summary: optimization.summary,
      recommendations: optimization.recommendations,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Nieznany błąd" };
  }
}
