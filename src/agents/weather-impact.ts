import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Weather Impact Agent - Агент для аналізу впливу погоди
 * Аналізує вплив погодних умов на будівельні роботи
 */
export class WeatherImpactAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "weather-impact",
      name: "Weather Impact Agent",
      description: "Аналізує вплив погодних умов на будівельні роботи та прогнозує затримки",
      category: "analysis",
      capabilities: [
        "weather_forecasting",
        "impact_assessment",
        "delay_prediction",
        "mitigation_planning",
        "seasonal_analysis",
        "alert_generation",
      ],
      dependencies: [],
      priority: 10,
    };
  }

  /**
   * Отримує прогноз погоди
   */
  async getForecast(location: string, days: number): Promise<{
    daily: Array<{
      date: Date;
      condition: string;
      temperature: { min: number; max: number };
      precipitation: number; // в мм
      windSpeed: number; // в км/год
      suitableForWork: boolean;
    }>;
  }> {
    const daily = Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
      condition: Math.random() > 0.7 ? "rainy" : "sunny",
      temperature: { min: 15 + Math.random() * 10, max: 25 + Math.random() * 10 },
      precipitation: Math.random() > 0.7 ? Math.random() * 20 : 0,
      windSpeed: Math.random() * 30,
      suitableForWork: Math.random() > 0.3,
    }));

    return { daily };
  }

  /**
   * Оцінює вплив погоди
   */
  async assessImpact(forecast: Array<{
    date: Date;
    precipitation: number;
    windSpeed: number;
    suitableForWork: boolean;
  }>): Promise<{
    lostDays: number;
    affectedTasks: string[];
    riskLevel: "low" | "medium" | "high";
    recommendations: string[];
  }> {
    const lostDays = forecast.filter(d => !d.suitableForWork).length;
    const affectedTasks = lostDays > 0 ? ["Excavation", "Concrete pouring", "Roofing"] : [];
    const riskLevel = lostDays > 3 ? "high" as const : lostDays > 1 ? "medium" as const : "low" as const;
    const recommendations = lostDays > 0
      ? ["Schedule indoor work during bad weather", "Add buffer time to timeline", "Protect materials from rain"]
      : ["Continue as planned"];

    return { lostDays, affectedTasks, riskLevel, recommendations };
  }

  /**
   * Прогнозує затримки
   */
  async predictDelays(projectId: string, weeks: number): Promise<{
    predictedDelays: number; // в днях
    confidence: number; // 0-100
    highRiskPeriods: Array<{ start: Date; end: Date; reason: string }>;
  }> {
    const predictedDelays = Math.floor(Math.random() * 5) + 2;
    const confidence = 75 + Math.random() * 15;
    const highRiskPeriods = [
      {
        start: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        end: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        reason: "Rainy season expected",
      },
    ];

    return {
      predictedDelays,
      confidence: Math.round(confidence),
      highRiskPeriods,
    };
  }

  /**
   * Розробляє план мінімізації
   */
  async createMitigationPlan(weatherRisk: {
    type: string;
    severity: "low" | "medium" | "high";
  }): Promise<{
    strategies: Array<{
      strategy: string;
      cost: number;
      effectiveness: number; // 0-100
    }>;
    recommendedActions: string[];
  }> {
    const strategies = [
      {
        strategy: "Install temporary shelter",
        cost: 5000,
        effectiveness: 85,
      },
      {
        strategy: "Reschedule outdoor work",
        cost: 2000,
        effectiveness: 70,
      },
      {
        strategy: "Use weather-resistant materials",
        cost: 3000,
        effectiveness: 75,
      },
    ];

    const recommendedActions = [
      "Monitor weather forecasts daily",
      "Prepare contingency plans",
      "Communicate with stakeholders about potential delays",
    ];

    return { strategies, recommendedActions };
  }

  /**
   * Аналізує сезонні тенденції
   */
  async analyzeSeasonalTrends(location: string): Promise<{
    bestMonths: string[];
    worstMonths: string[];
    averageWorkableDaysPerMonth: number;
    recommendations: string[];
  }> {
    const bestMonths = ["May", "June", "September", "October"];
    const worstMonths = ["December", "January", "February"];
    const averageWorkableDaysPerMonth = 22;
    const recommendations = [
      "Schedule major outdoor work during best months",
      "Plan indoor activities for winter months",
      "Add weather contingency to timeline",
    ];

    return { bestMonths, worstMonths, averageWorkableDaysPerMonth, recommendations };
  }

  /**
   * Генерує сповіщення
   */
  async generateAlerts(forecast: Array<{
    date: Date;
    condition: string;
    precipitation: number;
    windSpeed: number;
  }>): Promise<{
    alerts: Array<{
      type: "info" | "warning" | "critical";
      date: Date;
      message: string;
      recommendedAction: string;
    }>;
  }> {
    const alerts = forecast.filter(f => f.precipitation > 10 || f.windSpeed > 25).map(f => ({
      type: f.precipitation > 20 ? "critical" as const : "warning" as const,
      date: f.date,
      message: `${f.condition} expected with ${f.precipitation}mm precipitation and ${f.windSpeed}km/h wind`,
      recommendedAction: "Reschedule outdoor work and secure site",
    }));

    return { alerts };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const weatherImpactAgent = new WeatherImpactAgent();
