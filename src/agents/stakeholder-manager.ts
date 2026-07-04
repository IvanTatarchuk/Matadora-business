import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Stakeholder Manager Agent - Агент для управління стейкхолдерами
 * Керує комунікацією та відносинами зі стейкхолдерами проекту
 */
export class StakeholderManagerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "stakeholder-manager",
      name: "Stakeholder Manager Agent",
      description: "Керує комунікацією та відносинами зі стейкхолдерами, відстежує їх очікування та залученість",
      category: "communication",
      capabilities: [
        "stakeholder_identification",
        "engagement_tracking",
        "expectation_management",
        "communication_planning",
        "conflict_resolution",
        "satisfaction_monitoring",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Ідентифікує стейкхолдерів
   */
  async identifyStakeholders(projectId: string): Promise<{
    stakeholders: Array<{
      id: string;
      name: string;
      role: string;
      organization: string;
      influence: "high" | "medium" | "low";
      interest: "high" | "medium" | "low";
    }>;
  }> {
    const stakeholders = [
      {
        id: "sh-1",
        name: "John Smith",
        role: "Project Sponsor",
        organization: "Client Company",
        influence: "high" as const,
        interest: "high" as const,
      },
      {
        id: "sh-2",
        name: "Jane Doe",
        role: "Architect",
        organization: "Design Firm",
        influence: "medium" as const,
        interest: "high" as const,
      },
      {
        id: "sh-3",
        name: "Bob Johnson",
        role: "Regulatory Officer",
        organization: "City Council",
        influence: "high" as const,
        interest: "medium" as const,
      },
    ];

    return { stakeholders };
  }

  /**
   * Відстежує залученість
   */
  async trackEngagement(projectId: string): Promise<{
    engagement: Array<{
      stakeholderId: string;
      stakeholderName: string;
      engagementLevel: "high" | "medium" | "low";
      lastContact: Date;
      nextContact: Date;
      communicationHistory: number;
    }>;
  }> {
    const engagement = [
      {
        stakeholderId: "sh-1",
        stakeholderName: "John Smith",
        engagementLevel: "high" as const,
        lastContact: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        nextContact: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        communicationHistory: 12,
      },
      {
        stakeholderId: "sh-2",
        stakeholderName: "Jane Doe",
        engagementLevel: "medium" as const,
        lastContact: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        nextContact: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        communicationHistory: 8,
      },
    ];

    return { engagement };
  }

  /**
   * Керує очікуваннями
   */
  async manageExpectations(projectId: string): Promise<{
    expectations: Array<{
      stakeholderId: string;
      expectation: string;
      status: "met" | "at_risk" | "not_met";
      actions: string[];
    }>;
  }> {
    const expectations = [
      {
        stakeholderId: "sh-1",
        expectation: "Project completion by Q3",
        status: "at_risk" as const,
        actions: ["Provide updated timeline", "Discuss mitigation strategies"],
      },
      {
        stakeholderId: "sh-2",
        expectation: "Design approval within 2 weeks",
        status: "met" as const,
        actions: [],
      },
    ];

    return { expectations };
  }

  /**
   * Плановує комунікацію
   */
  async planCommunication(projectId: string): Promise<{
    plan: Array<{
      stakeholderId: string;
      frequency: "daily" | "weekly" | "monthly" | "as_needed";
      method: string;
      content: string[];
    }>;
  }> {
    const plan = [
      {
        stakeholderId: "sh-1",
        frequency: "weekly" as const,
        method: "Email + Meeting",
        content: ["Progress update", "Budget status", "Risks and issues"],
      },
      {
        stakeholderId: "sh-2",
        frequency: "as_needed" as const,
        method: "Email",
        content: ["Design changes", "Technical clarifications"],
      },
    ];

    return { plan };
  }

  /**
   * Вирішує конфлікти
   */
  async resolveConflict(conflictId: string): Promise<{
    parties: Array<{ stakeholderId: string; name: string }>;
    issue: string;
    resolution: string;
    status: "in_progress" | "resolved" | "escalated";
    timeline: string[];
  }> {
    return {
      parties: [
        { stakeholderId: "sh-1", name: "John Smith" },
        { stakeholderId: "sh-2", name: "Jane Doe" },
      ],
      issue: "Disagreement on design changes",
      resolution: "Compromise reached with minor modifications",
      status: "resolved" as const,
      timeline: [
        "Conflict identified",
        "Meeting scheduled",
        "Discussion held",
        "Resolution agreed",
      ],
    };
  }

  /**
   * Моніторить задоволеність
   */
  async monitorSatisfaction(projectId: string): Promise<{
    satisfaction: Array<{
      stakeholderId: string;
      stakeholderName: string;
      score: number; // 1-10
      feedback: string;
      trend: "improving" | "stable" | "declining";
    }>;
    overallScore: number;
    recommendations: string[];
  }> {
    const satisfaction = [
      {
        stakeholderId: "sh-1",
        stakeholderName: "John Smith",
        score: 8,
        feedback: "Good progress, would like more frequent updates",
        trend: "stable" as const,
      },
      {
        stakeholderId: "sh-2",
        stakeholderName: "Jane Doe",
        score: 7,
        feedback: "Communication could be improved",
        trend: "declining" as const,
      },
    ];

    const overallScore = satisfaction.reduce((sum, s) => sum + s.score, 0) / satisfaction.length;
    const recommendations = [
      "Increase communication frequency with architect",
      "Schedule regular stakeholder meetings",
      "Implement feedback mechanism",
    ];

    return { satisfaction, overallScore: Math.round(overallScore * 10) / 10, recommendations };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const stakeholderManagerAgent = new StakeholderManagerAgent();
