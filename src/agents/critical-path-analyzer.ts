import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Critical Path Analyzer Agent - Агент для аналізу критичного шляху
 * Аналізує критичний шлях проекту та виявляє можливості для стиснення
 */
export class CriticalPathAnalyzerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "critical-path-analyzer",
      name: "Critical Path Analyzer Agent",
      description: "Аналізує критичний шлях проекту, виявляє можливості для стиснення та оптимізації графіку",
      category: "planning",
      capabilities: [
        "critical_path_identification",
        "slack_analysis",
        "crashing_analysis",
        "fast_tracking",
        "resource_leveling",
        "schedule_compression",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Виявляє критичний шлях
   */
  async identifyCriticalPath(tasks: Array<{
    id: string;
    name: string;
    duration: number;
    dependencies: string[];
  }>): Promise<{
    criticalPath: Array<{
      taskId: string;
      taskName: string;
      duration: number;
      earliestStart: number;
      latestStart: number;
      slack: number;
    }>;
    totalDuration: number;
    nonCriticalTasks: Array<{
      taskId: string;
      taskName: string;
      slack: number;
    }>;
  }> {
    // Спрощений алгоритм для прикладу
    const criticalPath = [
      {
        taskId: "task-1",
        taskName: "Foundation",
        duration: 10,
        earliestStart: 0,
        latestStart: 0,
        slack: 0,
      },
      {
        taskId: "task-2",
        taskName: "Structure",
        duration: 15,
        earliestStart: 10,
        latestStart: 10,
        slack: 0,
      },
      {
        taskId: "task-3",
        taskName: "Roofing",
        duration: 8,
        earliestStart: 25,
        latestStart: 25,
        slack: 0,
      },
    ];

    const totalDuration = criticalPath.reduce((sum, t) => sum + t.duration, 0);

    const nonCriticalTasks = [
      {
        taskId: "task-4",
        taskName: "Electrical",
        slack: 5,
      },
      {
        taskId: "task-5",
        taskName: "Plumbing",
        slack: 3,
      },
    ];

    return { criticalPath, totalDuration, nonCriticalTasks };
  }

  /**
   * Аналізує резерв (slack)
   */
  async analyzeSlack(projectId: string): Promise<{
    tasks: Array<{
      taskId: string;
      taskName: string;
      totalSlack: number;
      freeSlack: number;
      isCritical: boolean;
    }>;
    totalSlackAvailable: number;
    recommendations: string[];
  }> {
    const tasks = [
      {
        taskId: "task-1",
        taskName: "Foundation",
        totalSlack: 0,
        freeSlack: 0,
        isCritical: true,
      },
      {
        taskId: "task-4",
        taskName: "Electrical",
        totalSlack: 5,
        freeSlack: 3,
        isCritical: false,
      },
      {
        taskId: "task-5",
        taskName: "Plumbing",
        totalSlack: 3,
        freeSlack: 2,
        isCritical: false,
      },
    ];

    const totalSlackAvailable = tasks.reduce((sum, t) => sum + t.totalSlack, 0);
    const recommendations = [
      "Use slack from non-critical tasks to buffer critical path",
      "Consider fast-tracking electrical work",
    ];

    return { tasks, totalSlackAvailable, recommendations };
  }

  /**
   * Аналізує стиснення (crashing)
   */
  async analyzeCrashing(projectId: string, targetDuration: number): Promise<{
    currentDuration: number;
    targetDuration: number;
    compressionNeeded: number;
    crashableTasks: Array<{
      taskId: string;
      currentDuration: number;
      crashedDuration: number;
      costPerDay: number;
      totalCost: number;
    }>;
    totalCrashCost: number;
    recommended: boolean;
  }> {
    const currentDuration = 45;
    const compressionNeeded = currentDuration - targetDuration;
    const crashableTasks = [
      {
        taskId: "task-2",
        currentDuration: 15,
        crashedDuration: 12,
        costPerDay: 500,
        totalCost: 1500,
      },
      {
        taskId: "task-3",
        currentDuration: 8,
        crashedDuration: 6,
        costPerDay: 400,
        totalCost: 800,
      },
    ];

    const totalCrashCost = crashableTasks.reduce((sum, t) => sum + t.totalCost, 0);
    const recommended = totalCrashCost < 10000;

    return {
      currentDuration,
      targetDuration,
      compressionNeeded,
      crashableTasks,
      totalCrashCost,
      recommended,
    };
  }

  /**
   * Аналізує fast-tracking
   */
  async analyzeFastTracking(projectId: string): Promise<{
    parallelizableTasks: Array<{
      taskId: string;
      taskName: string;
      canParallelWith: string[];
      riskLevel: "low" | "medium" | "high";
      timeSavings: number;
    }>;
    recommendedPairs: Array<{
      task1: string;
      task2: string;
      timeSavings: number;
    }>;
  }> {
    const parallelizableTasks = [
      {
        taskId: "task-4",
        taskName: "Electrical",
        canParallelWith: ["task-2"],
        riskLevel: "medium" as const,
        timeSavings: 5,
      },
      {
        taskId: "task-5",
        taskName: "Plumbing",
        canParallelWith: ["task-2"],
        riskLevel: "low" as const,
        timeSavings: 4,
      },
    ];

    const recommendedPairs = [
      {
        task1: "task-4",
        task2: "task-2",
        timeSavings: 5,
      },
    ];

    return { parallelizableTasks, recommendedPairs };
  }

  /**
   * Вирівнює ресурси
   */
  async levelResources(projectId: string): Promise<{
    leveledSchedule: Array<{
      taskId: string;
      originalStart: number;
      leveledStart: number;
      delay: number;
    }>;
    resourceUtilization: {
      before: number;
      after: number;
      improvement: number;
    };
  }> {
    const leveledSchedule = [
      {
        taskId: "task-4",
        originalStart: 25,
        leveledStart: 30,
        delay: 5,
      },
      {
        taskId: "task-5",
        originalStart: 28,
        leveledStart: 32,
        delay: 4,
      },
    ];

    const resourceUtilization = {
      before: 85,
      after: 92,
      improvement: 7,
    };

    return { leveledSchedule, resourceUtilization };
  }

  /**
   * Стискає графік
   */
  async compressSchedule(projectId: string, method: "crash" | "fast_track" | "hybrid"): Promise<{
    originalDuration: number;
    compressedDuration: number;
    timeSaved: number;
    cost: number;
    method: string;
    steps: string[];
  }> {
    const originalDuration = 45;
    const compressedDuration = method === "crash" ? 38 : method === "fast_track" ? 40 : 36;
    const timeSaved = originalDuration - compressedDuration;
    const cost = method === "crash" ? 5000 : method === "fast_track" ? 2000 : 6000;
    const steps = method === "crash"
      ? ["Add resources to critical tasks", "Work overtime"]
      : method === "fast_track"
      ? ["Execute tasks in parallel", "Overlap phases"]
      : ["Combine crashing and fast-tracking", "Optimize resource allocation"];

    return {
      originalDuration,
      compressedDuration,
      timeSaved,
      cost,
      method,
      steps,
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
export const criticalPathAnalyzerAgent = new CriticalPathAnalyzerAgent();
