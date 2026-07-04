import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * KPI Analyzer Agent - Агент для аналізу KPI
 * Аналізує ключові показники ефективності проекту та надає рекомендації
 */
export class KPIAnalyzerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "kpi-analyzer",
      name: "KPI Analyzer Agent",
      description: "Аналізує ключові показники ефективності, відстежує їх динаміку та надає рекомендації для покращення",
      category: "reporting",
      capabilities: [
        "kpi_tracking",
        "performance_analysis",
        "benchmarking",
        "trend_analysis",
        "alert_generation",
        "improvement_recommendations",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Відстежує KPI
   */
  async trackKPIs(projectId: string): Promise<{
    kpis: Array<{
      name: string;
      value: number;
      target: number;
      unit: string;
      status: "on_track" | "at_risk" | "off_track";
      variance: number;
    }>;
    overallScore: number; // 0-100
  }> {
    const kpis = [
      {
        name: "Schedule Adherence",
        value: 85,
        target: 90,
        unit: "%",
        status: "at_risk" as const,
        variance: -5,
      },
      {
        name: "Budget Utilization",
        value: 64,
        target: 65,
        unit: "%",
        status: "on_track" as const,
        variance: -1,
      },
      {
        name: "Quality Score",
        value: 88,
        target: 85,
        unit: "/100",
        status: "on_track" as const,
        variance: 3,
      },
      {
        name: "Safety Rating",
        value: 95,
        target: 95,
        unit: "/100",
        status: "on_track" as const,
        variance: 0,
      },
    ];

    const overallScore = kpis.reduce((sum, k) => sum + (k.value / k.target) * 100, 0) / kpis.length;

    return { kpis, overallScore: Math.round(overallScore) };
  }

  /**
   * Аналізує продуктивність
   */
  async analyzePerformance(projectId: string, period: {
    start: Date;
    end: Date;
  }): Promise<{
    performance: {
      efficiency: number; // 0-100
      productivity: number; // 0-100
      quality: number; // 0-100
      safety: number; // 0-100
    };
    comparison: {
      vsTarget: number; // у процентах
      vsPrevious: number; // у процентах
      vsIndustry: number; // у процентах
    };
    strengths: string[];
    weaknesses: string[];
  }> {
    const performance = {
      efficiency: 82,
      productivity: 85,
      quality: 88,
      safety: 95,
    };

    const comparison = {
      vsTarget: 95,
      vsPrevious: 105,
      vsIndustry: 110,
    };

    const strengths = [
      "Excellent safety performance",
      "Quality above industry average",
    ];

    const weaknesses = [
      "Schedule adherence below target",
      "Efficiency needs improvement",
    ];

    return { performance, comparison, strengths, weaknesses };
  }

  /**
   * Порівнює з еталонами
   */
  async benchmark(projectId: string, industry: string): Promise<{
    kpis: Array<{
      kpi: string;
      current: number;
      industryAverage: number;
      topQuartile: number;
      percentile: number;
    }>;
    overallPosition: "top_quartile" | "above_average" | "average" | "below_average";
  }> {
    const kpis = [
      {
        kpi: "Schedule Adherence",
        current: 85,
        industryAverage: 80,
        topQuartile: 90,
        percentile: 62,
      },
      {
        kpi: "Cost Efficiency",
        current: 95,
        industryAverage: 85,
        topQuartile: 95,
        percentile: 100,
      },
      {
        kpi: "Quality Score",
        current: 88,
        industryAverage: 82,
        topQuartile: 90,
        percentile: 75,
      },
    ];

    const overallPosition = "above_average" as const;

    return { kpis, overallPosition };
  }

  /**
   * Аналізує тенденції
   */
  async analyzeTrends(projectId: string, kpi: string, periods: number): Promise<{
    trend: "improving" | "stable" | "declining";
    data: Array<{
      period: string;
      value: number;
    }>;
    forecast: Array<{
      period: string;
      predicted: number;
      confidence: number;
    }>;
  }> {
    const data = Array.from({ length: periods }, (_, i) => ({
      period: `Week ${i + 1}`,
      value: 80 + Math.random() * 15,
    }));

    const trend = "improving" as const;
    const forecast = data.slice(-3).map(d => {
      const periodNum = parseInt(d.period.split(" ")[1] || "0");
      return {
        period: `Week ${periodNum + 1}`,
        predicted: d.value + 2,
        confidence: 75,
      };
    });

    return { trend, data, forecast };
  }

  /**
   * Генерує сповіщення
   */
  async generateAlerts(projectId: string): Promise<{
    alerts: Array<{
      kpi: string;
      status: "improving" | "stable" | "declining";
      severity: "info" | "warning" | "critical";
      message: string;
      recommendation: string;
    }>;
  }> {
    const alerts = [
      {
        kpi: "Schedule Adherence",
        status: "declining" as const,
        severity: "warning" as const,
        message: "Schedule adherence dropped below target",
        recommendation: "Review critical path and resource allocation",
      },
    ];

    return { alerts };
  }

  /**
   * Рекомендує покращення
   */
  async recommendImprovements(projectId: string): Promise<{
    recommendations: Array<{
      kpi: string;
      current: number;
      target: number;
      actions: string[];
      expectedImpact: number;
      timeline: number; // в днях
      priority: "high" | "medium" | "low";
    }>;
  }> {
    const recommendations = [
      {
        kpi: "Schedule Adherence",
        current: 85,
        target: 90,
        actions: [
          "Optimize resource allocation",
          "Address bottlenecks",
          "Improve coordination",
        ],
        expectedImpact: 5,
        timeline: 14,
        priority: "high" as const,
      },
      {
        kpi: "Efficiency",
        current: 82,
        target: 90,
        actions: [
          "Implement process improvements",
          "Provide training",
        ],
        expectedImpact: 8,
        timeline: 30,
        priority: "medium" as const,
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
export const kpiAnalyzerAgent = new KPIAnalyzerAgent();
