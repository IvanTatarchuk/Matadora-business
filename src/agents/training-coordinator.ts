import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Training Coordinator Agent - Агент для координації навчання
 * Керує навчанням працівників та сертифікацією
 */
export class TrainingCoordinatorAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "training-coordinator",
      name: "Training Coordinator Agent",
      description: "Керує навчанням працівників, відстежує сертифікації та планує професійний розвиток",
      category: "planning",
      capabilities: [
        "training_scheduling",
        "certification_tracking",
        "skill_gap_analysis",
        "curriculum_planning",
        "progress_monitoring",
        "compliance_check",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Плановує навчання
   */
  async scheduleTraining(projectId: string): Promise<{
    trainings: Array<{
      id: string;
      title: string;
      instructor: string;
      startDate: Date;
      endDate: Date;
      participants: string[];
      location: string;
    }>;
  }> {
    const trainings = [
      {
        id: "tr-1",
        title: "Safety Training Level 1",
        instructor: "Safety Officer",
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        participants: ["w-1", "w-2", "w-3"],
        location: "Site Office",
      },
      {
        id: "tr-2",
        title: "Electrical Safety",
        instructor: "Electrical Supervisor",
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        participants: ["w-4", "w-5"],
        location: "Training Center",
      },
    ];

    return { trainings };
  }

  /**
   * Відстежує сертифікації
   */
  async trackCertifications(workerId: string): Promise<{
    certifications: Array<{
      name: string;
      issuedDate: Date;
      expiryDate: Date;
      status: "valid" | "expiring" | "expired";
      issuer: string;
    }>;
  }> {
    const certifications = [
      {
        name: "OSHA 30",
        issuedDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: "valid" as const,
        issuer: "OSHA",
      },
      {
        name: "Electrical License",
        issuedDate: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "expiring" as const,
        issuer: "State Board",
      },
    ];

    return { certifications };
  }

  /**
   * Аналізує розрив навичок
   */
  async analyzeSkillGaps(projectId: string): Promise<{
    gaps: Array<{
      workerId: string;
      workerName: string;
      requiredSkill: string;
      currentLevel: number;
      requiredLevel: number;
      gap: number;
      priority: "high" | "medium" | "low";
    }>;
    recommendedTrainings: Array<{
      skill: string;
      training: string;
      duration: number; // в годинах
      cost: number;
    }>;
  }> {
    const gaps = [
      {
        workerId: "w-1",
        workerName: "John Smith",
        requiredSkill: "Advanced electrical",
        currentLevel: 60,
        requiredLevel: 85,
        gap: 25,
        priority: "high" as const,
      },
      {
        workerId: "w-2",
        workerName: "Jane Doe",
        requiredSkill: "Safety protocols",
        currentLevel: 75,
        requiredLevel: 90,
        gap: 15,
        priority: "medium" as const,
      },
    ];

    const recommendedTrainings = [
      {
        skill: "Advanced electrical",
        training: "Advanced Electrical Techniques Course",
        duration: 40,
        cost: 1500,
      },
      {
        skill: "Safety protocols",
        training: "Advanced Safety Training",
        duration: 16,
        cost: 500,
      },
    ];

    return { gaps, recommendedTrainings };
  }

  /**
   * Плановує навчальну програму
   */
  async planCurriculum(role: string): Promise<{
    modules: Array<{
      title: string;
      duration: number; // в годинах
      prerequisites: string[];
      objectives: string[];
    }>;
    totalDuration: number;
    estimatedCost: number;
  }> {
    const modules = [
      {
        title: "Introduction to Construction Safety",
        duration: 8,
        prerequisites: [],
        objectives: ["Understand basic safety principles", "Identify common hazards"],
      },
      {
        title: "Equipment Operation",
        duration: 16,
        prerequisites: ["Introduction to Construction Safety"],
        objectives: ["Safe equipment operation", "Maintenance procedures"],
      },
      {
        title: "Advanced Techniques",
        duration: 24,
        prerequisites: ["Equipment Operation"],
        objectives: ["Advanced methods", "Problem-solving"],
      },
    ];

    const totalDuration = modules.reduce((sum, m) => sum + m.duration, 0);
    const estimatedCost = totalDuration * 50; // $50 за годину

    return { modules, totalDuration, estimatedCost };
  }

  /**
   * Моніторить прогрес
   */
  async monitorProgress(trainingId: string): Promise<{
    participants: Array<{
      workerId: string;
      workerName: string;
      progress: number; // 0-100
      completedModules: string[];
      assessmentScore?: number;
    }>;
    overallCompletion: number;
  }> {
    const participants = [
      {
        workerId: "w-1",
        workerName: "John Smith",
        progress: 75,
        completedModules: ["Module 1", "Module 2"],
        assessmentScore: 85,
      },
      {
        workerId: "w-2",
        workerName: "Jane Doe",
        progress: 50,
        completedModules: ["Module 1"],
      },
    ];

    const overallCompletion = participants.reduce((sum, p) => sum + p.progress, 0) / participants.length;

    return { participants, overallCompletion: Math.round(overallCompletion) };
  }

  /**
   * Перевіряє відповідність
   */
  async checkCompliance(projectId: string): Promise<{
    compliant: boolean;
    requiredTrainings: Array<{
      training: string;
      requiredBy: Date;
      completed: boolean;
      workersCompleted: number;
      totalWorkers: number;
    }>;
    recommendations: string[];
  }> {
    const requiredTrainings = [
      {
        training: "OSHA 30",
        requiredBy: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        completed: true,
        workersCompleted: 15,
        totalWorkers: 15,
      },
      {
        training: "First Aid",
        requiredBy: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        completed: false,
        workersCompleted: 10,
        totalWorkers: 15,
      },
    ];

    const compliant = requiredTrainings.every(t => t.completed);
    const recommendations = [
      "Schedule First Aid training for remaining workers",
      "Set up reminder system for expiring certifications",
    ];

    return { compliant, requiredTrainings, recommendations };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const trainingCoordinatorAgent = new TrainingCoordinatorAgent();
