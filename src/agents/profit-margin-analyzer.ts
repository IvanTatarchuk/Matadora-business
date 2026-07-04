import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Profit Margin Analyzer Agent - Агент для аналізу маржі прибутку
 * Аналізує маржу прибутку та рекомендує стратегії для її покращення
 */
export class ProfitMarginAnalyzerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "profit-margin-analyzer",
      name: "Profit Margin Analyzer Agent",
      description: "Аналізує маржу прибутку проектів, виявляє можливості для покращення",
      category: "financial",
      capabilities: [
        "margin_calculation",
        "cost_analysis",
        "pricing_optimization",
        "profitability_forecasting",
        "benchmarking",
        "recommendation",
      ],
      dependencies: [],
      priority: 3,
    };
  }

  /**
   * Розраховує маржу
   */
  async calculateMargin(project: {
    revenue: number;
    costs: {
      materials: number;
      labor: number;
      overhead: number;
      other: number;
    };
  }): Promise<{
    totalCosts: number;
    grossProfit: number;
    grossMargin: number; // у процентах
    netProfit: number;
    netMargin: number; // у процентах
  }> {
    const totalCosts = project.costs.materials + project.costs.labor + project.costs.overhead + project.costs.other;
    const grossProfit = project.revenue - (project.costs.materials + project.costs.labor);
    const grossMargin = (grossProfit / project.revenue) * 100;
    const netProfit = project.revenue - totalCosts;
    const netMargin = (netProfit / project.revenue) * 100;

    return {
      totalCosts,
      grossProfit,
      grossMargin: Math.round(grossMargin * 100) / 100,
      netProfit,
      netMargin: Math.round(netMargin * 100) / 100,
    };
  }

  /**
   * Аналізує витрати
   */
  async analyzeCosts(projectId: string): Promise<{
    costBreakdown: Array<{
      category: string;
      amount: number;
      percentage: number;
      trend: "increasing" | "decreasing" | "stable";
    }>;
    costDrivers: Array<{ category: string; impact: "high" | "medium" | "low" }>;
    optimizationOpportunities: Array<{ category: string; potentialSavings: number }>;
  }> {
    const costBreakdown = [
      { category: "Materials", amount: 45000, percentage: 45, trend: "increasing" as const },
      { category: "Labor", amount: 35000, percentage: 35, trend: "stable" as const },
      { category: "Overhead", amount: 15000, percentage: 15, trend: "decreasing" as const },
      { category: "Other", amount: 5000, percentage: 5, trend: "stable" as const },
    ];

    const costDrivers = [
      { category: "Materials", impact: "high" as const },
      { category: "Labor", impact: "high" as const },
      { category: "Overhead", impact: "medium" as const },
    ];

    const optimizationOpportunities = [
      { category: "Materials", potentialSavings: 5000 },
      { category: "Labor", potentialSavings: 3000 },
    ];

    return { costBreakdown, costDrivers, optimizationOpportunities };
  }

  /**
   * Оптимізує ціноутворення
   */
  async optimizePricing(project: {
    currentPrice: number;
    costs: number;
    targetMargin: number;
  }): Promise<{
    recommendedPrice: number;
    currentMargin: number;
    priceAdjustment: number;
    impactOnVolume: "positive" | "negative" | "neutral";
  }> {
    const currentMargin = ((project.currentPrice - project.costs) / project.currentPrice) * 100;
    const recommendedPrice = project.costs / (1 - project.targetMargin / 100);
    const priceAdjustment = recommendedPrice - project.currentPrice;
    const impactOnVolume = priceAdjustment > 0 ? "negative" as const : priceAdjustment < 0 ? "positive" as const : "neutral" as const;

    return {
      recommendedPrice: Math.round(recommendedPrice),
      currentMargin: Math.round(currentMargin * 100) / 100,
      priceAdjustment: Math.round(priceAdjustment),
      impactOnVolume,
    };
  }

  /**
   * Прогнозує прибутковість
   */
  async forecastProfitability(projectId: string, months: number): Promise<{
    monthlyForecast: Array<{
      month: number;
      revenue: number;
      costs: number;
      profit: number;
      margin: number;
    }>;
    averageMargin: number;
    trend: "improving" | "declining" | "stable";
  }> {
    const monthlyForecast = Array.from({ length: months }, (_, i) => {
      const revenue = 50000 + Math.random() * 10000;
      const costs = 40000 + Math.random() * 8000;
      const profit = revenue - costs;
      const margin = (profit / revenue) * 100;

      return {
        month: i + 1,
        revenue: Math.round(revenue),
        costs: Math.round(costs),
        profit: Math.round(profit),
        margin: Math.round(margin * 100) / 100,
      };
    });

    const averageMargin = monthlyForecast.length > 0 
      ? monthlyForecast.reduce((sum, m) => sum + m.margin, 0) / months 
      : 0;
    const lastMargin = monthlyForecast[months - 1]?.margin;
    const firstMargin = monthlyForecast[0]?.margin;
    const trend = monthlyForecast.length > 1 && lastMargin !== undefined && firstMargin !== undefined
      ? lastMargin > firstMargin ? "improving" as const : "declining" as const
      : "stable" as const;

    return {
      monthlyForecast,
      averageMargin: Math.round(averageMargin * 100) / 100,
      trend,
    };
  }

  /**
   * Порівнює з ринком
   */
  async benchmark(projectId: string, industry: string): Promise<{
    projectMargin: number;
    industryAverage: number;
    topQuartile: number;
    bottomQuartile: number;
    percentile: number;
  }> {
    const projectMargin = 18.5;
    const industryAverage = 15.0;
    const topQuartile = 22.0;
    const bottomQuartile = 10.0;
    const percentile = ((projectMargin - bottomQuartile) / (topQuartile - bottomQuartile)) * 100;

    return {
      projectMargin,
      industryAverage,
      topQuartile,
      bottomQuartile,
      percentile: Math.round(percentile),
    };
  }

  /**
   * Дає рекомендації
   */
  async provideRecommendations(projectId: string): Promise<{
    recommendations: Array<{
      action: string;
      priority: "high" | "medium" | "low";
      estimatedImpact: number; // у процентах маржі
      implementationCost: number;
      timeline: number; // в днях
    }>;
  }> {
    const recommendations = [
      {
        action: "Negotiate better material prices",
        priority: "high" as const,
        estimatedImpact: 3.5,
        implementationCost: 500,
        timeline: 14,
      },
      {
        action: "Optimize labor scheduling",
        priority: "medium" as const,
        estimatedImpact: 2.0,
        implementationCost: 1000,
        timeline: 7,
      },
      {
        action: "Reduce overhead costs",
        priority: "medium" as const,
        estimatedImpact: 1.5,
        implementationCost: 200,
        timeline: 30,
      },
    ];

    return { recommendations };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const profitMarginAnalyzerAgent = new ProfitMarginAnalyzerAgent();
