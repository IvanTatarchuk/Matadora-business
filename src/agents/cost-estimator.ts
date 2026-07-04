import { AgentConfig, AgentStatus } from "@/lib/constants/subcontractors";

/**
 * Cost Estimator Agent - Агент для аналізу кошторисів
 * Аналізує вимоги проекту та надає оцінку витрат
 */
export class CostEstimatorAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "cost-estimator",
      name: "Cost Estimator Agent",
      description: "Аналізує вимоги проекту та надає оцінку витрат на матеріали, робочу силу та обладнання",
      category: "financial",
      capabilities: [
        "cost_analysis",
        "material_estimation",
        "labor_calculation",
        "equipment_costing",
        "budget_forecasting",
        "cost_optimization",
      ],
      dependencies: [],
      priority: 90,
    };
  }

  /**
   * Аналізує кошторис на основі специфікацій проекту
   */
  async analyzeCost(projectSpec: {
    area: number;
    type: string;
    location: string;
    quality: "standard" | "premium" | "luxury";
    materials?: string[];
  }): Promise<{
    materials: number;
    labor: number;
    equipment: number;
    overhead: number;
    total: number;
    breakdown: Record<string, number>;
  }> {
    // Базові коефіцієнти для розрахунку
    const qualityMultiplier = {
      standard: 1.0,
      premium: 1.5,
      luxury: 2.0,
    };

    const typeMultiplier: Record<string, number> = {
      residential: 1.0,
      commercial: 1.3,
      industrial: 1.5,
    };

    const multiplier = (qualityMultiplier[projectSpec.quality] || 1.0) * 
                       (typeMultiplier[projectSpec.type] || 1.0);

    // Розрахунок вартості (прикладна логіка)
    const baseCostPerSqM = 500; // Базова вартість за м²
    const materials = projectSpec.area * baseCostPerSqM * 0.4 * multiplier;
    const labor = projectSpec.area * baseCostPerSqM * 0.35 * multiplier;
    const equipment = projectSpec.area * baseCostPerSqM * 0.15 * multiplier;
    const overhead = projectSpec.area * baseCostPerSqM * 0.1 * multiplier;
    const total = materials + labor + equipment + overhead;

    return {
      materials,
      labor,
      equipment,
      overhead,
      total,
      breakdown: {
        materials,
        labor,
        equipment,
        overhead,
      },
    };
  }

  /**
   * Розраховує вартість матеріалів
   */
  async estimateMaterials(specs: {
    materials: Array<{ type: string; quantity: number; unit: string }>;
  }): Promise<{ total: number; items: Array<{ type: string; cost: number }> }> {
    // Ціни на матеріали (приклад)
    const materialPrices: Record<string, number> = {
      concrete: 120, // за м³
      steel: 3000, // за тонну
      wood: 800, // за м³
      brick: 0.5, // за штуку
      insulation: 25, // за м²
    };

    const items = specs.materials.map((item) => ({
      type: item.type,
      cost: (materialPrices[item.type] || 0) * item.quantity,
    }));

    const total = items.reduce((sum, item) => sum + item.cost, 0);

    return { total, items };
  }

  /**
   * Розраховує вартість робочої сили
   */
  async estimateLabor(specs: {
    workers: Array<{ type: string; hours: number; hourlyRate: number }>;
  }): Promise<{ total: number; breakdown: Array<{ type: string; cost: number }> }> {
    const breakdown = specs.workers.map((worker) => ({
      type: worker.type,
      cost: worker.hours * worker.hourlyRate,
    }));

    const total = breakdown.reduce((sum, item) => sum + item.cost, 0);

    return { total, breakdown };
  }

  /**
   * Оптимізує кошторис
   */
  async optimizeCost(currentCost: {
    materials: number;
    labor: number;
    equipment: number;
  }): Promise<{
    optimized: {
      materials: number;
      labor: number;
      equipment: number;
    };
    savings: number;
    suggestions: string[];
  }> {
    const suggestions: string[] = [];
    let materialSavings = 0;
    let laborSavings = 0;
    let equipmentSavings = 0;

    // Аналіз матеріалів
    if (currentCost.materials > 100000) {
      materialSavings = currentCost.materials * 0.1; // 10% економія
      suggestions.push("Розгляньте альтернативні матеріали для економії 10%");
    }

    // Аналіз робочої сили
    if (currentCost.labor > 50000) {
      laborSavings = currentCost.labor * 0.05; // 5% економія
      suggestions.push("Оптимізація графіку може зекономити 5% на робочій силі");
    }

    // Аналіз обладнання
    if (currentCost.equipment > 30000) {
      equipmentSavings = currentCost.equipment * 0.15; // 15% економія
      suggestions.push("Оренда обладнання замість покупки може зекономити 15%");
    }

    const totalSavings = materialSavings + laborSavings + equipmentSavings;

    return {
      optimized: {
        materials: currentCost.materials - materialSavings,
        labor: currentCost.labor - laborSavings,
        equipment: currentCost.equipment - equipmentSavings,
      },
      savings: totalSavings,
      suggestions,
    };
  }

  /**
   * Прогнозує бюджет
   */
  async forecastBudget(currentSpend: number, remainingWork: number): Promise<{
    projectedTotal: number;
    variance: number;
    risk: "low" | "medium" | "high";
  }> {
    const projectedTotal = currentSpend + remainingWork;
    const variance = projectedTotal - (currentSpend * 2); // Припускаємо, що бюджет був currentSpend * 2

    let risk: "low" | "medium" | "high" = "low";
    if (variance > 0.2 * projectedTotal) risk = "high";
    else if (variance > 0.1 * projectedTotal) risk = "medium";

    return {
      projectedTotal,
      variance,
      risk,
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
export const costEstimatorAgent = new CostEstimatorAgent();
