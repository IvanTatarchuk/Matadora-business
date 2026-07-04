import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Change Order Agent - Агент для управління змінами
 * Керує змінами в обсязі робіт та оцінює їх вплив
 */
export class ChangeOrderAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "change-order",
      name: "Change Order Agent",
      description: "Керує змінами в обсязі робіт, оцінює їх вплив на бюджет та графік",
      category: "planning",
      capabilities: [
        "change_evaluation",
        "impact_analysis",
        "approval_workflow",
        "cost_estimation",
        "schedule_adjustment",
        "documentation",
      ],
      dependencies: [],
      priority: 15,
    };
  }

  /**
   * Оцінює зміну
   */
  async evaluateChange(change: {
    description: string;
    reason: string;
    requestedBy: string;
  }): Promise<{
    valid: boolean;
    category: "scope" | "design" | "unforeseen" | "client_request";
    priority: "low" | "medium" | "high" | "urgent";
    requiresApproval: boolean;
  }> {
    const category = "scope" as const;
    const priority = "medium" as const;
    const requiresApproval = true;

    return {
      valid: true,
      category,
      priority,
      requiresApproval,
    };
  }

  /**
   * Аналізує вплив зміни
   */
  async analyzeImpact(change: {
    description: string;
    estimatedCost: number;
    estimatedDays: number;
  }): Promise<{
    costImpact: number;
    scheduleImpact: number;
    qualityImpact: "positive" | "neutral" | "negative";
    riskImpact: "low" | "medium" | "high";
    recommendations: string[];
  }> {
    const costImpact = change.estimatedCost;
    const scheduleImpact = change.estimatedDays;
    const qualityImpact = "neutral" as const;
    const riskImpact = "medium" as const;
    const recommendations = [
      "Review budget implications",
      "Adjust project timeline",
      "Update stakeholders",
    ];

    return { costImpact, scheduleImpact, qualityImpact, riskImpact, recommendations };
  }

  /**
   * Керує процесом затвердження
   */
  async manageApprovalWorkflow(changeOrderId: string): Promise<{
    currentStep: string;
    approvers: Array<{ name: string; status: "pending" | "approved" | "rejected" }>;
    canApprove: boolean;
    estimatedCompletion: Date;
  }> {
    const approvers = [
      { name: "Project Manager", status: "approved" as const },
      { name: "Client Representative", status: "pending" as const },
      { name: "Finance Manager", status: "pending" as const },
    ];

    return {
      currentStep: "Client Representative",
      approvers,
      canApprove: true,
      estimatedCompletion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Оцінює вартість зміни
   */
  async estimateCost(change: {
    description: string;
    materials: Array<{ item: string; quantity: number; unitPrice: number }>;
    labor: Array<{ type: string; hours: number; hourlyRate: number }>;
  }): Promise<{
    totalCost: number;
    breakdown: {
      materials: number;
      labor: number;
      overhead: number;
      contingency: number;
    };
  }> {
    const materials = change.materials.reduce((sum, m) => sum + m.quantity * m.unitPrice, 0);
    const labor = change.labor.reduce((sum, l) => sum + l.hours * l.hourlyRate, 0);
    const overhead = (materials + labor) * 0.15;
    const contingency = (materials + labor + overhead) * 0.1;
    const totalCost = materials + labor + overhead + contingency;

    return {
      totalCost,
      breakdown: {
        materials,
        labor,
        overhead,
        contingency,
      },
    };
  }

  /**
   * Коригує графік
   */
  async adjustSchedule(currentSchedule: {
    endDate: Date;
  }, changeDays: number): Promise<{
    newEndDate: Date;
    affectedTasks: Array<{ taskId: string; newDate: Date }>;
    criticalPathAffected: boolean;
  }> {
    const newEndDate = new Date(currentSchedule.endDate.getTime() + changeDays * 24 * 60 * 60 * 1000);
    const affectedTasks = [
      { taskId: "task-1", newDate: new Date(Date.now() + changeDays * 24 * 60 * 60 * 1000) },
    ];
    const criticalPathAffected = changeDays > 5;

    return { newEndDate, affectedTasks, criticalPathAffected };
  }

  /**
   * Документує зміну
   */
  async documentChange(change: {
    id: string;
    description: string;
    reason: string;
    costImpact: number;
    scheduleImpact: number;
  }): Promise<{
    documentId: string;
    status: "draft" | "submitted" | "approved" | "rejected";
    version: string;
    generatedAt: Date;
  }> {
    return {
      documentId: `doc-${change.id}`,
      status: "draft" as const,
      version: "1.0",
      generatedAt: new Date(),
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
export const changeOrderAgent = new ChangeOrderAgent();
