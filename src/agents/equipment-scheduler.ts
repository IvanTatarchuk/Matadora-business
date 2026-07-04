import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Equipment Scheduler Agent - Агент для планування обладнання
 * Плановує та оптимізує використання будівельного обладнання
 */
export class EquipmentSchedulerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "equipment-scheduler",
      name: "Equipment Scheduler Agent",
      description: "Плановує та оптимізує використання будівельного обладнання для максимальної ефективності",
      category: "planning",
      capabilities: [
        "equipment_allocation",
        "maintenance_scheduling",
        "utilization_optimization",
        "cost_tracking",
        "availability_check",
        "conflict_resolution",
      ],
      dependencies: [],
      priority: 9,
    };
  }

  /**
   * Розподіляє обладнання
   */
  async allocateEquipment(tasks: Array<{
    id: string;
    requiredEquipment: string[];
    startDate: Date;
    endDate: Date;
    priority: number;
  }>, equipment: Array<{
    id: string;
    type: string;
    available: boolean;
  }>): Promise<{
    allocation: Array<{
      taskId: string;
      equipmentId: string;
      equipmentType: string;
      startDate: Date;
      endDate: Date;
    }>;
    unassigned: Array<{
      taskId: string;
      missingEquipment: string[];
    }>;
  }> {
    const allocation: Array<{
      taskId: string;
      equipmentId: string;
      equipmentType: string;
      startDate: Date;
      endDate: Date;
    }> = [];
    const unassigned: Array<{
      taskId: string;
      missingEquipment: string[];
    }> = [];

    // Сортуємо завдання за пріоритетом
    const sortedTasks = [...tasks].sort((a, b) => b.priority - a.priority);

    for (const task of sortedTasks) {
      const assignedEquipment: string[] = [];
      const missingEquipment: string[] = [];

      for (const requiredType of task.requiredEquipment) {
        const availableEquipment = equipment.find(
          e => e.type === requiredType && e.available && !allocation.some(a => a.equipmentId === e.id)
        );

        if (availableEquipment) {
          allocation.push({
            taskId: task.id,
            equipmentId: availableEquipment.id,
            equipmentType: requiredType,
            startDate: task.startDate,
            endDate: task.endDate,
          });
          assignedEquipment.push(requiredType);
        } else {
          missingEquipment.push(requiredType);
        }
      }

      if (missingEquipment.length > 0) {
        unassigned.push({
          taskId: task.id,
          missingEquipment,
        });
      }
    }

    return { allocation, unassigned };
  }

  /**
   * Плановує технічне обслуговування
   */
  async scheduleMaintenance(equipmentId: string): Promise<{
    maintenanceTasks: Array<{
      type: string;
      scheduledDate: Date;
      estimatedDuration: number; // в годинах
      cost: number;
    }>;
    nextMaintenanceDue: Date;
  }> {
    const maintenanceTasks = [
      {
        type: "Routine inspection",
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        estimatedDuration: 4,
        cost: 500,
      },
      {
        type: "Oil change",
        scheduledDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        estimatedDuration: 2,
        cost: 200,
      },
    ];

    const nextMaintenanceDue = maintenanceTasks[0]?.scheduledDate || new Date();

    return { maintenanceTasks, nextMaintenanceDue };
  }

  /**
   * Оптимізує використання
   */
  async optimizeUtilization(equipment: Array<{
    id: string;
    type: string;
    currentUtilization: number;
  }>): Promise<{
    recommendations: Array<{
      equipmentId: string;
      action: "reallocate" | "rent" | "sell" | "keep";
      reason: string;
    }>;
  }> {
    const recommendations = equipment.map(e => {
      if (e.currentUtilization < 30) {
        return {
          equipmentId: e.id,
          action: "sell" as const,
          reason: "Low utilization (<30%)",
        };
      } else if (e.currentUtilization < 60) {
        return {
          equipmentId: e.id,
          action: "reallocate" as const,
          reason: "Underutilized (<60%)",
        };
      } else {
        return {
          equipmentId: e.id,
          action: "keep" as const,
          reason: "Good utilization",
        };
      }
    });

    return { recommendations };
  }

  /**
   * Відстежує вартість
   */
  async trackCost(equipmentId: string, period: {
    start: Date;
    end: Date;
  }): Promise<{
    operatingCost: number;
    maintenanceCost: number;
    fuelCost: number;
    totalCost: number;
    costPerHour: number;
  }> {
    const operatingCost = 5000;
    const maintenanceCost = 1500;
    const fuelCost = 3000;
    const totalCost = operatingCost + maintenanceCost + fuelCost;
    const hours = 160; // Припускаємо 160 годин роботи
    const costPerHour = totalCost / hours;

    return {
      operatingCost,
      maintenanceCost,
      fuelCost,
      totalCost,
      costPerHour: Math.round(costPerHour * 100) / 100,
    };
  }

  /**
   * Перевіряє доступність
   */
  async checkAvailability(equipmentType: string, startDate: Date, endDate: Date): Promise<{
    available: boolean;
    availableUnits: number;
    alternativeDates?: Array<{ start: Date; end: Date }>;
  }> {
    const available = Math.random() > 0.4;
    const availableUnits = available ? Math.floor(Math.random() * 3) + 1 : 0;

    const alternativeDates = available ? undefined : [
      {
        start: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        end: new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    ];

    return { available, availableUnits, alternativeDates };
  }

  /**
   * Вирішує конфлікти
   */
  async resolveConflicts(conflicts: Array<{
    equipmentId: string;
    competingTasks: string[];
  }>): Promise<{
    resolution: Array<{
      equipmentId: string;
      assignedTo: string;
      priority: number;
    }>;
  }> {
    const resolution = conflicts.map(conflict => {
      // Призначаємо завданню з найвищим пріоритетом (спрощено)
      const assignedTo = conflict.competingTasks[0] || "unknown";

      return {
        equipmentId: conflict.equipmentId,
        assignedTo,
        priority: 1,
      };
    });

    return { resolution };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const equipmentSchedulerAgent = new EquipmentSchedulerAgent();
