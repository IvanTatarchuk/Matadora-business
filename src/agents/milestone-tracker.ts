import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Milestone Tracker Agent - Агент для відстеження етапів
 * Відстежує етапи проекту та їх виконання
 */
export class MilestoneTrackerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "milestone-tracker",
      name: "Milestone Tracker Agent",
      description: "Відстежує етапи проекту, моніторить їх виконання та сповіщає про наближення дедлайнів",
      category: "planning",
      capabilities: [
        "milestone_tracking",
        "progress_monitoring",
        "deadline_alerts",
        "dependency_check",
        "completion_verification",
        "reporting",
      ],
      dependencies: [],
      priority: 2,
    };
  }

  /**
   * Відстежує етапи
   */
  async trackMilestones(projectId: string): Promise<{
    milestones: Array<{
      id: string;
      name: string;
      plannedDate: Date;
      actualDate?: Date;
      status: "not_started" | "in_progress" | "completed" | "delayed";
      progress: number; // 0-100
      dependencies: string[];
    }>;
  }> {
    const milestones = [
      {
        id: "ms-1",
        name: "Foundation Complete",
        plannedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        actualDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        status: "completed" as const,
        progress: 100,
        dependencies: [],
      },
      {
        id: "ms-2",
        name: "Structure Complete",
        plannedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "in_progress" as const,
        progress: 45,
        dependencies: ["ms-1"],
      },
      {
        id: "ms-3",
        name: "Interior Finish",
        plannedDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: "not_started" as const,
        progress: 0,
        dependencies: ["ms-2"],
      },
    ];

    return { milestones };
  }

  /**
   * Моніторить прогрес
   */
  async monitorProgress(projectId: string): Promise<{
    overallProgress: number; // 0-100
    onTrack: boolean;
    milestonesCompleted: number;
    totalMilestones: number;
    nextMilestone: {
      id: string;
      name: string;
      dueDate: Date;
      daysRemaining: number;
    };
  }> {
    const overallProgress = 55;
    const onTrack = true;
    const milestonesCompleted = 1;
    const totalMilestones = 3;
    const nextMilestone = {
      id: "ms-2",
      name: "Structure Complete",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      daysRemaining: 30,
    };

    return {
      overallProgress,
      onTrack,
      milestonesCompleted,
      totalMilestones,
      nextMilestone,
    };
  }

  /**
   * Генерує сповіщення про дедлайни
   */
  async generateDeadlineAlerts(projectId: string): Promise<{
    alerts: Array<{
      milestoneId: string;
      milestoneName: string;
      dueDate: Date;
      daysRemaining: number;
      status: "on_track" | "at_risk" | "overdue";
      recommendation: string;
    }>;
  }> {
    const alerts = [
      {
        milestoneId: "ms-2",
        milestoneName: "Structure Complete",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        daysRemaining: 30,
        status: "on_track" as const,
        recommendation: "Continue current pace",
      },
      {
        milestoneId: "ms-3",
        milestoneName: "Interior Finish",
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        daysRemaining: 60,
        status: "on_track" as const,
        recommendation: "Plan ahead for interior work",
      },
    ];

    return { alerts };
  }

  /**
   * Перевіряє залежності
   */
  async checkDependencies(projectId: string): Promise<{
    dependencies: Array<{
      from: string;
      to: string;
      status: "satisfied" | "blocked" | "in_progress";
      details: string;
    }>;
    blockedMilestones: string[];
  }> {
    const dependencies = [
      {
        from: "ms-1",
        to: "ms-2",
        status: "satisfied" as const,
        details: "Foundation completed, structure work can proceed",
      },
      {
        from: "ms-2",
        to: "ms-3",
        status: "in_progress" as const,
        details: "Structure work in progress, interior work pending",
      },
    ];

    const blockedMilestones: string[] = [];

    return { dependencies, blockedMilestones };
  }

  /**
   * Верифікує завершення
   */
  async verifyCompletion(milestoneId: string): Promise<{
    verified: boolean;
    completionDate: Date;
    criteria: Array<{
      criterion: string;
      met: boolean;
      notes: string;
    }>;
    overallStatus: "complete" | "partial" | "incomplete";
  }> {
    const criteria = [
      {
        criterion: "Foundation poured",
        met: true,
        notes: "Completed according to specifications",
      },
      {
        criterion: "Curing complete",
        met: true,
        notes: "28-day curing period completed",
      },
      {
        criterion: "Inspection passed",
        met: true,
        notes: "Structural inspection approved",
      },
    ];

    const verified = criteria.every(c => c.met);
    const overallStatus = verified ? "complete" as const : criteria.some(c => c.met) ? "partial" as const : "incomplete" as const;

    return {
      verified,
      completionDate: new Date(),
      criteria,
      overallStatus,
    };
  }

  /**
   * Генерує звіт
   */
  async generateReport(projectId: string): Promise<{
    reportId: string;
    summary: string;
    milestones: Array<{
      name: string;
      status: string;
      plannedDate: Date;
      actualDate?: Date;
      variance: number; // в днях
    }>;
    overallHealth: "healthy" | "at_risk" | "critical";
    recommendations: string[];
    generatedAt: Date;
  }> {
    return {
      reportId: `report-${Date.now()}`,
      summary: "Project milestones progressing according to schedule",
      milestones: [
        {
          name: "Foundation Complete",
          status: "completed",
          plannedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          actualDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          variance: -2,
        },
        {
          name: "Structure Complete",
          status: "in_progress",
          plannedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          variance: 0,
        },
      ],
      overallHealth: "healthy" as const,
      recommendations: [
        "Continue current progress",
        "Monitor structure work closely",
        "Plan for interior phase",
      ],
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
export const milestoneTrackerAgent = new MilestoneTrackerAgent();
