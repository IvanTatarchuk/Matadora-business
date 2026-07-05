import Anthropic from "@anthropic-ai/sdk";

import { createAdminClient } from "@/lib/supabase/admin";
import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Cash Flow Analyzer Agent - Агент для аналізу грошового потоку
 * Аналізує грошовий потік проекту на основі реальних даних із
 * cashflow_entries / invoices / retention_payments (не випадкові числа).
 */
export class CashFlowAnalyzerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "cash-flow-analyzer",
      name: "Cash Flow Analyzer Agent",
      description: "Аналізує грошовий потік проекту, прогнозує фінансові потреби та виявляє ризики ліквідності",
      category: "financial",
      capabilities: [
        "cash_flow_projection",
        "liquidity_analysis",
        "payment_tracking",
        "forecasting",
        "risk_assessment",
        "optimization",
      ],
      dependencies: [],
      priority: 6,
    };
  }

  private db() {
    return createAdminClient();
  }

  /**
   * Агрегує фактичний грошовий потік проекту по місяцях
   * (public.cashflow_entries: planned_amount / actual_amount по type).
   */
  async projectCashFlow(
    projectId: string,
    months: number
  ): Promise<{
    monthlyCashFlow: Array<{
      year: number;
      month: number;
      inflow: number;
      outflow: number;
      netCashFlow: number;
      cumulativeBalance: number;
    }>;
  }> {
    const { data, error } = await this.db()
      .from("cashflow_entries")
      .select("period_year, period_month, type, planned_amount, actual_amount")
      .eq("project_id", projectId)
      .order("period_year", { ascending: true })
      .order("period_month", { ascending: true });
    if (error) throw error;

    const byPeriod = new Map<string, { year: number; month: number; inflow: number; outflow: number }>();
    for (const row of data ?? []) {
      const key = `${row.period_year}-${row.period_month}`;
      const amount = Number(row.actual_amount ?? row.planned_amount ?? 0);
      const entry = byPeriod.get(key) ?? {
        year: row.period_year,
        month: row.period_month,
        inflow: 0,
        outflow: 0,
      };
      if (row.type === "inflow") entry.inflow += amount;
      else entry.outflow += amount;
      byPeriod.set(key, entry);
    }

    const sorted = Array.from(byPeriod.values()).sort(
      (a, b) => a.year - b.year || a.month - b.month
    );

    let cumulative = 0;
    const monthlyCashFlow = sorted.slice(0, months).map((p) => {
      const netCashFlow = p.inflow - p.outflow;
      cumulative += netCashFlow;
      return {
        year: p.year,
        month: p.month,
        inflow: Math.round(p.inflow),
        outflow: Math.round(p.outflow),
        netCashFlow: Math.round(netCashFlow),
        cumulativeBalance: Math.round(cumulative),
      };
    });

    return { monthlyCashFlow };
  }

  /**
   * Оцінює позицію ліквідності проекту: скільки грошей реально винні нам
   * (несплачені вхідні рахунки) проти того, скільки винні ми (несплачені
   * вихідні), плюс утримання (retention), яке ще не звільнене.
   */
  async analyzeLiquidity(projectId: string): Promise<{
    receivableOutstanding: number;
    payableOutstanding: number;
    retentionHeldByUs: number;
    netPosition: number;
    liquidityRisk: "low" | "medium" | "high";
  }> {
    const db = this.db();

    const [{ data: invoices, error: invErr }, { data: retention, error: retErr }] = await Promise.all([
      db
        .from("invoices")
        .select("direction, gross_amount, status")
        .eq("project_id", projectId)
        .in("status", ["unpaid", "partially_paid", "overdue"]),
      db
        .from("retention_payments")
        .select("retention_amount, direction, released_at")
        .eq("project_id", projectId)
        .is("released_at", null),
    ]);
    if (invErr) throw invErr;
    if (retErr) throw retErr;

    const receivableOutstanding = (invoices ?? [])
      .filter((i) => i.direction === "outgoing")
      .reduce((sum, i) => sum + Number(i.gross_amount ?? 0), 0);
    const payableOutstanding = (invoices ?? [])
      .filter((i) => i.direction === "incoming")
      .reduce((sum, i) => sum + Number(i.gross_amount ?? 0), 0);
    const retentionHeldByUs = (retention ?? [])
      .filter((r) => r.direction === "held")
      .reduce((sum, r) => sum + Number(r.retention_amount ?? 0), 0);

    const netPosition = receivableOutstanding - payableOutstanding;
    const liquidityRisk: "low" | "medium" | "high" =
      netPosition < 0 && Math.abs(netPosition) > payableOutstanding * 0.3
        ? "high"
        : netPosition < 0
        ? "medium"
        : "low";

    return {
      receivableOutstanding: Math.round(receivableOutstanding),
      payableOutstanding: Math.round(payableOutstanding),
      retentionHeldByUs: Math.round(retentionHeldByUs),
      netPosition: Math.round(netPosition),
      liquidityRisk,
    };
  }

  /**
   * Реальний список несплачених і сплачених рахунків проекту.
   */
  async trackPayments(projectId: string): Promise<{
    pendingPayments: Array<{
      id: string;
      counterparty: string;
      amount: number;
      dueDate: string | null;
      status: string;
    }>;
    receivedPayments: Array<{
      id: string;
      counterparty: string;
      amount: number;
      paidDate: string | null;
    }>;
  }> {
    const db = this.db();
    const [{ data: pending, error: pErr }, { data: received, error: rErr }] = await Promise.all([
      db
        .from("invoices")
        .select("id, counterparty, gross_amount, due_date, status")
        .eq("project_id", projectId)
        .in("status", ["unpaid", "partially_paid", "overdue"])
        .order("due_date", { ascending: true }),
      db
        .from("invoices")
        .select("id, counterparty, gross_amount, paid_date")
        .eq("project_id", projectId)
        .eq("status", "paid")
        .order("paid_date", { ascending: false })
        .limit(20),
    ]);
    if (pErr) throw pErr;
    if (rErr) throw rErr;

    return {
      pendingPayments: (pending ?? []).map((i) => ({
        id: i.id,
        counterparty: i.counterparty,
        amount: Number(i.gross_amount ?? 0),
        dueDate: i.due_date,
        status: i.status,
      })),
      receivedPayments: (received ?? []).map((i) => ({
        id: i.id,
        counterparty: i.counterparty,
        amount: Number(i.gross_amount ?? 0),
        paidDate: i.paid_date,
      })),
    };
  }

  /**
   * Оцінює конкретні, перевірювані ризики грошового потоку на основі
   * реальних прострочених рахунків та утримань, що мали б уже звільнитись.
   */
  async assessRisks(projectId: string): Promise<{
    risks: Array<{
      type: string;
      severity: "low" | "medium" | "high";
      detail: string;
    }>;
    overallRisk: "low" | "medium" | "high";
  }> {
    const db = this.db();
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: overdue, error: oErr }, { data: overdueRetention, error: rErr }] = await Promise.all([
      db
        .from("invoices")
        .select("id, gross_amount, due_date")
        .eq("project_id", projectId)
        .eq("status", "overdue"),
      db
        .from("retention_payments")
        .select("id, retention_amount, release_date")
        .eq("project_id", projectId)
        .is("released_at", null)
        .lt("release_date", today),
    ]);
    if (oErr) throw oErr;
    if (rErr) throw rErr;

    const risks: Array<{ type: string; severity: "low" | "medium" | "high"; detail: string }> = [];

    const overdueTotal = (overdue ?? []).reduce((s, i) => s + Number(i.gross_amount ?? 0), 0);
    if ((overdue ?? []).length > 0) {
      risks.push({
        type: "overdue_invoices",
        severity: overdueTotal > 50000 ? "high" : "medium",
        detail: `${(overdue ?? []).length} прострочених рахунків на суму ${Math.round(overdueTotal)} PLN`,
      });
    }

    const overdueRetentionTotal = (overdueRetention ?? []).reduce(
      (s, r) => s + Number(r.retention_amount ?? 0),
      0
    );
    if ((overdueRetention ?? []).length > 0) {
      risks.push({
        type: "overdue_retention_release",
        severity: "medium",
        detail: `${(overdueRetention ?? []).length} утримань на суму ${Math.round(overdueRetentionTotal)} PLN пропустили планову дату звільнення`,
      });
    }

    const overallRisk: "low" | "medium" | "high" = risks.some((r) => r.severity === "high")
      ? "high"
      : risks.length > 0
      ? "medium"
      : "low";

    return { risks, overallRisk };
  }

  /**
   * Генерує рекомендації щодо оптимізації грошового потоку реальним
   * викликом Claude на основі щойно зібраних реальних даних проекту
   * (не захардкоджений список).
   */
  async optimizeCashFlow(projectId: string): Promise<{
    summary: string;
    recommendations: string[];
  }> {
    const [liquidity, risks] = await Promise.all([
      this.analyzeLiquidity(projectId),
      this.assessRisks(projectId),
    ]);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        summary: "AI-аналіз недоступний: ANTHROPIC_API_KEY не налаштований.",
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
          content: `Jesteś doradcą finansowym dla generalnego wykonawcy budowlanego w Polsce. Na podstawie tych realnych danych projektu zaproponuj 3-5 konkretnych, krótkich rekomendacji poprawy płynności finansowej (po polsku):

Należności nieopłacone (klienci winni nam): ${liquidity.receivableOutstanding} PLN
Zobowiązania nieopłacone (my winniśmy dostawcom): ${liquidity.payableOutstanding} PLN
Kaucje gwarancyjne zatrzymane: ${liquidity.retentionHeldByUs} PLN
Pozycja netto: ${liquidity.netPosition} PLN
Ryzyko płynności: ${liquidity.liquidityRisk}
Zidentyfikowane ryzyka: ${risks.risks.map((r) => r.detail).join("; ") || "brak"}

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

    return {
      summary: summary ?? "",
      recommendations,
    };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const cashFlowAnalyzerAgent = new CashFlowAnalyzerAgent();
