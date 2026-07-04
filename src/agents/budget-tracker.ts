import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Budget Tracker Agent - Агент для відстеження бюджету
 * Відстежує витрати та порівнює з бюджетом проекту
 */
export class BudgetTrackerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "budget-tracker",
      name: "Budget Tracker Agent",
      description: "Відстежує витрати проекту, порівнює з бюджетом та виявляє перевитрати",
      category: "financial",
      capabilities: [
        "expense_tracking",
        "budget_comparison",
        "variance_analysis",
        "forecasting",
        "alert_generation",
        "reporting",
      ],
      dependencies: [],
      priority: 7,
    };
  }

  /**
   * Відстежує витрати
   */
  async trackExpenses(projectId: string, period: {
    start: Date;
    end: Date;
  }): Promise<{
    totalSpent: number;
    byCategory: Record<string, number>;
    transactions: Array<{
      id: string;
      date: Date;
      category: string;
      amount: number;
      description: string;
    }>;
  }> {
    const byCategory = {
      materials: 45000,
      labor: 35000,
      equipment: 15000,
      subcontractors: 25000,
      overhead: 10000,
    };

    const totalSpent = Object.values(byCategory).reduce((sum, val) => sum + val, 0);

    const transactions = [
      {
        id: "tx-1",
        date: new Date(),
        category: "materials",
        amount: 5000,
        description: "Concrete delivery",
      },
      {
        id: "tx-2",
        date: new Date(Date.now() - 86400000),
        category: "labor",
        amount: 3000,
        description: "Weekly payroll",
      },
    ];

    return { totalSpent, byCategory, transactions };
  }

  /**
   * Порівнює з бюджетом
   */
  async compareBudget(projectId: string): Promise<{
    budget: number;
    spent: number;
    remaining: number;
    variance: number; // у процентах
    overBudget: boolean;
  }> {
    const budget = 200000;
    const spent = 130000;
    const remaining = budget - spent;
    const variance = (spent / budget) * 100;
    const overBudget = spent > budget;

    return { budget, spent, remaining, variance: Math.round(variance), overBudget };
  }

  /**
   * Аналізує відхилення
   */
  async analyzeVariance(projectId: string): Promise<{
    categories: Array<{
      category: string;
      budgeted: number;
      actual: number;
      variance: number;
      variancePercent: number;
    }>;
    totalVariance: number;
    explanation: string;
  }> {
    const categories = [
      {
        category: "materials",
        budgeted: 80000,
        actual: 45000,
        variance: -35000,
        variancePercent: -43.75,
      },
      {
        category: "labor",
        budgeted: 60000,
        actual: 35000,
        variance: -25000,
        variancePercent: -41.67,
      },
    ];

    const totalVariance = categories.reduce((sum, c) => sum + c.variance, 0);
    const explanation = totalVariance < 0 
      ? "Project is under budget - good cost control"
      : "Project is over budget - review spending";

    return { categories, totalVariance, explanation };
  }

  /**
   * Прогнозує витрати
   */
  async forecastSpending(projectId: string, remainingMonths: number): Promise<{
    projectedTotal: number;
    monthlyAverage: number;
    riskOfOverrun: "low" | "medium" | "high";
    recommendations: string[];
  }> {
    const projectedTotal = 180000;
    const monthlyAverage = projectedTotal / remainingMonths;
    const riskOfOverrun = "low" as const;
    const recommendations = [
      "Continue current spending pace",
      "Monitor material costs closely",
      "Review subcontractor invoices",
    ];

    return { projectedTotal, monthlyAverage: Math.round(monthlyAverage), riskOfOverrun, recommendations };
  }

  /**
   * Генерує сповіщення
   */
  async generateAlerts(projectId: string): Promise<{
    alerts: Array<{
      type: "info" | "warning" | "critical";
      category: string;
      message: string;
      threshold: number;
      current: number;
    }>;
  }> {
    const alerts = [
      {
        type: "warning" as const,
        category: "materials",
        message: "Material spending approaching budget limit",
        threshold: 80000,
        current: 45000,
      },
    ];

    return { alerts };
  }

  /**
   * Генерує звіт
   */
  async generateReport(projectId: string): Promise<{
    reportId: string;
    summary: string;
    budgetStatus: "on_track" | "at_risk" | "over_budget";
    keyMetrics: {
      budgetUtilization: number;
      monthlyBurnRate: number;
      projectedCompletion: number;
    };
    generatedAt: Date;
  }> {
    return {
      reportId: `report-${Date.now()}`,
      summary: "Project is on track with budget",
      budgetStatus: "on_track" as const,
      keyMetrics: {
        budgetUtilization: 65,
        monthlyBurnRate: 25000,
        projectedCompletion: 180000,
      },
      generatedAt: new Date(),
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
export const budgetTrackerAgent = new BudgetTrackerAgent();
