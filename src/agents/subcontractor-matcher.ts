import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Subcontractor Matcher Agent - Агент для підбору підрядників
 * Підбирає відповідних підрядників на основі вимог проекту
 */
export class SubcontractorMatcherAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "subcontractor-matcher",
      name: "Subcontractor Matcher Agent",
      description: "Підбирає відповідних підрядників на основі вимог проекту, спеціалізації та доступності",
      category: "planning",
      capabilities: [
        "skill_matching",
        "availability_check",
        "rating_evaluation",
        "cost_comparison",
        "location_filtering",
        "recommendation",
      ],
      dependencies: [],
      priority: 20,
    };
  }

  /**
   * Підбирає підрядників за навичками
   */
  async matchBySkills(requirements: {
    specialty: string;
    skills: string[];
    location: string;
  }): Promise<{
    matches: Array<{
      subcontractorId: string;
      name: string;
      specialty: string;
      skills: string[];
      matchScore: number; // 0-100
      location: string;
    }>;
  }> {
    const matches = [
      {
        subcontractorId: "sub-1",
        name: "ABC Electrical",
        specialty: "electrical",
        skills: ["wiring", "lighting", "panels"],
        matchScore: 95,
        location: "Kyiv",
      },
      {
        subcontractorId: "sub-2",
        name: "XYZ Plumbing",
        specialty: "plumbing",
        skills: ["pipes", "fixtures", "drainage"],
        matchScore: 88,
        location: "Kyiv",
      },
    ];

    return { matches };
  }

  /**
   * Перевіряє доступність
   */
  async checkAvailability(subcontractorId: string, startDate: Date, duration: number): Promise<{
    available: boolean;
    conflicts: Array<{ startDate: Date; endDate: Date; project: string }>;
    alternativeDates?: Array<Date>;
  }> {
    const available = Math.random() > 0.3;
    const conflicts = available ? [] : [
      {
        startDate: new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000),
        project: "Project A",
      },
    ];

    const alternativeDates = available ? undefined : [
      new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000),
      new Date(startDate.getTime() + 21 * 24 * 60 * 60 * 1000),
    ];

    return { available, conflicts, alternativeDates };
  }

  /**
   * Оцінює рейтинг підрядника
   */
  async evaluateRating(subcontractorId: string): Promise<{
    overallRating: number; // 0-5
    qualityScore: number;
    timelinessScore: number;
    communicationScore: number;
    reviewCount: number;
    recentReviews: Array<{ rating: number; comment: string; date: Date }>;
  }> {
    const overallRating = 4.2 + Math.random() * 0.7;
    const qualityScore = 4.0 + Math.random();
    const timelinessScore = 4.3 + Math.random() * 0.6;
    const communicationScore = 4.1 + Math.random() * 0.8;
    const reviewCount = 15 + Math.floor(Math.random() * 30);

    const recentReviews = [
      {
        rating: 4.5,
        comment: "Excellent work, completed on time",
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        rating: 4.0,
        comment: "Good quality, minor delays",
        date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      },
    ];

    return {
      overallRating: Math.round(overallRating * 10) / 10,
      qualityScore: Math.round(qualityScore * 10) / 10,
      timelinessScore: Math.round(timelinessScore * 10) / 10,
      communicationScore: Math.round(communicationScore * 10) / 10,
      reviewCount,
      recentReviews,
    };
  }

  /**
   * Порівнює вартість
   */
  async compareCost(subcontractorIds: string[], projectScope: {
    area: number;
    type: string;
  }): Promise<{
    estimates: Array<{
      subcontractorId: string;
      name: string;
      estimate: number;
      breakdown: Record<string, number>;
    }>;
    marketAverage: number;
    variance: number; // у процентах
  }> {
    const estimates = subcontractorIds.map(id => ({
      subcontractorId: id,
      name: `Subcontractor ${id}`,
      estimate: 50000 + Math.random() * 20000,
      breakdown: {
        labor: 30000 + Math.random() * 10000,
        materials: 15000 + Math.random() * 5000,
        overhead: 5000 + Math.random() * 2000,
      },
    }));

    const marketAverage = estimates.length > 0 
      ? estimates.reduce((sum, e) => sum + e.estimate, 0) / estimates.length 
      : 0;
    const variance = estimates.length > 0 && estimates[0] !== undefined
      ? ((estimates[0].estimate - marketAverage) / marketAverage) * 100 
      : 0;

    return { estimates, marketAverage, variance: Math.round(variance * 100) / 100 };
  }

  /**
   * Фільтрує за локацією
   */
  async filterByLocation(subcontractorIds: string[], projectLocation: string, radius: number): Promise<{
    withinRadius: Array<{
      subcontractorId: string;
      name: string;
      distance: number; // в км
    }>;
    outsideRadius: Array<{
      subcontractorId: string;
      name: string;
      distance: number;
    }>;
  }> {
    const withinRadius = [
      {
        subcontractorId: "sub-1",
        name: "ABC Electrical",
        distance: 5,
      },
    ];

    const outsideRadius = [
      {
        subcontractorId: "sub-3",
        name: "Remote Contractor",
        distance: 150,
      },
    ];

    return { withinRadius, outsideRadius };
  }

  /**
   * Дає рекомендацію
   */
  async provideRecommendation(requirements: {
    specialty: string;
    location: string;
    budget: number;
    startDate: Date;
  }): Promise<{
    recommended: {
      subcontractorId: string;
      name: string;
      confidence: number; // 0-100
      reasons: string[];
    };
    alternatives: Array<{
      subcontractorId: string;
      name: string;
      reason: string;
    }>;
  }> {
    return {
      recommended: {
        subcontractorId: "sub-1",
        name: "ABC Electrical",
        confidence: 92,
        reasons: [
          "Highly rated (4.5/5)",
          "Available on requested dates",
          "Within budget",
          "Local (5km from site)",
        ],
      },
      alternatives: [
        {
          subcontractorId: "sub-2",
          name: "XYZ Plumbing",
          reason: "Good alternative with competitive pricing",
        },
      ],
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
export const subcontractorMatcherAgent = new SubcontractorMatcherAgent();
