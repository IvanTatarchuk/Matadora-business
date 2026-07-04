import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Worker Performance Agent - Агент для оцінки продуктивності працівників
 * Оцінює продуктивність працівників та надає рекомендації для покращення
 */
export class WorkerPerformanceAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "worker-performance",
      name: "Worker Performance Agent",
      description: "Оцінює продуктивність працівників, відстежує KPI та надає рекомендації для покращення",
      category: "planning",
      capabilities: [
        "performance_tracking",
        "kpi_monitoring",
        "productivity_analysis",
        "skill_assessment",
        "recommendation",
        "incentive_calculation",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Відстежує продуктивність
   */
  async trackPerformance(workerId: string, period: {
    start: Date;
    end: Date;
  }): Promise<{
    metrics: {
      tasksCompleted: number;
      tasksOnTime: number;
      qualityScore: number; // 0-100
      efficiency: number; // 0-100
    };
    trend: "improving" | "stable" | "declining";
  }> {
    const metrics = {
      tasksCompleted: 25,
      tasksOnTime: 22,
      qualityScore: 88,
      efficiency: 85,
    };

    const trend = "improving" as const;

    return { metrics, trend };
  }

  /**
   * Моніторить KPI
   */
  async monitorKPIs(projectId: string): Promise<{
    kpis: Array<{
      workerId: string;
      workerName: string;
      kpi: string;
      target: number;
      actual: number;
      variance: number;
      status: "on_track" | "at_risk" | "off_track";
    }>;
  }> {
    const kpis = [
      {
        workerId: "w-1",
        workerName: "John Smith",
        kpi: "Tasks per week",
        target: 10,
        actual: 12,
        variance: 2,
        status: "on_track" as const,
      },
      {
        workerId: "w-2",
        workerName: "Jane Doe",
        kpi: "Quality score",
        target: 90,
        actual: 85,
        variance: -5,
        status: "at_risk" as const,
      },
    ];

    return { kpis };
  }

  /**
   * Аналізує продуктивність
   */
  async analyzeProductivity(projectId: string): Promise<{
    overallProductivity: number; // 0-100
    byRole: Record<string, number>;
    topPerformers: Array<{ workerId: string; name: string; score: number }>;
    areasForImprovement: string[];
  }> {
    const overallProductivity = 82;
    const byRole = {
      carpenter: 85,
      electrician: 80,
      plumber: 78,
    };

    const topPerformers = [
      { workerId: "w-1", name: "John Smith", score: 92 },
      { workerId: "w-3", name: "Bob Johnson", score: 88 },
    ];

    const areasForImprovement = [
      "Plumbing productivity below target",
      "Quality consistency needs improvement",
    ];

    return { overallProductivity, byRole, topPerformers, areasForImprovement };
  }

  /**
   * Оцінює навички
   */
  async assessSkills(workerId: string): Promise<{
    skills: Array<{
      skill: string;
      level: number; // 0-100
      lastAssessed: Date;
      certification?: string;
    }>;
    recommendedTraining: string[];
  }> {
    const skills = [
      {
        skill: "Electrical installation",
        level: 85,
        lastAssessed: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        certification: "Level 2 Electrician",
      },
      {
        skill: "Safety protocols",
        level: 90,
        lastAssessed: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      },
    ];

    const recommendedTraining = [
      "Advanced electrical techniques",
      "Leadership skills",
    ];

    return { skills, recommendedTraining };
  }

  /**
   * Дає рекомендації
   */
  async provideRecommendations(workerId: string): Promise<{
    recommendations: Array<{
      area: string;
      current: number;
      target: number;
      actions: string[];
      timeline: number; // в днях
    }>;
  }> {
    const recommendations = [
      {
        area: "Task completion rate",
        current: 85,
        target: 95,
        actions: ["Time management training", "Process optimization"],
        timeline: 30,
      },
      {
        area: "Quality score",
        current: 88,
        target: 92,
        actions: ["Quality standards review", "Peer mentoring"],
        timeline: 14,
      },
    ];

    return { recommendations };
  }

  /**
   * Розраховує бонуси
   */
  async calculateIncentives(workerId: string, period: {
    start: Date;
    end: Date;
  }): Promise<{
    basePay: number;
    performanceBonus: number;
    safetyBonus: number;
    qualityBonus: number;
    total: number;
    breakdown: Record<string, number>;
  }> {
    const basePay = 2000;
    const performanceBonus = 300;
    const safetyBonus = 100;
    const qualityBonus = 150;
    const total = basePay + performanceBonus + safetyBonus + qualityBonus;

    const breakdown = {
      basePay,
      performanceBonus,
      safetyBonus,
      qualityBonus,
    };

    return { basePay, performanceBonus, safetyBonus, qualityBonus, total, breakdown };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const workerPerformanceAgent = new WorkerPerformanceAgent();
