import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Scope Manager Agent - Агент для управління обсягом робіт
 * Керує обсягом проекту, відстежує зміни та контролює розширення
 */
export class ScopeManagerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "scope-manager",
      name: "Scope Manager Agent",
      description: "Керує обсягом проекту, відстежує зміни та контролює розширення обсягу робіт",
      category: "planning",
      capabilities: [
        "scope_definition",
        "change_tracking",
        "scope_creep_detection",
        "impact_analysis",
        "approval_management",
        "documentation",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Визначає обсяг
   */
  async defineScope(projectId: string): Promise<{
    scope: {
      inclusions: string[];
      exclusions: string[];
      assumptions: string[];
      constraints: string[];
    };
    deliverables: Array<{
      id: string;
      name: string;
      description: string;
      dueDate: Date;
    }>;
  }> {
    const scope = {
      inclusions: [
        "Foundation work",
        "Structural steel erection",
        "Interior finishing",
        "MEP installation",
      ],
      exclusions: [
        "Landscaping",
        "Furniture procurement",
        "External signage",
      ],
      assumptions: [
        "Site access available",
        "Permits approved",
        "Materials delivered on time",
      ],
      constraints: [
        "Budget limit: $1M",
        "Timeline: 6 months",
        "Local building codes",
      ],
    };

    const deliverables = [
      {
        id: "del-1",
        name: "Foundation Complete",
        description: "Foundation poured and cured",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        id: "del-2",
        name: "Structure Complete",
        description: "Steel structure erected",
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    ];

    return { scope, deliverables };
  }

  /**
   * Відстежує зміни
   */
  async trackChanges(projectId: string): Promise<{
    changes: Array<{
      id: string;
      type: "addition" | "modification" | "deletion";
      description: string;
      requestedBy: string;
      date: Date;
      status: "pending" | "approved" | "rejected";
      impact: {
        cost: number;
        schedule: number; // в днях
      };
    }>;
  }> {
    const changes = [
      {
        id: "change-1",
        type: "addition" as const,
        description: "Add elevator shaft",
        requestedBy: "Client",
        date: new Date(),
        status: "pending" as const,
        impact: { cost: 50000, schedule: 15 },
      },
      {
        id: "change-2",
        type: "modification" as const,
        description: "Change flooring material",
        requestedBy: "Architect",
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        status: "approved" as const,
        impact: { cost: 5000, schedule: 3 },
      },
    ];

    return { changes };
  }

  /**
   * Виявляє розширення обсягу
   */
  async detectScopeCreep(projectId: string): Promise<{
    detected: boolean;
    indicators: Array<{
      indicator: string;
      severity: "low" | "medium" | "high";
      description: string;
    }>;
    recommendations: string[];
  }> {
    const detected = true;
    const indicators = [
      {
        indicator: "Unapproved additions",
        severity: "high" as const,
        description: "3 unapproved additions detected",
      },
      {
        indicator: "Budget variance",
        severity: "medium" as const,
        description: "Budget 15% over original estimate",
      },
    ];

    const recommendations = [
      "Implement strict change control process",
      "Review all scope changes with stakeholders",
      "Update project documentation",
    ];

    return { detected, indicators, recommendations };
  }

  /**
   * Аналізує вплив
   */
  async analyzeImpact(changeId: string): Promise<{
    costImpact: number;
    scheduleImpact: number;
    qualityImpact: "positive" | "neutral" | "negative";
    riskImpact: "low" | "medium" | "high";
    affectedDeliverables: string[];
    recommendations: string[];
  }> {
    const costImpact = 25000;
    const scheduleImpact = 7;
    const qualityImpact = "neutral" as const;
    const riskImpact = "medium" as const;
    const affectedDeliverables = ["del-2", "del-3"];
    const recommendations = [
      "Update budget",
      "Adjust timeline",
      "Notify stakeholders",
    ];

    return {
      costImpact,
      scheduleImpact,
      qualityImpact,
      riskImpact,
      affectedDeliverables,
      recommendations,
    };
  }

  /**
   * Керує затвердженням
   */
  async manageApproval(changeId: string): Promise<{
    currentStep: string;
    approvers: Array<{ name: string; status: "pending" | "approved" | "rejected" }>;
    canApprove: boolean;
    estimatedCompletion: Date;
  }> {
    const approvers = [
      { name: "Project Manager", status: "approved" as const },
      { name: "Client", status: "pending" as const },
      { name: "Finance", status: "pending" as const },
    ];

    return {
      currentStep: "Client",
      approvers,
      canApprove: true,
      estimatedCompletion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Документує обсяг
   */
  async documentScope(projectId: string): Promise<{
    documentId: string;
    version: string;
    content: {
      summary: string;
      detailedScope: string[];
 exclusions: string[];
    };
    lastUpdated: Date;
  }> {
    return {
      documentId: `scope-doc-${projectId}`,
      version: "2.1",
      content: {
        summary: "Current scope of work including all approved changes",
        detailedScope: [
          "Foundation work",
          "Structural steel erection",
          "Interior finishing",
          "Elevator installation",
        ],
        exclusions: [
          "Landscaping",
          "Furniture procurement",
        ],
      },
      lastUpdated: new Date(),
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
export const scopeManagerAgent = new ScopeManagerAgent();
