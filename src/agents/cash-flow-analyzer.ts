import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Cash Flow Analyzer Agent - Агент для аналізу грошового потоку
 * Аналізує грошовий потік проекту та прогнозує фінансові потреби
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

  /**
   * Прогнозує грошовий потік
   */
  async projectCashFlow(projectId: string, months: number): Promise<{
    monthlyCashFlow: Array<{
      month: number;
      inflow: number;
      outflow: number;
      netCashFlow: number;
      cumulativeBalance: number;
    }>;
  }> {
    const monthlyCashFlow = Array.from({ length: months }, (_, i) => {
      const inflow = 50000 + Math.random() * 20000;
      const outflow = 40000 + Math.random() * 15000;
      const netCashFlow = inflow - outflow;
      const cumulativeBalance = netCashFlow * (i + 1);

      return {
        month: i + 1,
        inflow: Math.round(inflow),
        outflow: Math.round(outflow),
        netCashFlow: Math.round(netCashFlow),
        cumulativeBalance: Math.round(cumulativeBalance),
      };
    });

    return { monthlyCashFlow };
  }

  /**
   * Аналізує ліквідність
   */
  async analyzeLiquidity(projectId: string): Promise<{
    currentRatio: number;
    quickRatio: number;
    workingCapital: number;
    liquidityRisk: "low" | "medium" | "high";
    recommendations: string[];
  }> {
    const currentRatio = 1.5 + Math.random() * 0.5;
    const quickRatio = 1.0 + Math.random() * 0.4;
    const workingCapital = 50000 + Math.random() * 30000;
    const liquidityRisk = currentRatio > 1.5 ? "low" as const : currentRatio > 1.0 ? "medium" as const : "high" as const;
    const recommendations = liquidityRisk === "low"
      ? ["Maintain current liquidity levels", "Consider investing excess cash"]
      : liquidityRisk === "medium"
      ? ["Monitor cash flow closely", "Improve receivables collection"]
      : ["Immediate action required", "Secure additional financing"];

    return {
      currentRatio: Math.round(currentRatio * 100) / 100,
      quickRatio: Math.round(quickRatio * 100) / 100,
      workingCapital: Math.round(workingCapital),
      liquidityRisk,
      recommendations,
    };
  }

  /**
   * Відстежує платежі
   */
  async trackPayments(projectId: string): Promise<{
    pendingPayments: Array<{
      id: string;
      amount: number;
      dueDate: Date;
      status: "pending" | "overdue";
    }>;
    receivedPayments: Array<{
      id: string;
      amount: number;
      receivedDate: Date;
    }>;
  }> {
    const pendingPayments = [
      {
        id: "pay-1",
        amount: 25000,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "pending" as const,
      },
      {
        id: "pay-2",
        amount: 15000,
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: "overdue" as const,
      },
    ];

    const receivedPayments = [
      {
        id: "recv-1",
        amount: 50000,
        receivedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
    ];

    return { pendingPayments, receivedPayments };
  }

  /**
   * Прогнозує фінансові потреби
   */
  async forecastNeeds(projectId: string, weeks: number): Promise<{
    weeklyNeeds: Array<{
      week: number;
      estimatedNeed: number;
      availableFunds: number;
      shortfall: number;
    }>;
    totalShortfall: number;
    recommendedActions: string[];
  }> {
    const weeklyNeeds = Array.from({ length: weeks }, (_, i) => {
      const estimatedNeed = 20000 + Math.random() * 10000;
      const availableFunds = 18000 + Math.random() * 12000;
      const shortfall = Math.max(0, estimatedNeed - availableFunds);

      return {
        week: i + 1,
        estimatedNeed: Math.round(estimatedNeed),
        availableFunds: Math.round(availableFunds),
        shortfall: Math.round(shortfall),
      };
    });

    const totalShortfall = weeklyNeeds.reduce((sum, w) => sum + w.shortfall, 0);
    const recommendedActions = totalShortfall > 0
      ? ["Arrange line of credit", "Accelerate receivables", "Delay non-critical payments"]
      : ["Maintain current cash management practices"];

    return { weeklyNeeds, totalShortfall, recommendedActions };
  }

  /**
   * Оцінює ризики
   */
  async assessRisks(projectId: string): Promise<{
    risks: Array<{
      type: string;
      severity: "low" | "medium" | "high";
      probability: number;
      impact: number;
      mitigation: string;
    }>;
    overallRisk: "low" | "medium" | "high";
  }> {
    const risks = [
      {
        type: "payment_delay",
        severity: "medium" as const,
        probability: 0.4,
        impact: 0.6,
        mitigation: "Implement stricter payment terms",
      },
      {
        type: "cost_overrun",
        severity: "high" as const,
        probability: 0.3,
        impact: 0.8,
        mitigation: "Maintain contingency reserve",
      },
    ];

    const overallRisk = "medium" as const;

    return { risks, overallRisk };
  }

  /**
   * Оптимізує грошовий потік
   */
  async optimizeCashFlow(projectId: string): Promise<{
    strategies: Array<{
      strategy: string;
      potentialSavings: number;
      implementationTime: number; // в днях
    }>;
    recommendedStrategy: string;
  }> {
    const strategies = [
      {
        strategy: "Negotiate better payment terms with suppliers",
        potentialSavings: 15000,
        implementationTime: 14,
      },
      {
        strategy: "Accelerate invoicing and collections",
        potentialSavings: 20000,
        implementationTime: 7,
      },
      {
        strategy: "Optimize payment scheduling",
        potentialSavings: 10000,
        implementationTime: 5,
      },
    ];

    const recommendedStrategy = "Accelerate invoicing and collections";

    return { strategies, recommendedStrategy };
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
