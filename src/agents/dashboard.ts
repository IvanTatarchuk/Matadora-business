import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Dashboard Agent - Агент для панелі управління
 * Агрегує дані для панелі управління та надає огляд проекту
 */
export class DashboardAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "dashboard",
      name: "Dashboard Agent",
      description: "Агрегує дані для панелі управління, надає огляд проекту та ключові метрики в реальному часі",
      category: "reporting",
      capabilities: [
        "data_aggregation",
        "real_time_metrics",
        "widget_configuration",
        "alert_display",
        "drill_down",
        "customization",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Агрегує дані
   */
  async aggregateData(projectId: string): Promise<{
    overview: {
      totalProjects: number;
      activeProjects: number;
      completedProjects: number;
      totalBudget: number;
      spent: number;
    };
    metrics: Record<string, number>;
  }> {
    const overview = {
      totalProjects: 10,
      activeProjects: 6,
      completedProjects: 4,
      totalBudget: 5000000,
      spent: 3200000,
    };

    const metrics = {
      overallProgress: 64,
      onSchedule: 85,
      onBudget: 90,
      qualityScore: 88,
      safetyRating: 95,
    };

    return { overview, metrics };
  }

  /**
   * Отримує метрики в реальному часі
   */
  async getRealTimeMetrics(projectId: string): Promise<{
    current: {
      progress: number;
      budgetUtilization: number;
      activeTasks: number;
      pendingIssues: number;
    };
    trends: {
      progress: "increasing" | "stable" | "decreasing";
      budget: "on_track" | "at_risk" | "over_budget";
      issues: "increasing" | "stable" | "decreasing";
    };
  }> {
    const current = {
      progress: 65,
      budgetUtilization: 64,
      activeTasks: 25,
      pendingIssues: 3,
    };

    const trends = {
      progress: "increasing" as const,
      budget: "on_track" as const,
      issues: "stable" as const,
    };

    return { current, trends };
  }

  /**
   * Конфігурує віджети
   */
  async configureWidgets(projectId: string): Promise<{
    widgets: Array<{
      id: string;
      type: string;
      title: string;
      position: { x: number; y: number };
      size: { width: number; height: number };
      data: any;
    }>;
  }> {
    const widgets = [
      {
        id: "widget-1",
        type: "progress",
        title: "Project Progress",
        position: { x: 0, y: 0 },
        size: { width: 2, height: 1 },
        data: { value: 65 },
      },
      {
        id: "widget-2",
        type: "budget",
        title: "Budget Status",
        position: { x: 2, y: 0 },
        size: { width: 2, height: 1 },
        data: { spent: 3200000, total: 5000000 },
      },
      {
        id: "widget-3",
        type: "tasks",
        title: "Active Tasks",
        position: { x: 0, y: 1 },
        size: { width: 2, height: 1 },
        data: { active: 25, completed: 50 },
      },
    ];

    return { widgets };
  }

  /**
   * Відображає сповіщення
   */
  async displayAlerts(projectId: string): Promise<{
    alerts: Array<{
      id: string;
      type: "info" | "warning" | "critical";
      title: string;
      message: string;
      timestamp: Date;
      actionRequired: boolean;
    }>;
  }> {
    const alerts = [
      {
        id: "alert-1",
        type: "warning" as const,
        title: "Budget approaching limit",
        message: "Project budget at 64% with 35% time remaining",
        timestamp: new Date(),
        actionRequired: true,
      },
      {
        id: "alert-2",
        type: "info" as const,
        title: "Milestone completed",
        message: "Foundation phase completed successfully",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        actionRequired: false,
      },
    ];

    return { alerts };
  }

  /**
   * Деталізація
   */
  async drillDown(projectId: string, metric: string): Promise<{
    metric: string;
    breakdown: Array<{
      category: string;
      value: number;
      percentage: number;
    }>;
    details: Record<string, any>;
  }> {
    const breakdown = [
      { category: "Foundation", value: 100, percentage: 100 },
      { category: "Structure", value: 65, percentage: 65 },
      { category: "MEP", value: 20, percentage: 20 },
    ];

    const details = {
      totalTasks: 75,
      completedTasks: 50,
      inProgressTasks: 25,
    };

    return { metric, breakdown, details };
  }

  /**
   * Кастомізація
   */
  async customizeDashboard(userId: string, config: {
    layout: string;
    widgets: string[];
    theme: string;
  }): Promise<{
    success: boolean;
    configId: string;
  }> {
    return {
      success: true,
      configId: `config-${Date.now()}`,
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
export const dashboardAgent = new DashboardAgent();
