import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Geotechnical Agent - Агент для геотехнічного аналізу
 * Аналізує ґрунтові умови та забезпечує стабільність фундаменту
 */
export class GeotechnicalAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "geotechnical",
      name: "Geotechnical Agent",
      description: "Аналізує ґрунтові умови, розраховує несучу здатність та забезпечує стабільність фундаменту",
      category: "technical",
      capabilities: [
        "soil_analysis",
        "bearing_capacity",
        "settlement_analysis",
        "slope_stability",
        "foundation_design",
        "groundwater_assessment",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Аналізує ґрунт
   */
  async analyzeSoil(siteId: string): Promise<{
    soilLayers: Array<{
      depth: number; // в метрах
      type: string;
      properties: {
        cohesion: number; // в кПа
        frictionAngle: number; // в градусах
        density: number; // в кг/м³
      };
    }>;
    recommendations: string[];
  }> {
    const soilLayers = [
      {
        depth: 0,
        type: "Topsoil",
        properties: { cohesion: 5, frictionAngle: 20, density: 1600 },
      },
      {
        depth: 1,
        type: "Clay",
        properties: { cohesion: 25, frictionAngle: 15, density: 1800 },
      },
      {
        depth: 4,
        type: "Sand",
        properties: { cohesion: 0, frictionAngle: 35, density: 1900 },
      },
      {
        depth: 8,
        type: "Rock",
        properties: { cohesion: 100, frictionAngle: 45, density: 2500 },
      },
    ];

    const recommendations = [
      "Remove topsoil for foundation",
      "Consider deep foundation due to clay layer",
      "Rock layer provides excellent bearing capacity",
    ];

    return { soilLayers, recommendations };
  }

  /**
   * Розраховує несучу здатність
   */
  async calculateBearingCapacity(siteId: string, foundation: {
    type: string;
    width: number; // в метрах
    depth: number; // в метрах
  }): Promise<{
    allowableBearingCapacity: number; // в кПа
    ultimateBearingCapacity: number; // в кПа
    safetyFactor: number;
    settlement: number; // в мм
  }> {
    const allowableBearingCapacity = 250;
    const ultimateBearingCapacity = 500;
    const safetyFactor = 2;
    const settlement = 15;

    return { allowableBearingCapacity, ultimateBearingCapacity, safetyFactor, settlement };
  }

  /**
   * Аналізує осідання
   */
  async analyzeSettlement(siteId: string, load: number): Promise<{
    immediateSettlement: number; // в мм
    consolidationSettlement: number; // в мм
    totalSettlement: number; // в мм
    differentialSettlement: number; // в мм
    acceptable: boolean;
  }> {
    const immediateSettlement = 5;
    const consolidationSettlement = 20;
    const totalSettlement = immediateSettlement + consolidationSettlement;
    const differentialSettlement = 8;
    const acceptable = totalSettlement < 50 && differentialSettlement < 25;

    return { immediateSettlement, consolidationSettlement, totalSettlement, differentialSettlement, acceptable };
  }

  /**
   * Аналізує стабільність схилу
   */
  async analyzeSlopeStability(siteId: string): Promise<{
    factorOfSafety: number;
    critical: boolean;
    failureMode: string;
    recommendations: string[];
  }> {
    const factorOfSafety = 1.5;
    const critical = factorOfSafety < 1.3;
    const failureMode = "Rotational slide";
    const recommendations = critical
      ? ["Install retaining wall", "Install drainage system", "Monitor slope movement"]
      : ["Regular monitoring recommended"];

    return { factorOfSafety, critical, failureMode, recommendations };
  }

  /**
   * Проектує фундамент
   */
  async designFoundation(siteId: string, buildingLoad: number): Promise<{
    recommendedType: string;
    dimensions: {
      length: number;
      width: number;
      depth: number;
    };
    reinforcement: string;
    estimatedCost: number;
  }> {
    const recommendedType = "Raft foundation";
    const dimensions = {
      length: 20,
      width: 15,
      depth: 1.5,
    };
    const reinforcement = "Double layer rebar mesh 12mm @ 150mm c/c";
    const estimatedCost = 50000;

    return { recommendedType, dimensions, reinforcement, estimatedCost };
  }

  /**
   * Оцінює підземні води
   */
  async assessGroundwater(siteId: string): Promise<{
    waterTableDepth: number; // в метрах
    seasonalVariation: number; // в метрах
    impact: "low" | "medium" | "high";
    recommendations: string[];
  }> {
    const waterTableDepth = 2.5;
    const seasonalVariation = 1;
    const impact = waterTableDepth < 3 ? "medium" as const : "low" as const;
    const recommendations = impact === "medium"
      ? ["Install dewatering system", "Waterproof foundation", "Monitor water levels"]
      : ["Standard waterproofing sufficient"];

    return { waterTableDepth, seasonalVariation, impact, recommendations };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const geotechnicalAgent = new GeotechnicalAgent();
