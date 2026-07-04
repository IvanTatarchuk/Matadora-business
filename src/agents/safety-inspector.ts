import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Safety Inspector Agent - Агент для інспекції безпеки
 * Моніторить безпеку на будівельному майданчику та виявляє небезпеки
 */
export class SafetyInspectorAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "safety-inspector",
      name: "Safety Inspector Agent",
      description: "Моніторить безпеку на будівельному майданчику, виявляє небезпеки та забезпечує відповідність стандартам",
      category: "safety",
      capabilities: [
        "hazard_detection",
        "safety_audit",
        "incident_reporting",
        "training_tracking",
        "ppe_monitoring",
        "emergency_planning",
      ],
      dependencies: [],
      priority: 60,
    };
  }

  /**
   * Виявляє небезпеки на майданчику
   */
  async detectHazards(siteId: string): Promise<{
    hazards: Array<{
      id: string;
      type: string;
      description: string;
      severity: "low" | "medium" | "high" | "critical";
      location: string;
      detectedAt: Date;
    }>;
  }> {
    const hazards = [
      {
        id: "haz-1",
        type: "fall",
        description: "Missing guardrail on second floor",
        severity: "high" as const,
        location: "Floor 2 - North side",
        detectedAt: new Date(),
      },
      {
        id: "haz-2",
        type: "electrical",
        description: "Exposed wiring near entrance",
        severity: "critical" as const,
        location: "Main entrance",
        detectedAt: new Date(),
      },
      {
        id: "haz-3",
        type: "debris",
        description: "Loose materials on walkway",
        severity: "medium" as const,
        location: "Walkway A",
        detectedAt: new Date(),
      },
    ];

    return { hazards };
  }

  /**
   * Проводить аудит безпеки
   */
  async conductSafetyAudit(siteId: string): Promise<{
    score: number; // 0-100
    categories: Array<{
      name: string;
      score: number;
      issues: string[];
    }>;
    recommendations: string[];
  }> {
    const categories = [
      {
        name: "PPE Compliance",
        score: 85,
        issues: ["Some workers without hard hats"],
      },
      {
        name: "Fall Protection",
        score: 70,
        issues: ["Missing guardrails", "Inadequate safety nets"],
      },
      {
        name: "Electrical Safety",
        score: 60,
        issues: ["Exposed wiring", "Missing GFCI protection"],
      },
      {
        name: "Fire Safety",
        score: 90,
        issues: [],
      },
    ];

    const overallScore = Math.round(
      categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length
    );

    const recommendations = [
      "Install guardrails on all elevated surfaces",
      "Provide electrical training for workers",
      "Implement daily PPE inspections",
      "Add more fire extinguishers",
    ];

    return { score: overallScore, categories, recommendations };
  }

  /**
   * Звітує про інциденти
   */
  async reportIncident(incident: {
    type: string;
    description: string;
    severity: "minor" | "major" | "critical";
    location: string;
    involved: string[];
  }): Promise<{
    incidentId: string;
    status: "reported" | "investigating" | "resolved";
    actions: string[];
  }> {
    const incidentId = `inc-${Date.now()}`;
    
    return {
      incidentId,
      status: "reported",
      actions: [
        "Notify site supervisor",
        "Secure the area",
        "Document the incident",
        "Begin investigation",
      ],
    };
  }

  /**
   * Відстежує навчання з безпеки
   */
  async trackTraining(siteId: string): Promise<{
    workers: Array<{
      id: string;
      name: string;
      trainingsCompleted: string[];
      trainingsDue: string[];
      lastTraining: Date;
    }>;
    complianceRate: number;
  }> {
    const workers = [
      {
        id: "w-1",
        name: "John Smith",
        trainingsCompleted: ["OSHA 30", "First Aid"],
        trainingsDue: ["Fall Protection"],
        lastTraining: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        id: "w-2",
        name: "Jane Doe",
        trainingsCompleted: ["OSHA 10"],
        trainingsDue: ["OSHA 30", "Electrical Safety"],
        lastTraining: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      },
    ];

    const complianceRate = 75; // 75% працівників мають актуальне навчання

    return { workers, complianceRate };
  }

  /**
   * Моніторить використання ЗІЗ
   */
  async monitorPPE(siteId: string): Promise<{
    compliance: number; // відсоток
    violations: Array<{
      workerId: string;
      missingPPE: string[];
      time: Date;
    }>;
  }> {
    const violations = [
      {
        workerId: "w-3",
        missingPPE: ["hard hat", "safety glasses"],
        time: new Date(),
      },
    ];

    const compliance = 85; // 85% працівників носять належне ЗІЗ

    return { compliance, violations };
  }

  /**
   * Створює план екстрених ситуацій
   */
  async createEmergencyPlan(siteId: string): Promise<{
    evacuationRoutes: Array<{ location: string; route: string }>;
    assemblyPoints: Array<{ location: string; capacity: number }>;
    emergencyContacts: Array<{ role: string; name: string; phone: string }>;
    procedures: Array<{ type: string; steps: string[] }>;
  }> {
    return {
      evacuationRoutes: [
        { location: "Floor 1", route: "Main Stairs → North Exit" },
        { location: "Floor 2", route: "Emergency Stairs → East Exit" },
      ],
      assemblyPoints: [
        { location: "North Parking Lot", capacity: 50 },
        { location: "South Field", capacity: 100 },
      ],
      emergencyContacts: [
        { role: "Site Manager", name: "John Smith", phone: "+1234567890" },
        { role: "Safety Officer", name: "Jane Doe", phone: "+1234567891" },
        { role: "Emergency Services", name: "911", phone: "911" },
      ],
      procedures: [
        {
          type: "Fire",
          steps: [
            "Activate fire alarm",
            "Evacuate via nearest exit",
            "Proceed to assembly point",
            "Roll call",
          ],
        },
        {
          type: "Medical Emergency",
          steps: [
            "Call emergency services",
            "Provide first aid if trained",
            "Secure the area",
            "Direct responders to location",
          ],
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
export const safetyInspectorAgent = new SafetyInspectorAgent();
