import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { cashFlowAnalyzerAgent } from "@/agents/cash-flow-analyzer";
import { offerWinRateAnalyzerAgent } from "@/agents/offer-win-rate-analyzer";

/**
 * Nightly autonomous run of the agent team over the real Matadora platform
 * data. Existing agents (cash-flow-analyzer) were previously on-demand only
 * (triggered from a Server Action when a contractor opens a project) — this
 * adds a scheduled pass so contractors get insights without having to ask,
 * and stores history in agent_insight_reports instead of only the latest
 * on-demand result.
 *
 * Wire this up in vercel.json as a cron hitting this route with the
 * Authorization: Bearer ${CRON_SECRET} header (Vercel sets this
 * automatically for its own Cron Jobs when CRON_SECRET is configured).
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const results: Array<{ agent: string; contractor_id: string; project_id?: string; status: string }> = [];

  // --- Cash Flow Analyzer: per active project -----------------------------
  const { data: projects, error: projErr } = await db
    .from("projects")
    .select("id, contractor_id")
    .eq("status", "in_progress");

  if (projErr) {
    return NextResponse.json({ error: "failed to list projects", detail: projErr.message }, { status: 500 });
  }

  for (const project of projects ?? []) {
    try {
      const [liquidity, risks, optimization] = await Promise.all([
        cashFlowAnalyzerAgent.analyzeLiquidity(project.id),
        cashFlowAnalyzerAgent.assessRisks(project.id),
        cashFlowAnalyzerAgent.optimizeCashFlow(project.id),
      ]);

      await db.from("agent_insight_reports").insert({
        agent_id: "cash-flow-analyzer",
        contractor_id: project.contractor_id,
        project_id: project.id,
        summary: optimization.summary,
        recommendations: optimization.recommendations,
        raw_data: { liquidity, risks },
        status: "ok",
      });
      results.push({ agent: "cash-flow-analyzer", contractor_id: project.contractor_id, project_id: project.id, status: "ok" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.from("agent_insight_reports").insert({
        agent_id: "cash-flow-analyzer",
        contractor_id: project.contractor_id,
        project_id: project.id,
        status: "error",
        error_message: message.slice(0, 1000),
      });
      results.push({ agent: "cash-flow-analyzer", contractor_id: project.contractor_id, project_id: project.id, status: "error" });
    }
  }

  // --- Offer Win-Rate Analyzer: per contractor (account-wide) -------------
  const { data: contractors, error: contErr } = await db
    .from("profiles")
    .select("id")
    .eq("role", "contractor");

  if (contErr) {
    return NextResponse.json({ error: "failed to list contractors", detail: contErr.message, results }, { status: 500 });
  }

  for (const contractor of contractors ?? []) {
    try {
      const [rate, patterns, recs] = await Promise.all([
        offerWinRateAnalyzerAgent.winRate(contractor.id),
        offerWinRateAnalyzerAgent.pricingPatterns(contractor.id),
        offerWinRateAnalyzerAgent.recommendations(contractor.id),
      ]);

      await db.from("agent_insight_reports").insert({
        agent_id: "offer-win-rate-analyzer",
        contractor_id: contractor.id,
        summary: recs.summary,
        recommendations: recs.recommendations,
        raw_data: { rate, patterns },
        status: recs.recommendations.length > 0 || rate.totalDecided >= 3 ? "ok" : "skipped",
      });
      results.push({ agent: "offer-win-rate-analyzer", contractor_id: contractor.id, status: "ok" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.from("agent_insight_reports").insert({
        agent_id: "offer-win-rate-analyzer",
        contractor_id: contractor.id,
        status: "error",
        error_message: message.slice(0, 1000),
      });
      results.push({ agent: "offer-win-rate-analyzer", contractor_id: contractor.id, status: "error" });
    }
  }

  return NextResponse.json({ ok: true, ran: results.length, results });
}
