import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Progress Tracker Agent - Агент для відстеження прогресу
 * Моніторить прогрес проекту та відстежує виконання завдань
 */
export class ProgressTrackerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "progress-tracker",
      name: "Progress Tracker Agent",
      description: "Моніторить прогрес проекту, відстежує виконання завдань та генерує звіти про статус",
      category: "planning",
      capabilities: [
        "task_tracking",
        "milestone_monitoring",
        "progress_calculation",
        "delay_detection",
        "status_reporting",
        "trend_analysis",
      ],
      dependencies: [],
      priority: 35,
    };
  }

  /**
   * Відстежує виконання завдань
   */
  async trackTasks(projectId: string): Promise<{
    tasks: Array<{
      id: string;
      name: string;
      status: "not_started" | "in_progress" | "completed" | "delayed";
      progress: number; // 0-100
      dueDate: Date;
      assignee: string;
    }>;
  }> {
    const tasks = [
      {
        id: "task-1",
        name: "Foundation excavation",
        status: "completed" as const,
        progress: 100,
        dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        assignee: "Crew A",
      },
      {
        id: "task-2",
        name: "Foundation pouring",
        status: "in_progress" as const,
        progress: 65,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        assignee: "Crew A",
      },
      {
        id: "task-3",
        name: "Steel erection",
        status: "not_started" as const,
        progress: 0,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        assignee: "Crew B",
      },
    ];

    return { tasks };
  }

  /**
   * Моніторить етапи проекту
   */
  async monitorMilestones(projectId: string): Promise<{
    milestones: Array<{
      id: string;
      name: string;
      plannedDate: Date;
      actualDate?: Date;
      status: "pending" | "completed" | "delayed";
      progress: number;
    }>;
  }> {
    const milestones = [
      {
        id: "ms-1",
        name: "Foundation Complete",
        plannedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        actualDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: "completed" as const,
        progress: 100,
      },
      {
        id: "ms-2",
        name: "Structure Complete",
        plannedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "pending" as const,
        progress: 25,
      },
      {
        id: "ms-3",
        name: "Interior Finish",
        plannedDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: "pending" as const,
        progress: 0,
      },
    ];

    return { milestones };
  }

  /**
   * Розраховує загальний прогрес
   */
  async calculateProgress(projectId: string): Promise<{
    overall: number; // 0-100
    byPhase: Record<string, number>;
    onTrack: boolean;
    estimatedCompletion: Date;
  }> {
    const byPhase = {
      foundation: 100,
      structure: 25,
      interior: 0,
      exterior: 10,
    };

    const overall = Object.values(byPhase).reduce((sum, val) => sum + val, 0) / Object.keys(byPhase).length;
    const onTrack = overall >= 50; // Приклад критерію
    const estimatedCompletion = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);

    return {
      overall: Math.round(overall),
      byPhase,
      onTrack,
      estimatedCompletion,
    };
  }

  /**
   * Виявляє затримки
   */
 async detectDelays(projectId: string): Promise<{
    delayedTasks: Array<{
      taskId: string;
      taskName: string;
      plannedDate: Date;
      estimatedCompletion: Date;
      delayDays: number;
      impact: "low" | "medium" | "high";
    }>;
  }> {
    const delayedTasks = [
      {
        taskId: "task-4",
        taskName: "Electrical rough-in",
        plannedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        estimatedCompletion: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        delayDays: 7,
        impact: "medium" as const,
      },
    ];

    return { delayedTasks };
  }

  /**
   * Генерує звіт про статус
   */
  async generateStatusReport(projectId: string): Promise<{
    summary: string;
    overallProgress: number;
    completedTasks: number;
    totalTasks: number;
    upcomingDeadlines: Array<{ task: string; date: Date }>;
    risks: string[];
  }> {
    const progress = await this.calculateProgress(projectId);
    const tasks = await this.trackTasks(projectId);

    return {
      summary: "Project is progressing well with minor delays in electrical work",
      overallProgress: progress.overall,
      completedTasks: tasks.tasks.filter(t => t.status === "completed").length,
      totalTasks: tasks.tasks.length,
      upcomingDeadlines: [
        { task: "Foundation pouring", date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
        { task: "Steel erection", date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
      ],
      risks: [
        "Weather may impact outdoor work",
        "Supply chain delays for materials",
      ],
    };
  }

  /**
   * Аналізує тренди прогресу
   */
  async analyzeTrends(projectId: string, weeks: number): Promise<{
    weeklyProgress: Array<{ week: number; progress: number }>;
    trend: "accelerating" | "decelerating" | "stable";
    forecast: Array<{ week: number; projectedProgress: number }>;
  }> {
    const weeklyProgress = Array.from({ length: weeks }, (_, i) => ({
      week: i + 1,
      progress: Math.min(100, (i + 1) * (100 / weeks) + (Math.random() * 10 - 5)),
    }));

    const trend = "accelerating" as const;
    const forecast = weeklyProgress.map(wp => ({
      week: wp.week + weeks,
      projectedProgress: Math.min(100, wp.progress + 10),
    }));

    return { weeklyProgress, trend, forecast };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const progressTrackerAgent = new ProgressTrackerAgent();
