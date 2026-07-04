import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Risk Analyzer Agent - Агент для аналізу ризиків
 * Виявляє та аналізує потенційні ризики проекту
 */
export class RiskAnalyzerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "risk-analyzer",
      name: "Risk Analyzer Agent",
      description: "Виявляє та аналізує потенційні ризики проекту, надає плани мінімізації",
      category: "analysis",
      capabilities: [
        "risk_identification",
        "mitigation_planning",
        "probability_assessment",
        "impact_analysis",
        "risk_monitoring",
        "contingency_planning",
      ],
      dependencies: [],
      priority: 80,
    };
  }

  /**
   * Виявляє ризики проекту
   */
  async identifyRisks(projectData: {
    type: string;
    location: string;
    duration: number;
    budget: number;
    complexity: "low" | "medium" | "high";
  }): Promise<Array<{
    id: string;
    category: string;
    description: string;
    probability: number; // 0-1
    impact: number; // 0-1
    riskScore: number; // probability * impact
  }>> {
    const risks: Array<{
      id: string;
      category: string;
      description: string;
      probability: number;
      impact: number;
      riskScore: number;
    }> = [];

    // Фінансові ризики
    if (projectData.budget > 1000000) {
      risks.push({
        id: "risk-1",
        category: "financial",
        description: "Перевищення бюджету через непередбачені витрати",
        probability: 0.6,
        impact: 0.8,
        riskScore: 0.48,
      });
    }

    // Ризики графіку
    if (projectData.duration > 180) {
      risks.push({
        id: "risk-2",
        category: "schedule",
        description: "Затримка через погодні умови",
        probability: 0.7,
        impact: 0.6,
        riskScore: 0.42,
      });
    }

    // Технічні ризики
    if (projectData.complexity === "high") {
      risks.push({
        id: "risk-3",
        category: "technical",
        description: "Технічні проблеми з конструкцією",
        probability: 0.4,
        impact: 0.9,
        riskScore: 0.36,
      });
    }

    // Ризики постачальників
    risks.push({
      id: "risk-4",
      category: "supply",
      description: "Затримка постачання матеріалів",
      probability: 0.5,
      impact: 0.5,
      riskScore: 0.25,
    });

    // Ризики персоналу
    risks.push({
      id: "risk-5",
      category: "personnel",
      description: "Дефіцит кваліфікованої робочої сили",
      probability: 0.4,
      impact: 0.6,
      riskScore: 0.24,
    });

    // Сортування за оцінкою ризику
    return risks.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Розробляє план мінімізації ризиків
   */
  async createMitigationPlan(risks: Array<{
    id: string;
    category: string;
    description: string;
    probability: number;
    impact: number;
    riskScore: number;
  }>): Promise<{
    highPriority: Array<{ riskId: string; actions: string[] }>;
    mediumPriority: Array<{ riskId: string; actions: string[] }>;
    lowPriority: Array<{ riskId: string; actions: string[] }>;
  }> {
    const highPriority: Array<{ riskId: string; actions: string[] }> = [];
    const mediumPriority: Array<{ riskId: string; actions: string[] }> = [];
    const lowPriority: Array<{ riskId: string; actions: string[] }> = [];

    for (const risk of risks) {
      const actions = this.getMitigationActions(risk.category);

      if (risk.riskScore > 0.4) {
        highPriority.push({ riskId: risk.id, actions });
      } else if (risk.riskScore > 0.2) {
        mediumPriority.push({ riskId: risk.id, actions });
      } else {
        lowPriority.push({ riskId: risk.id, actions });
      }
    }

    return { highPriority, mediumPriority, lowPriority };
  }

  /**
   * Отримує дії для мінімізації ризиків за категорією
   */
  private getMitigationActions(category: string): string[] {
    const actions: Record<string, string[]> = {
      financial: [
        "Створити резервний бюджет (10-15%)",
        "Регулярний моніторинг витрат",
        "Закупівля за фіксованими цінами",
      ],
      schedule: [
        "Додати буферний час в графік",
        "Моніторинг погоди",
        "План Б для критичних етапів",
      ],
      technical: [
        "Додатковий технічний аудит",
        "Залучення експертів",
        "Пілотне тестування",
      ],
      supply: [
        "Диверсифікація постачальників",
        "Створення запасу критичних матеріалів",
        "Довгострокові контракти",
      ],
      personnel: [
        "Попереднє наймання",
        "Тренінг персоналу",
        "Резервні бригади",
      ],
    };

    return actions[category] || ["Моніторинг ситуації", "Регулярний перегляд"];
  }

  /**
   * Аналізує вплив ризиків
   */
  async analyzeImpact(risks: Array<{
    id: string;
    riskScore: number;
    impact: number;
  }>): Promise<{
    totalRiskScore: number;
    potentialDelay: number; // в днях
    potentialCostOverrun: number; // в процентах
    qualityImpact: "low" | "medium" | "high";
  }> {
    const totalRiskScore = risks.reduce((sum, r) => sum + r.riskScore, 0);
    const avgImpact = risks.reduce((sum, r) => sum + r.impact, 0) / risks.length;

    const potentialDelay = Math.round(totalRiskScore * 30); // до 30 днів
    const potentialCostOverrun = Math.round(totalRiskScore * 20); // до 20%

    let qualityImpact: "low" | "medium" | "high" = "low";
    if (avgImpact > 0.7) qualityImpact = "high";
    else if (avgImpact > 0.4) qualityImpact = "medium";

    return {
      totalRiskScore,
      potentialDelay,
      potentialCostOverrun,
      qualityImpact,
    };
  }

  /**
   * Моніторить ризики в реальному часі
   */
  async monitorRisks(projectId: string): Promise<{
    activeRisks: Array<{
      id: string;
      status: "active" | "mitigated" | "resolved";
      lastUpdated: Date;
    }>;
    newRisks: Array<{
      id: string;
      description: string;
      detectedAt: Date;
    }>;
  }> {
    // Симуляція моніторингу
    const activeRisks: Array<{
      id: string;
      status: "active" | "mitigated" | "resolved";
      lastUpdated: Date;
    }> = [
      {
        id: "risk-1",
        status: "active" as const,
        lastUpdated: new Date(),
      },
      {
        id: "risk-2",
        status: "mitigated" as const,
        lastUpdated: new Date(Date.now() - 86400000),
      },
    ];

    const newRisks: Array<{
      id: string;
      description: string;
      detectedAt: Date;
    }> = [];

    return { activeRisks, newRisks };
  }

  /**
   * Створює contingency plan
   */
  async createContingencyPlan(risks: Array<{
    id: string;
    category: string;
  }>): Promise<{
    triggers: Array<{ riskId: string; condition: string }>;
    responses: Array<{ riskId: string; action: string; responsible: string }>;
    resources: Array<{ type: string; amount: number }>;
  }> {
    const triggers = risks.map(risk => ({
      riskId: risk.id,
      condition: `Ризик ${risk.category} перевищує порогове значення`,
    }));

    const responses = risks.map(risk => ({
      riskId: risk.id,
      action: "Активувати contingency план",
      responsible: "Project Manager",
    }));

    const resources = [
      { type: "budget_reserve", amount: 0.15 }, // 15% резерв бюджету
      { type: "time_buffer", amount: 0.1 }, // 10% буфер часу
    ];

    return { triggers, responses, resources };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const riskAnalyzerAgent = new RiskAnalyzerAgent();
