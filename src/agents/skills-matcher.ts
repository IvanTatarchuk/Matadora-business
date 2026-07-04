import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Skills Matcher Agent - Агент для підбору за навичками
 * Підбирає працівників за навичками до завдань та проектів
 */
export class SkillsMatcherAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "skills-matcher",
      name: "Skills Matcher Agent",
      description: "Підбирає працівників за навичками до завдань, аналізує розриви навичок та рекомендує навчання",
      category: "planning",
      capabilities: [
        "skill_matching",
        "gap_analysis",
        "proficiency_assessment",
        "team_composition",
        "training_recommendation",
        "certification_tracking",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Підбирає за навичками
   */
  async matchSkills(taskRequirements: {
    skills: string[];
    proficiency: number; // 0-100
  }, workers: Array<{
    id: string;
    name: string;
    skills: Array<{ skill: string; proficiency: number }>;
  }>): Promise<{
    matches: Array<{
      workerId: string;
      workerName: string;
      matchScore: number; // 0-100
      matchedSkills: string[];
      missingSkills: string[];
      proficiencyGap: number;
    }>;
    bestMatch: string;
  }> {
    const matches = workers.map(worker => {
      const workerSkills = worker.skills.map(s => s.skill);
      const matchedSkills = taskRequirements.skills.filter(skill => workerSkills.includes(skill));
      const missingSkills = taskRequirements.skills.filter(skill => !workerSkills.includes(skill));
      
      const matchScore = (matchedSkills.length / taskRequirements.skills.length) * 100;
      const avgProficiency = matchedSkills.length > 0
        ? worker.skills
            .filter(s => matchedSkills.includes(s.skill))
            .reduce((sum, s) => sum + s.proficiency, 0) / matchedSkills.length
        : 0;
      const proficiencyGap = Math.max(0, taskRequirements.proficiency - avgProficiency);

      return {
        workerId: worker.id,
        workerName: worker.name,
        matchScore: Math.round(matchScore),
        matchedSkills,
        missingSkills,
        proficiencyGap: Math.round(proficiencyGap),
      };
    });

    const bestMatch = matches.sort((a, b) => b.matchScore - a.matchScore)[0]?.workerId || "";

    return { matches, bestMatch };
  }

  /**
   * Аналізує розрив навичок
   */
  async analyzeGaps(projectId: string): Promise<{
    gaps: Array<{
      skill: string;
      required: number;
      available: number;
      gap: number;
      severity: "critical" | "high" | "medium" | "low";
    }>;
    recommendations: Array<{
      skill: string;
      action: string;
      priority: "high" | "medium" | "low";
    }>;
  }> {
    const gaps = [
      {
        skill: "Advanced electrical",
        required: 5,
        available: 2,
        gap: 3,
        severity: "high" as const,
      },
      {
        skill: "Welding certification",
        required: 3,
        available: 1,
        gap: 2,
        severity: "medium" as const,
      },
    ];

    const recommendations = [
      {
        skill: "Advanced electrical",
        action: "Hire 3 certified electricians or provide training",
        priority: "high" as const,
      },
      {
        skill: "Welding certification",
        action: "Schedule welding certification course",
        priority: "medium" as const,
      },
    ];

    return { gaps, recommendations };
  }

  /**
   * Оцінює професійність
   */
  async assessProficiency(workerId: string, skill: string): Promise<{
    currentLevel: number; // 0-100
    lastAssessed: Date;
    certifications: Array<{ name: string; expiryDate: Date }>;
    recommendedLevel: number;
    gap: number;
    trainingNeeded: boolean;
  }> {
    const currentLevel = 75;
    const lastAssessed = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const certifications = [
      { name: "Level 2 Electrician", expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    ];
    const recommendedLevel = 85;
    const gap = recommendedLevel - currentLevel;
    const trainingNeeded = gap > 10;

    return {
      currentLevel,
      lastAssessed,
      certifications,
      recommendedLevel,
      gap,
      trainingNeeded,
    };
  }

  /**
   * Аналізує склад команди
   */
  async analyzeTeamComposition(projectId: string): Promise<{
    currentComposition: Array<{
      role: string;
      count: number;
      avgProficiency: number;
    }>;
    idealComposition: Array<{
      role: string;
      count: number;
      minProficiency: number;
    }>;
    gaps: Array<{
      role: string;
      current: number;
      ideal: number;
      gap: number;
    }>;
  }> {
    const currentComposition = [
      { role: "Electrician", count: 4, avgProficiency: 78 },
      { role: "Plumber", count: 3, avgProficiency: 82 },
      { role: "Carpenter", count: 5, avgProficiency: 75 },
    ];

    const idealComposition = [
      { role: "Electrician", count: 5, minProficiency: 80 },
      { role: "Plumber", count: 3, minProficiency: 80 },
      { role: "Carpenter", count: 4, minProficiency: 75 },
    ];

    const gaps = idealComposition.map(ideal => {
      const current = currentComposition.find(c => c.role === ideal.role);
      return {
        role: ideal.role,
        current: current?.count || 0,
        ideal: ideal.count,
        gap: ideal.count - (current?.count || 0),
      };
    });

    return { currentComposition, idealComposition, gaps };
  }

  /**
   * Рекомендує навчання
   */
  async recommendTraining(workerId: string): Promise<{
    recommendedTrainings: Array<{
      skill: string;
      currentLevel: number;
      targetLevel: number;
      training: string;
      duration: number; // в годинах
      cost: number;
      priority: "high" | "medium" | "low";
    }>;
    estimatedCost: number;
    estimatedTime: number; // в днях
  }> {
    const recommendedTrainings = [
      {
        skill: "Advanced electrical",
        currentLevel: 70,
        targetLevel: 85,
        training: "Advanced Electrical Techniques",
        duration: 40,
        cost: 1500,
        priority: "high" as const,
      },
      {
        skill: "Safety protocols",
        currentLevel: 80,
        targetLevel: 90,
        training: "Advanced Safety Training",
        duration: 16,
        cost: 500,
        priority: "medium" as const,
      },
    ];

    const estimatedCost = recommendedTrainings.reduce((sum, t) => sum + t.cost, 0);
    const estimatedTime = Math.ceil(recommendedTrainings.reduce((sum, t) => sum + t.duration, 0) / 8);

    return { recommendedTrainings, estimatedCost, estimatedTime };
  }

  /**
   * Відстежує сертифікації
   */
  async trackCertifications(projectId: string): Promise<{
    certifications: Array<{
      workerId: string;
      workerName: string;
      certification: string;
      issuedDate: Date;
      expiryDate: Date;
      status: "valid" | "expiring" | "expired";
    }>;
    expiringSoon: Array<{
      workerId: string;
      workerName: string;
      certification: string;
      expiryDate: Date;
      daysUntilExpiry: number;
    }>;
  }> {
    const certifications = [
      {
        workerId: "w-1",
        workerName: "John Smith",
        certification: "OSHA 30",
        issuedDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "expiring" as const,
      },
      {
        workerId: "w-2",
        workerName: "Jane Doe",
        certification: "Electrical License",
        issuedDate: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: "valid" as const,
      },
    ];

    const expiringSoon = certifications
      .filter(c => c.status === "expiring")
      .map(c => ({
        workerId: c.workerId,
        workerName: c.workerName,
        certification: c.certification,
        expiryDate: c.expiryDate,
        daysUntilExpiry: Math.ceil((c.expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
      }));

    return { certifications, expiringSoon };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const skillsMatcherAgent = new SkillsMatcherAgent();
