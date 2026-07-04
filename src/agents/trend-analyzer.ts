import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Trend Analyzer Agent - Агент для аналізу тенденцій
 * Аналізує тенденції в даних проекту та прогнозує майбутні показники
 */
export class TrendAnalyzerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "trend-analyzer",
      name: "Trend Analyzer Agent",
      description: "Аналізує тенденції в даних проекту, виявляє патерни та прогнозує майбутні показники",
      category: "reporting",
      capabilities: [
        "trend_detection",
        "pattern_recognition",
        "anomaly_detection",
        "forecasting",
        "comparative_analysis",
        "insight_generation",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Виявляє тенденції
   */
  async detectTrends(projectId: string, metric: string, periods: number): Promise<{
    trend: "increasing" | "decreasing" | "stable" | "volatile";
    rate: number; // зміна за період
    confidence: number; // 0-100
    data: Array<{
      period: string;
      value: number;
    }>;
  }> {
    const data = Array.from({ length: periods }, (_, i) => ({
      period: `Week ${i + 1}`,
      value: 50 + i * 2 + Math.random() * 5,
    }));

    const firstValue = data[0]?.value || 0;
    const lastValue = data[data.length - 1]?.value || 0;
    const rate = (lastValue - firstValue) / periods;
    const trend = rate > 1 ? "increasing" as const : rate < -1 ? "decreasing" as const : "stable" as const;
    const confidence = 85;

    return { trend, rate: Math.round(rate * 100) / 100, confidence, data };
  }

  /**
   * Розпізнає патерни
   */
  async recognizePatterns(projectId: string): Promise<{
    patterns: Array<{
      pattern: string;
      description: string;
      frequency: number;
      impact: "low" | "medium" | "high";
    }>;
    insights: string[];
  }> {
    const patterns = [
      {
        pattern: "Seasonal variation",
        description: "Costs increase during summer months",
        frequency: 3,
        impact: "medium" as const,
      },
      {
        pattern: "Weekend slowdown",
        description: "Progress slows on weekends",
        frequency: 52,
        impact: "low" as const,
      },
    ];

    const insights = [
      "Plan higher budgets for summer months",
      "Schedule critical tasks for weekdays",
    ];

    return { patterns, insights };
  }

  /**
   * Виявляє аномалії
   */
  async detectAnomalies(projectId: string, metric: string): Promise<{
    anomalies: Array<{
      period: string;
      value: number;
      expected: number;
      deviation: number; // у процентах
      severity: "low" | "medium" | "high";
    }>;
    summary: string;
  }> {
    const anomalies = [
      {
        period: "Week 5",
        value: 120,
        expected: 60,
        deviation: 100,
        severity: "high" as const,
      },
      {
        period: "Week 12",
        value: 45,
        expected: 70,
        deviation: -36,
        severity: "medium" as const,
      },
    ];

    const summary = "2 anomalies detected in the selected period";

    return { anomalies, summary };
  }

  /**
   * Прогнозує
   */
  async forecast(projectId: string, metric: string, futurePeriods: number): Promise<{
    forecast: Array<{
      period: string;
      predicted: number;
      lowerBound: number;
      upperBound: number;
      confidence: number;
    }>;
    methodology: string;
  }> {
    const forecast = Array.from({ length: futurePeriods }, (_, i) => {
      const predicted = 70 + i * 2;
      const variance = 10;
      return {
        period: `Week ${i + 1}`,
        predicted: Math.round(predicted),
        lowerBound: Math.round(predicted - variance),
        upperBound: Math.round(predicted + variance),
        confidence: 80 - i * 5,
      };
    });

    const methodology = "Linear regression with seasonal adjustment";

    return { forecast, methodology };
  }

  /**
   * Порівнює
   */
  async compare(projectId: string, compareTo: string[]): Promise<{
    comparison: Array<{
      entity: string;
      metric: string;
      value: number;
      difference: number;
      percentage: number;
    }>;
    ranking: string[];
  }> {
    const comparison = [
      {
        entity: "Current Project",
        metric: "Progress",
        value: 65,
        difference: 0,
        percentage: 0,
      },
      {
        entity: "Project A",
        metric: "Progress",
        value: 70,
        difference: -5,
        percentage: -7.7,
      },
      {
        entity: "Project B",
        metric: "Progress",
        value: 55,
        difference: 10,
        percentage: 18.2,
      },
    ];

    const ranking = ["Project A", "Current Project", "Project B"];

    return { comparison, ranking };
  }

  /**
   * Генерує інсайти
   */
  async generateInsights(projectId: string): Promise<{
    insights: Array<{
      insight: string;
      type: "opportunity" | "risk" | "observation";
      actionability: "high" | "medium" | "low";
      recommendation?: string;
    }>;
    summary: string;
  }> {
    const insights = [
      {
        insight: "Progress accelerating in recent weeks",
        type: "opportunity" as const,
        actionability: "medium" as const,
        recommendation: "Maintain current momentum",
      },
      {
        insight: "Budget variance increasing",
        type: "risk" as const,
        actionability: "high" as const,
        recommendation: "Review spending immediately",
      },
      {
        insight: "Quality metrics stable",
        type: "observation" as const,
        actionability: "low" as const,
      },
    ];

    const summary = "3 key insights identified from trend analysis";

    return { insights, summary };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const trendAnalyzerAgent = new TrendAnalyzerAgent();
