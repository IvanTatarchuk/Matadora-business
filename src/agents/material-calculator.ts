import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Material Calculator Agent - Агент для розрахунку матеріалів
 * Розраховує необхідну кількість матеріалів для будівельних проектів
 */
export class MaterialCalculatorAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "material-calculator",
      name: "Material Calculator Agent",
      description: "Розраховує необхідну кількість матеріалів на основі специфікацій проекту",
      category: "planning",
      capabilities: [
        "material_estimation",
        "quantity_calculation",
        "waste_factor",
        "cost_estimation",
        "alternative_materials",
        "inventory_check",
      ],
      dependencies: [],
      priority: 70,
    };
  }

  /**
   * Розраховує матеріали для фундаменту
   */
  async calculateFoundationMaterials(specs: {
    length: number;
    width: number;
    depth: number;
    type: "strip" | "pad" | "pile";
  }): Promise<{
    concrete: { volume: number; bags: number };
    reinforcement: { weight: number; bars: number };
    gravel: { volume: number };
    sand: { volume: number };
  }> {
    const volume = specs.length * specs.width * specs.depth;
    const wasteFactor = 1.1; // 10% відходів

    const concreteVolume = volume * wasteFactor;
    const concreteBags = Math.ceil(concreteVolume * 7); // 7 мішків на м³

    const reinforcementWeight = volume * 80; // 80 кг на м³
    const reinforcementBars = Math.ceil(reinforcementWeight / 20); // 20 кг на прут

    const gravelVolume = concreteVolume * 0.7;
    const sandVolume = concreteVolume * 0.3;

    return {
      concrete: { volume: concreteVolume, bags: concreteBags },
      reinforcement: { weight: reinforcementWeight, bars: reinforcementBars },
      gravel: { volume: gravelVolume },
      sand: { volume: sandVolume },
    };
  }

  /**
   * Розраховує матеріали для стін
   */
  async calculateWallMaterials(specs: {
    length: number;
    height: number;
    thickness: number;
    type: "brick" | "concrete" | "block";
  }): Promise<{
    bricks?: { count: number; mortar: number };
    concrete?: { volume: number };
    blocks?: { count: number; mortar: number };
    insulation?: { area: number };
  }> {
    const area = specs.length * specs.height;
    const volume = area * specs.thickness;
    const wasteFactor = 1.05;

    if (specs.type === "brick") {
      const bricksPerSqm = 50;
      const brickCount = Math.ceil(area * bricksPerSqm * wasteFactor);
      const mortarVolume = brickCount * 0.0003; // 0.0003 м³ на цеглину

      return {
        bricks: { count: brickCount, mortar: mortarVolume },
        insulation: { area },
      };
    } else if (specs.type === "concrete") {
      const concreteVolume = volume * wasteFactor;

      return {
        concrete: { volume: concreteVolume },
        insulation: { area },
      };
    } else {
      const blocksPerSqm = 12;
      const blockCount = Math.ceil(area * blocksPerSqm * wasteFactor);
      const mortarVolume = blockCount * 0.0005;

      return {
        blocks: { count: blockCount, mortar: mortarVolume },
        insulation: { area },
      };
    }
  }

  /**
   * Розраховує матеріали для даху
   */
  async calculateRoofMaterials(specs: {
    area: number;
    pitch: number;
    type: "shingle" | "metal" | "tile";
  }): Promise<{
    roofing: { area: number; units: number };
    underlayment: { area: number };
    flashing: { length: number };
  }> {
    const pitchFactor = 1 + specs.pitch / 10; // Коефіцієнт нахилу
    const actualArea = specs.area * pitchFactor;
    const wasteFactor = 1.1;

    let unitsPerSqm = 0;
    if (specs.type === "shingle") unitsPerSqm = 3;
    else if (specs.type === "metal") unitsPerSqm = 0.5;
    else unitsPerSqm = 10;

    const roofingUnits = Math.ceil(actualArea * unitsPerSqm * wasteFactor);
    const underlaymentArea = actualArea * wasteFactor;
    const flashingLength = Math.sqrt(specs.area) * 4 * wasteFactor; // Периметр

    return {
      roofing: { area: actualArea, units: roofingUnits },
      underlayment: { area: underlaymentArea },
      flashing: { length: flashingLength },
    };
  }

  /**
   * Розраховує загальну вартість матеріалів
   */
  async calculateMaterialCost(materials: Record<string, number>): Promise<{
    total: number;
    breakdown: Array<{ material: string; cost: number }>;
  }> {
    const prices: Record<string, number> = {
      concrete: 120,
      steel: 3000,
      brick: 0.5,
      sand: 30,
      gravel: 25,
      insulation: 25,
      roofing: 15,
    };

    const breakdown = Object.entries(materials).map(([material, quantity]) => ({
      material,
      cost: (prices[material] || 0) * quantity,
    }));

    const total = breakdown.reduce((sum, item) => sum + item.cost, 0);

    return { total, breakdown };
  }

  /**
   * Пропонує альтернативні матеріали
   */
  async suggestAlternatives(material: string): Promise<{
    alternatives: Array<{
      name: string;
      costDifference: number; // у процентах
      qualityImpact: "better" | "same" | "worse";
    }>;
  }> {
    const alternatives: Record<string, Array<{ name: string; costDifference: number; qualityImpact: "better" | "same" | "worse" }>> = {
      concrete: [
        { name: "Fly ash concrete", costDifference: -10, qualityImpact: "same" },
        { name: "High-strength concrete", costDifference: 20, qualityImpact: "better" },
      ],
      brick: [
        { name: "Concrete block", costDifference: -15, qualityImpact: "same" },
        { name: "AAC block", costDifference: 5, qualityImpact: "better" },
      ],
      steel: [
        { name: "Aluminum", costDifference: 30, qualityImpact: "same" },
        { name: "Composite", costDifference: -5, qualityImpact: "worse" },
      ],
    };

    return { alternatives: alternatives[material] || [] };
  }

  /**
   * Перевіряє наявність на складі
   */
  async checkInventory(materials: Array<{ type: string; quantity: number }>): Promise<{
    available: Array<{ type: string; quantity: number }>;
    shortage: Array<{ type: string; needed: number; available: number }>;
  }> {
    // Симуляція перевірки інвентарю
    const inventory: Record<string, number> = {
      concrete: 50,
      steel: 10,
      brick: 10000,
      sand: 30,
      gravel: 25,
    };

    const available: Array<{ type: string; quantity: number }> = [];
    const shortage: Array<{ type: string; needed: number; available: number }> = [];

    for (const material of materials) {
      const availableQty = inventory[material.type] || 0;
      if (availableQty >= material.quantity) {
        available.push({ type: material.type, quantity: material.quantity });
      } else {
        shortage.push({
          type: material.type,
          needed: material.quantity,
          available: availableQty,
        });
      }
    }

    return { available, shortage };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const materialCalculatorAgent = new MaterialCalculatorAgent();
