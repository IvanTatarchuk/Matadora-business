import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Forecasting Agent - Агент для прогнозування
 * Прогнозує майбутні показники проекту та допомагає в плануванні
 */
export class ForecastingAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "forecasting",
      name: "Forecasting Agent",
      description: "Прогнозує майбутні показники проекту, включаючи завершення, бюджет та ризики",
      category: "reporting",
      capabilities: [
        "completion_forecasting",
        "budget_forecasting",
        "risk_forecasting",
        "resource_forecasting",
        "scenario_analysis",
        "probability_assessment",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Прогнозує завершення
   */
  async forecastCompletion(projectId: string): Promise<{
    estimatedCompletion: Date;
    confidence: number; // 0-100
    scenarios: Array<{
      scenario: string;
      date: Date;
      probability: number;
    }>;
    factors: string[];
  }> {
    const estimatedCompletion = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);
    const confidence = 85;

    const scenarios = [
      {
        scenario: "Best case",
        date: new Date(Date.now() + 105 * 24 * 60 * 60 * 1000),
        probability: 20,
      },
      {
        scenario: "Most likely",
        date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
        probability: 60,
      },
      {
        scenario: "Worst case",
        date: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
        probability: 20,
      },
    ];

    const factors = [
      "Current progress rate",
      "Resource availability",
      "Weather conditions",
      "Supply chain stability",
    ];

    return { estimatedCompletion, confidence, scenarios, factors };
  }

  /**
   * Прогнозує бюджет
   */
  async forecastBudget(projectId: string): Promise<{
    projectedTotal: number;
    variance: number; // у процентах
    confidence: number;
    monthlyProjection: Array<{
      month: string;
      projected: number;
      actual: number | null;
    }>;
    riskFactors: string[];
  }> {
    const projectedTotal = 980000;
    const variance = -2;
    const confidence = 80;

    const monthlyProjection: Array<{
      month: string;
      projected: number;
      actual: number | null;
    }> = [
      { month: "Month 1", projected: 100000, actual: 95000 },
      { month: "Month 2", projected: 150000, actual: 145000 },
      { month: "Month 3", projected: 200000, actual: 210000 },
      { month: "Month 4", projected: 250000, actual: 240000 },
      { month: "Month 5", projected: 280000, actual: null },
    ];

    const riskFactors = [
      "Material price volatility",
      "Labor rate increases",
      "Scope changes",
    ];

    return { projectedTotal, variance, confidence, monthlyProjection, riskFactors };
  }

  /**
   * Прогнозує ризики
   */
  async forecastRisks(projectId: string): Promise<{
    risks: Array<{
      risk: string;
      probability: number; // 0-100
      impact: "low" | "medium" | "high";
      timeframe: string;
      mitigation: string;
    }>;
    overallRisk: "low" | "medium" | "high";
  }> {
    const risks = [
      {
        risk: "Weather delays",
        probability: 30,
        impact: "medium" as const,
        timeframe: "Next 3 months",
        mitigation: "Weather monitoring and contingency planning",
      },
      {
        risk: "Supply chain disruption",
        probability: 25,
        impact: "high" as const,
        timeframe: "Ongoing",
        mitigation: "Multiple suppliers identified",
      },
      {
        risk: "Labor shortage",
        probability: 20,
        impact: "medium" as const,
        timeframe: "Next 2 months",
        mitigation: "Recruitment and training programs",
      },
    ];

    const overallRisk = "medium" as const;

    return { risks, overallRisk };
  }

  /**
   * Прогнозує ресурси
   */
  async forecastResources(projectId: string, weeks: number): Promise<{
    resources: Array<{
      resource: string;
      current: number;
      projected: number;
      surplus: number;
      recommendation: string;
    }>;
    criticalShortages: string[];
  }> {
    const resources = [
      {
        resource: "Skilled labor",
        current: 25,
        projected: 30,
        surplus: -5,
        recommendation: "Hire 5 additional workers",
      },
      {
        resource: "Equipment",
        current: 10,
        projected: 8,
        surplus: 2,
        recommendation: "Consider renting out surplus equipment",
      },
      {
        resource: "Materials",
        current: 100,
        projected: 95,
        surplus: 5,
        recommendation: "Maintain current inventory levels",
      },
    ];

    const criticalShortages = ["Skilled labor"];

    return { resources, criticalShortages };
  }

  /**
   * Аналізує сценарії
   */
  async analyzeScenarios(projectId: string): Promise<{
    scenarios: Array<{
      name: string;
      description: string;
      probability: number;
      outcome: {
        completion: Date;
        cost: number;
        quality: number;
      };
    }>;
    recommended: string;
  }> {
    const scenarios = [
      {
        name: "Optimistic",
        description: "Everything goes according to plan",
        probability: 25,
        outcome: {
          completion: new Date(Date.now() + 105 * 24 * 60 * 60 * 1000),
          cost: 950000,
          quality: 95,
        },
      },
      {
        name: "Realistic",
        description: "Minor delays and cost overruns",
        probability: 50,
        outcome: {
          completion: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
          cost: 1000000,
          quality: 90,
        },
      },
      {
        name: "Pessimistic",
        description: "Significant delays and cost overruns",
        probability: 25,
        outcome: {
          completion: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
          cost: 1150000,
          quality: 85,
        },
      },
    ];

    const recommended = "Plan for realistic scenario with contingency for pessimistic";

    return { scenarios, recommended };
  }

  /**
   * Оцінює ймовірність
   */
  async assessProbability(projectId: string, event: string): Promise<{
    probability: number; // 0-100
    confidence: number;
    factors: Array<{
      factor: string;
      impact: number; // 0-100
      weight: number; // 0-1
    }>;
    sensitivity: string[];
  }> {
    const probability = 65;
    const confidence = 75;

    const factors = [
      { factor: "Historical data", impact: 70, weight: 0.4 },
      { factor: "Current conditions", impact: 60, weight: 0.3 },
      { factor: "Expert judgment", impact: 65, weight: 0.3 },
    ];

    const sensitivity = [
      "Weather conditions",
      "Resource availability",
      "Market conditions",
    ];

    return { probability, confidence, factors, sensitivity };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const forecastingAgent = new ForecastingAgent();
