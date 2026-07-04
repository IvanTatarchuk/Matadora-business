import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Resource Allocator Agent - Агент для розподілу ресурсів
 * Оптимізує розподіл ресурсів між проектами та завданнями
 */
export class ResourceAllocatorAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "resource-allocator",
      name: "Resource Allocator Agent",
      description: "Оптимізує розподіл ресурсів між проектами та завданнями для максимальної ефективності",
      category: "planning",
      capabilities: [
        "resource_optimization",
        "capacity_planning",
        "load_balancing",
        "conflict_resolution",
        "resource_forecasting",
        "utilization_tracking",
      ],
      dependencies: [],
      priority: 40,
    };
  }

  /**
   * Оптимізує розподіл ресурсів
   */
  async optimizeResources(resources: {
    workers: Array<{ id: string; skills: string[]; availability: number }>;
    equipment: Array<{ id: string; type: string; availability: number }>;
    tasks: Array<{ id: string; requiredSkills: string[]; requiredEquipment: string[]; priority: number }>;
  }): Promise<{
    allocation: Array<{
      taskId: string;
      workers: string[];
      equipment: string[];
    }>;
    utilization: {
      workers: number;
      equipment: number;
    };
  }> {
    const allocation: Array<{
      taskId: string;
      workers: string[];
      equipment: string[];
    }> = [];

    // Сортуємо завдання за пріоритетом
    const sortedTasks = [...resources.tasks].sort((a, b) => b.priority - a.priority);

    for (const task of sortedTasks) {
      const assignedWorkers: string[] = [];
      const assignedEquipment: string[] = [];

      // Призначення працівників
      for (const skill of task.requiredSkills) {
        const availableWorker = resources.workers.find(
          w => w.skills.includes(skill) && w.availability > 0 && !assignedWorkers.includes(w.id)
        );
        if (availableWorker) {
          assignedWorkers.push(availableWorker.id);
        }
      }

      // Призначення обладнання
      for (const equipmentType of task.requiredEquipment) {
        const availableEquipment = resources.equipment.find(
          e => e.type === equipmentType && e.availability > 0 && !assignedEquipment.includes(e.id)
        );
        if (availableEquipment) {
          assignedEquipment.push(availableEquipment.id);
        }
      }

      allocation.push({
        taskId: task.id,
        workers: assignedWorkers,
        equipment: assignedEquipment,
      });
    }

    const utilization = {
      workers: resources.workers.filter(w => allocation.some(a => a.workers.includes(w.id))).length / resources.workers.length,
      equipment: resources.equipment.filter(e => allocation.some(a => a.equipment.includes(e.id))).length / resources.equipment.length,
    };

    return { allocation, utilization };
  }

  /**
   * Планирує потужність
   */
  async planCapacity(projectId: string, horizon: number): Promise<{
    requiredResources: {
      workers: number;
      equipment: number;
      materials: number;
    };
    availableResources: {
      workers: number;
      equipment: number;
      materials: number;
    };
    gaps: {
      workers: number;
      equipment: number;
      materials: number;
    };
  }> {
    const requiredResources = {
      workers: 25,
      equipment: 10,
      materials: 1000,
    };

    const availableResources = {
      workers: 20,
      equipment: 8,
      materials: 800,
    };

    const gaps = {
      workers: requiredResources.workers - availableResources.workers,
      equipment: requiredResources.equipment - availableResources.equipment,
      materials: requiredResources.materials - availableResources.materials,
    };

    return { requiredResources, availableResources, gaps };
  }

  /**
   * Балансує навантаження
   */
  async balanceLoad(resources: {
    workers: Array<{ id: string; currentLoad: number; maxLoad: number }>;
  }): Promise<{
    recommendations: Array<{
      workerId: string;
      action: "reassign" | "add" | "reduce";
      reason: string;
    }>;
  }> {
    const recommendations: Array<{
      workerId: string;
      action: "reassign" | "add" | "reduce";
      reason: string;
    }> = [];

    for (const worker of resources.workers) {
      const utilization = worker.currentLoad / worker.maxLoad;

      if (utilization > 0.9) {
        recommendations.push({
          workerId: worker.id,
          action: "reassign",
          reason: "Worker is overutilized (>90%)",
        });
      } else if (utilization < 0.5) {
        recommendations.push({
          workerId: worker.id,
          action: "add",
          reason: "Worker is underutilized (<50%)",
        });
      }
    }

    return { recommendations };
  }

  /**
   * Вирішує конфлікти ресурсів
   */
  async resolveConflicts(conflicts: Array<{
    resourceType: string;
    resourceId: string;
    competingTasks: string[];
  }>): Promise<{
    resolution: Array<{
      taskId: string;
      assignedTo: string;
      priority: number;
    }>;
  }> {
    const resolution = conflicts.map(conflict => {
      // Призначаємо завданню з найвищим пріоритетом
      const assignedTask = conflict.competingTasks[0] || "unknown"; // Спрощено з fallback

      return {
        taskId: assignedTask,
        assignedTo: conflict.resourceId,
        priority: 1,
      };
    });

    return { resolution };
  }

  /**
   * Прогнозує потреби в ресурсах
   */
  async forecastResources(projectId: string, weeks: number): Promise<{
    forecast: Array<{
      week: number;
      workers: number;
      equipment: number;
      materials: number;
    }>;
  }> {
    const forecast = Array.from({ length: weeks }, (_, i) => ({
      week: i + 1,
      workers: 20 + Math.floor(Math.random() * 10),
      equipment: 8 + Math.floor(Math.random() * 5),
      materials: 800 + Math.floor(Math.random() * 400),
    }));

    return { forecast };
  }

  /**
   * Відстежує використання ресурсів
   */
  async trackUtilization(projectId: string): Promise<{
    workers: Array<{
      id: string;
      name: string;
      utilization: number;
      tasksCompleted: number;
    }>;
    equipment: Array<{
      id: string;
      type: string;
      utilization: number;
      operatingHours: number;
    }>;
  }> {
    const workers = [
      {
        id: "w-1",
        name: "John Smith",
        utilization: 0.85,
        tasksCompleted: 15,
      },
      {
        id: "w-2",
        name: "Jane Doe",
        utilization: 0.72,
        tasksCompleted: 12,
      },
    ];

    const equipment = [
      {
        id: "e-1",
        type: "Excavator",
        utilization: 0.65,
        operatingHours: 40,
      },
      {
        id: "e-2",
        type: "Crane",
        utilization: 0.78,
        operatingHours: 48,
      },
    ];

    return { workers, equipment };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const resourceAllocatorAgent = new ResourceAllocatorAgent();
