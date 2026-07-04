import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Schedule Optimizer Agent - Агент для оптимізації графіків
 * Оптимізує графіки проектів на основі обмежень та залежностей
 */
export class ScheduleOptimizerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "schedule-optimizer",
      name: "Schedule Optimizer Agent",
      description: "Оптимізує графіки проектів на основі обмежень, залежностей та доступності ресурсів",
      category: "planning",
      capabilities: [
        "gantt_optimization",
        "resource_allocation",
        "deadline_management",
        "dependency_resolution",
        "critical_path_analysis",
        "schedule_compression",
      ],
      dependencies: [],
      priority: 85,
    };
  }

  /**
   * Оптимізує графік проекту
   */
  async optimizeSchedule(projectData: {
    tasks: Array<{
      id: string;
      name: string;
      duration: number;
      dependencies: string[];
      resources: string[];
    }>;
    resources: Array<{
      id: string;
      name: string;
      capacity: number;
    }>;
    deadline?: Date;
  }): Promise<{
    optimizedTasks: Array<{
      id: string;
      startDate: Date;
      endDate: Date;
      resources: string[];
    }>;
    criticalPath: string[];
    totalDuration: number;
  }> {
    // Розрахунок найбільш ранніх дат початку (ES - Early Start)
    const taskMap = new Map(projectData.tasks.map(t => [t.id, t]));
    const es = new Map<string, number>();
    const ef = new Map<string, number>();

    // Forward pass
    const sortedTasks = this.topologicalSort(projectData.tasks);
    for (const task of sortedTasks) {
      const maxEF = Math.max(0, ...task.dependencies.map(depId => ef.get(depId) || 0));
      es.set(task.id, maxEF);
      ef.set(task.id, maxEF + task.duration);
    }

    // Backward pass для LS (Late Start) та LF (Late Finish)
    const ls = new Map<string, number>();
    const lf = new Map<string, number>();
    const projectEnd = Math.max(...Array.from(ef.values()));

    for (const task of [...sortedTasks].reverse()) {
      const successors = projectData.tasks.filter(t => t.dependencies.includes(task.id));
      if (successors.length === 0) {
        lf.set(task.id, projectEnd);
      } else {
        const minLS = Math.min(...successors.map(s => ls.get(s.id) || projectEnd));
        lf.set(task.id, minLS);
      }
      ls.set(task.id, lf.get(task.id)! - task.duration);
    }

    // Визначення критичного шляху
    const criticalPath = projectData.tasks.filter(t => es.get(t.id) === ls.get(t.id)).map(t => t.id);

    // Оптимізовані завдання з датами
    const optimizedTasks = projectData.tasks.map(task => ({
      id: task.id,
      startDate: new Date(Date.now() + (es.get(task.id) || 0) * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + (ef.get(task.id) || 0) * 24 * 60 * 60 * 1000),
      resources: task.resources,
    }));

    return {
      optimizedTasks,
      criticalPath,
      totalDuration: projectEnd,
    };
  }

  /**
   * Сортує завдання топологічно для обробки залежностей
   */
  private topologicalSort(tasks: Array<{ id: string; duration: number; dependencies: string[] }>): Array<{ id: string; duration: number; dependencies: string[] }> {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const result: Array<{ id: string; duration: number; dependencies: string[] }> = [];

    const visit = (taskId: string) => {
      if (temp.has(taskId)) {
        throw new Error("Cycle detected in task dependencies");
      }
      if (visited.has(taskId)) return;

      temp.add(taskId);
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        for (const depId of task.dependencies) {
          visit(depId);
        }
      }
      temp.delete(taskId);
      visited.add(taskId);
      result.push(task!);
    };

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        visit(task.id);
      }
    }

    return result;
  }

  /**
   * Розподіляє ресурси між завданнями
   */
  async allocateResources(schedule: {
    tasks: Array<{ id: string; resources: string[]; startDate: Date; endDate: Date }>;
    resources: Array<{ id: string; capacity: number }>;
  }): Promise<{
    allocations: Array<{ taskId: string; resourceId: string; amount: number }>;
    conflicts: Array<{ taskId: string; resourceId: string }>;
  }> {
    const allocations: Array<{ taskId: string; resourceId: string; amount: number }> = [];
    const conflicts: Array<{ taskId: string; resourceId: string }> = [];

    const resourceUsage = new Map<string, number>();

    for (const task of schedule.tasks) {
      for (const resourceId of task.resources) {
        const currentUsage = resourceUsage.get(resourceId) || 0;
        const resource = schedule.resources.find(r => r.id === resourceId);

        if (resource && currentUsage >= resource.capacity) {
          conflicts.push({ taskId: task.id, resourceId });
        } else {
          allocations.push({ taskId: task.id, resourceId, amount: 1 });
          resourceUsage.set(resourceId, currentUsage + 1);
        }
      }
    }

    return { allocations, conflicts };
  }

  /**
   * Стискає графік для скорочення терміну
   */
  async compressSchedule(schedule: {
    tasks: Array<{ id: string; duration: number; canCrash: boolean }>;
    targetDuration: number;
  }): Promise<{
    compressedTasks: Array<{ id: string; newDuration: number }>;
    additionalCost: number;
  }> {
    const currentDuration = Math.max(...schedule.tasks.map(t => t.duration));
    const compressionNeeded = currentDuration - schedule.targetDuration;

    if (compressionNeeded <= 0) {
      return {
        compressedTasks: schedule.tasks.map(t => ({ id: t.id, newDuration: t.duration })),
        additionalCost: 0,
      };
    }

    const compressedTasks: Array<{ id: string; newDuration: number }> = [];
    let additionalCost = 0;

    // Стиска критичні завдання
    const crashableTasks = schedule.tasks.filter(t => t.canCrash);
    const compressionPerTask = compressionNeeded / crashableTasks.length;

    for (const task of schedule.tasks) {
      if (task.canCrash) {
        const newDuration = Math.max(task.duration * 0.7, task.duration - compressionPerTask);
        compressedTasks.push({ id: task.id, newDuration });
        additionalCost += (task.duration - newDuration) * 100; // $100 за день стиснення
      } else {
        compressedTasks.push({ id: task.id, newDuration: task.duration });
      }
    }

    return { compressedTasks, additionalCost };
  }

  /**
   * Аналізує критичний шлях
   */
  async analyzeCriticalPath(tasks: Array<{
    id: string;
    name: string;
    duration: number;
    dependencies: string[];
    resources: string[];
  }>): Promise<{
    path: string[];
    totalDuration: number;
    slack: Map<string, number>;
  }> {
    const { criticalPath } = await this.optimizeSchedule({ tasks, resources: [] });
    const totalDuration = criticalPath.length * 5; // Припускаємо середню тривалість 5 днів

    // Розрахунок slack (резерву часу) для кожного завдання
    const slack = new Map<string, number>();
    for (const task of tasks) {
      if (criticalPath.includes(task.id)) {
        slack.set(task.id, 0);
      } else {
        slack.set(task.id, 3); // Приклад: 3 дні резерву
      }
    }

    return {
      path: criticalPath,
      totalDuration,
      slack,
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
export const scheduleOptimizerAgent = new ScheduleOptimizerAgent();
