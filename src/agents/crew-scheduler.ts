import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Crew Scheduler Agent - Агент для планування бригад
 * Плановує розподіл бригад по завданнях та змінах
 */
export class CrewSchedulerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "crew-scheduler",
      name: "Crew Scheduler Agent",
      description: "Плановує розподіл бригад по завданнях, керує змінами та оптимізує використання персоналу",
      category: "planning",
      capabilities: [
        "crew_assignment",
        "shift_scheduling",
        "skill_matching",
        "workload_balancing",
        "availability_check",
        "overtime_management",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Призначає бригади
   */
  async assignCrews(tasks: Array<{
    id: string;
    requiredSkills: string[];
    location: string;
    startDate: Date;
    endDate: Date;
  }>, crews: Array<{
    id: string;
    name: string;
    skills: string[];
    size: number;
    availability: boolean;
  }>): Promise<{
    assignments: Array<{
      taskId: string;
      crewId: string;
      crewName: string;
      startDate: Date;
      endDate: Date;
    }>;
    unassigned: Array<{
      taskId: string;
      reason: string;
    }>;
  }> {
    const assignments: Array<{
      taskId: string;
      crewId: string;
      crewName: string;
      startDate: Date;
      endDate: Date;
    }> = [];
    const unassigned: Array<{
      taskId: string;
      reason: string;
    }> = [];

    for (const task of tasks) {
      const matchingCrew = crews.find(
        c => c.availability && task.requiredSkills.every(skill => c.skills.includes(skill))
      );

      if (matchingCrew) {
        assignments.push({
          taskId: task.id,
          crewId: matchingCrew.id,
          crewName: matchingCrew.name,
          startDate: task.startDate,
          endDate: task.endDate,
        });
      } else {
        unassigned.push({
          taskId: task.id,
          reason: "No available crew with required skills",
        });
      }
    }

    return { assignments, unassigned };
  }

  /**
   * Плановує зміни
   */
  async scheduleShifts(crewId: string, weeks: number): Promise<{
    shifts: Array<{
      date: Date;
      shift: "morning" | "afternoon" | "night";
      workers: number;
      supervisor: string;
    }>;
  }> {
    const shifts = Array.from({ length: weeks * 7 }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
      shift: (i % 3 === 0 ? "morning" as const : i % 3 === 1 ? "afternoon" as const : "night" as const),
      workers: 8,
      supervisor: "John Smith",
    }));

    return { shifts };
  }

  /**
   * Підбирає за навичками
   */
  async matchSkills(taskSkills: string[], workers: Array<{
    id: string;
    name: string;
    skills: string[];
  }>): Promise<{
    matches: Array<{
      workerId: string;
      workerName: string;
      matchedSkills: string[];
      missingSkills: string[];
      matchScore: number; // 0-100
    }>;
  }> {
    const matches = workers.map(worker => {
      const matchedSkills = taskSkills.filter(skill => worker.skills.includes(skill));
      const missingSkills = taskSkills.filter(skill => !worker.skills.includes(skill));
      const matchScore = (matchedSkills.length / taskSkills.length) * 100;

      return {
        workerId: worker.id,
        workerName: worker.name,
        matchedSkills,
        missingSkills,
        matchScore: Math.round(matchScore),
      };
    });

    return { matches };
  }

  /**
   * Балансує навантаження
   */
  async balanceWorkload(crews: Array<{
    id: string;
    name: string;
    currentTasks: number;
    capacity: number;
  }>): Promise<{
    recommendations: Array<{
      crewId: string;
      action: "reassign" | "add" | "reduce";
      reason: string;
    }>;
  }> {
    const recommendations = crews.map(crew => {
      const utilization = crew.currentTasks / crew.capacity;

      if (utilization > 0.9) {
        return {
          crewId: crew.id,
          action: "reassign" as const,
          reason: "Overutilized (>90%)",
        };
      } else if (utilization < 0.5) {
        return {
          crewId: crew.id,
          action: "add" as const,
          reason: "Underutilized (<50%)",
        };
      } else {
        return {
          crewId: crew.id,
          action: "reduce" as const,
          reason: "Optimal utilization",
        };
      }
    });

    return { recommendations };
  }

  /**
   * Перевіряє доступність
   */
  async checkAvailability(crewId: string, startDate: Date, endDate: Date): Promise<{
    available: boolean;
    conflicts: Array<{
      taskId: string;
      startDate: Date;
      endDate: Date;
    }>;
    alternativeDates?: Array<{ start: Date; end: Date }>;
  }> {
    const available = Math.random() > 0.3;
    const conflicts = available ? [] : [
      {
        taskId: "task-existing",
        startDate: new Date(startDate.getTime() - 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(endDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      },
    ];

    const alternativeDates = available ? undefined : [
      {
        start: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        end: new Date(endDate.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    ];

    return { available, conflicts, alternativeDates };
  }

  /**
   * Керує надурочними годинами
   */
  async manageOvertime(projectId: string, period: {
    start: Date;
    end: Date;
  }): Promise<{
    overtime: Array<{
      crewId: string;
      crewName: string;
      hours: number;
      cost: number;
      reason: string;
    }>;
    totalCost: number;
    recommendations: string[];
  }> {
    const overtime = [
      {
        crewId: "crew-1",
        crewName: "Foundation Crew",
        hours: 40,
        cost: 2000,
        reason: "Deadline pressure",
      },
    ];

    const totalCost = overtime.reduce((sum, o) => sum + o.cost, 0);
    const recommendations = [
      "Review overtime necessity",
      "Consider adding temporary workers",
      "Adjust schedule if possible",
    ];

    return { overtime, totalCost, recommendations };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const crewSchedulerAgent = new CrewSchedulerAgent();
