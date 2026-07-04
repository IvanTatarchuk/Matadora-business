import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Inventory Optimizer Agent - Агент для оптимізації інвентарю
 * Оптимізує рівні запасів матеріалів та зменшує витрати на зберігання
 */
export class InventoryOptimizerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "inventory-optimizer",
      name: "Inventory Optimizer Agent",
      description: "Оптимізує рівні запасів матеріалів, зменшує витрати на зберігання та запобігає дефіциту",
      category: "planning",
      capabilities: [
        "stock_level_optimization",
        "demand_forecasting",
        "reorder_point_calculation",
        "waste_reduction",
        "supplier_coordination",
        "cost_analysis",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Оптимізує рівні запасів
   */
  async optimizeStockLevels(projectId: string): Promise<{
    items: Array<{
      itemId: string;
      name: string;
      currentStock: number;
      optimalStock: number;
      minStock: number;
      maxStock: number;
      action: "order" | "reduce" | "maintain";
    }>;
  }> {
    const items = [
      {
        itemId: "item-1",
        name: "Cement bags",
        currentStock: 150,
        optimalStock: 200,
        minStock: 50,
        maxStock: 300,
        action: "order" as const,
      },
      {
        itemId: "item-2",
        name: "Steel beams",
        currentStock: 100,
        optimalStock: 80,
        minStock: 30,
        maxStock: 120,
        action: "reduce" as const,
      },
      {
        itemId: "item-3",
        name: "Bricks",
        currentStock: 500,
        optimalStock: 500,
        minStock: 200,
        maxStock: 800,
        action: "maintain" as const,
      },
    ];

    return { items };
  }

  /**
   * Прогнозує попит
   */
  async forecastDemand(itemId: string, weeks: number): Promise<{
    weeklyDemand: Array<{
      week: number;
      demand: number;
      confidence: number; // 0-100
    }>;
    totalDemand: number;
    seasonality: "increasing" | "stable" | "decreasing";
  }> {
    const weeklyDemand = Array.from({ length: weeks }, (_, i) => ({
      week: i + 1,
      demand: 50 + Math.floor(Math.random() * 20),
      confidence: 80 + Math.floor(Math.random() * 15),
    }));

    const totalDemand = weeklyDemand.reduce((sum, w) => sum + w.demand, 0);
    const seasonality = "stable" as const;

    return { weeklyDemand, totalDemand, seasonality };
  }

  /**
   * Розраховує точку замовлення
   */
  async calculateReorderPoint(itemId: string): Promise<{
    reorderPoint: number;
    safetyStock: number;
    leadTime: number; // в днях
    dailyUsage: number;
    serviceLevel: number; // 0-100
  }> {
    const dailyUsage = 20;
    const leadTime = 7;
    const safetyStock = 50;
    const reorderPoint = dailyUsage * leadTime + safetyStock;
    const serviceLevel = 95;

    return { reorderPoint, safetyStock, leadTime, dailyUsage, serviceLevel };
  }

  /**
   * Зменшує відходи
   */
  async reduceWaste(projectId: string): Promise<{
    wasteAnalysis: Array<{
      material: string;
      currentWaste: number; // у процентах
      targetWaste: number;
      potentialSavings: number;
      recommendations: string[];
    }>;
    totalPotentialSavings: number;
  }> {
    const wasteAnalysis = [
      {
        material: "Concrete",
        currentWaste: 8,
        targetWaste: 5,
        potentialSavings: 3000,
        recommendations: [
          "Improve formwork quality",
          "Better mixing procedures",
        ],
      },
      {
        material: "Steel",
        currentWaste: 5,
        targetWaste: 3,
        potentialSavings: 5000,
        recommendations: [
          "Precise cutting",
          "Reuse offcuts",
        ],
      },
    ];

    const totalPotentialSavings = wasteAnalysis.reduce((sum, w) => sum + w.potentialSavings, 0);

    return { wasteAnalysis, totalPotentialSavings };
  }

  /**
   * Координує з постачальниками
   */
  async coordinateSuppliers(items: Array<{
    itemId: string;
    quantity: number;
    neededBy: Date;
  }>): Promise<{
    orders: Array<{
      itemId: string;
      supplierId: string;
      supplierName: string;
      quantity: number;
      estimatedDelivery: Date;
      cost: number;
    }>;
    totalCost: number;
  }> {
    const orders = items.map(item => ({
      itemId: item.itemId,
      supplierId: "sup-1",
      supplierName: "ABC Supplies",
      quantity: item.quantity,
      estimatedDelivery: new Date(item.neededBy.getTime() - 3 * 24 * 60 * 60 * 1000),
      cost: item.quantity * 50,
    }));

    const totalCost = orders.reduce((sum, o) => sum + o.cost, 0);

    return { orders, totalCost };
  }

  /**
   * Аналізує витрати
   */
  async analyzeCosts(projectId: string): Promise<{
    holdingCosts: number;
    orderingCosts: number;
    shortageCosts: number;
    totalCost: number;
    eoq: number; // Economic Order Quantity
    recommendations: string[];
  }> {
    const holdingCosts = 5000;
    const orderingCosts = 2000;
    const shortageCosts = 1000;
    const totalCost = holdingCosts + orderingCosts + shortageCosts;
    const eoq = 150;
    const recommendations = [
      "Increase order frequency to reduce holding costs",
      "Implement JIT for high-value items",
    ];

    return { holdingCosts, orderingCosts, shortageCosts, totalCost, eoq, recommendations };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const inventoryOptimizerAgent = new InventoryOptimizerAgent();
