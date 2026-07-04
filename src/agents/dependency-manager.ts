import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Dependency Manager Agent - Агент для управління залежностями
 * Керує залежностями між завданнями та ресурсами
 */
export class DependencyManagerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "dependency-manager",
      name: "Dependency Manager Agent",
      description: "Керує залежностями між завданнями, виявляє блокування та оптимізує послідовність виконання",
      category: "planning",
      capabilities: [
        "dependency_mapping",
        "blockage_detection",
        "critical_path_analysis",
        "dependency_resolution",
        "sequence_optimization",
        "impact_analysis",
      ],
      dependencies: [],
      priority: 1,
    };
  }

  /**
   * Карта залежностей
   */
  async mapDependencies(projectId: string): Promise<{
    dependencies: Array<{
      from: string;
      to: string;
      type: "finish_to_start" | "start_to_start" | "finish_to_finish" | "start_to_finish";
      lag: number; // в днях
    }>;
    graph: {
      nodes: string[];
      edges: Array<{ from: string; to: string }>;
    };
  }> {
    const dependencies = [
      {
        from: "task-1",
        to: "task-2",
        type: "finish_to_start" as const,
        lag: 0,
      },
      {
        from: "task-2",
        to: "task-3",
        type: "finish_to_start" as const,
        lag: 2,
      },
      {
        from: "task-1",
        to: "task-4",
        type: "start_to_start" as const,
        lag: 0,
      },
    ];

    const nodes = Array.from(new Set(dependencies.flatMap(d => [d.from, d.to])));
    const edges = dependencies.map(d => ({ from: d.from, to: d.to }));

    return { dependencies, graph: { nodes, edges } };
  }

  /**
   * Виявляє блокування
   */
  async detectBlockages(projectId: string): Promise<{
    blockedTasks: Array<{
      taskId: string;
      blockedBy: string[];
      reason: string;
      estimatedDelay: number; // в днях
    }>;
    blockingTasks: Array<{
      taskId: string;
      blocking: string[];
      impact: "low" | "medium" | "high";
    }>;
  }> {
    const blockedTasks = [
      {
        taskId: "task-3",
        blockedBy: ["task-2"],
        reason: "Waiting for structure completion",
        estimatedDelay: 5,
      },
      {
        taskId: "task-5",
        blockedBy: ["task-2", "task-4"],
        reason: "Waiting for structure and electrical",
        estimatedDelay: 7,
      },
    ];

    const blockingTasks = [
      {
        taskId: "task-2",
        blocking: ["task-3", "task-5"],
        impact: "high" as const,
      },
    ];

    return { blockedTasks, blockingTasks };
  }

  /**
   * Аналізує критичний шлях
   */
  async analyzeCriticalPath(projectId: string): Promise<{
    criticalPath: string[];
    criticalTasks: Array<{
      taskId: string;
      earliestStart: number;
      latestStart: number;
      slack: number;
    }>;
    projectDuration: number;
  }> {
    const criticalPath = ["task-1", "task-2", "task-3", "task-6"];
    const criticalTasks = [
      {
        taskId: "task-1",
        earliestStart: 0,
        latestStart: 0,
        slack: 0,
      },
      {
        taskId: "task-2",
        earliestStart: 10,
        latestStart: 10,
        slack: 0,
      },
      {
        taskId: "task-3",
        earliestStart: 20,
        latestStart: 20,
        slack: 0,
      },
    ];
    const projectDuration = 45;

    return { criticalPath, criticalTasks, projectDuration };
  }

  /**
   * Вирішує залежності
   */
  async resolveDependencies(blockages: Array<{
    taskId: string;
    blockedBy: string[];
  }>): Promise<{
    resolutions: Array<{
      taskId: string;
      action: "parallelize" | "resequence" | "add_buffer" | "remove_dependency";
      details: string;
      estimatedImpact: number; // в днях
    }>;
  }> {
    const resolutions = blockages.map(blockage => ({
      taskId: blockage.taskId,
      action: "parallelize" as const,
      details: "Can start partial work in parallel with blocking task",
      estimatedImpact: -3,
    }));

    return { resolutions };
  }

  /**
   * Оптимізує послідовність
   */
  async optimizeSequence(tasks: Array<{
    id: string;
    duration: number;
    dependencies: string[];
  }>): Promise<{
    optimizedSequence: string[];
    savings: number; // в днях
    changes: Array<{
      taskId: string;
      originalPosition: number;
      newPosition: number;
      reason: string;
    }>;
  }> {
    const optimizedSequence = tasks.map(t => t.id);
    const savings = 5;
    const changes = [
      {
        taskId: "task-4",
        originalPosition: 3,
        newPosition: 2,
        reason: "Can start earlier with partial dependency",
      },
    ];

    return { optimizedSequence, savings, changes };
  }

  /**
   * Аналізує вплив змін
   */
  async analyzeImpact(taskId: string, delay: number): Promise<{
    affectedTasks: Array<{
      taskId: string;
      delay: number;
      newEndDate: Date;
    }>;
    projectDelay: number;
    criticalPathAffected: boolean;
    recommendations: string[];
  }> {
    const affectedTasks = [
      {
        taskId: "task-2",
        delay: delay,
        newEndDate: new Date(Date.now() + (10 + delay) * 24 * 60 * 60 * 1000),
      },
      {
        taskId: "task-3",
        delay: delay,
        newEndDate: new Date(Date.now() + (20 + delay) * 24 * 60 * 60 * 1000),
      },
    ];

    const projectDelay = delay;
    const criticalPathAffected = true;
    const recommendations = [
      "Accelerate subsequent tasks",
      "Add resources to critical path",
      "Consider fast-tracking",
    ];

    return { affectedTasks, projectDelay, criticalPathAffected, recommendations };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const dependencyManagerAgent = new DependencyManagerAgent();
