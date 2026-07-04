import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Legal Advisor Agent - Агент для юридичних консультацій
 * Надає юридичні консультації, аналізує договори та забезпечує відповідність законодавству
 */
export class LegalAdvisorAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "legal-advisor",
      name: "Legal Advisor Agent",
      description: "Надає юридичні консультації, аналізує договори, забезпечує відповідність законодавству та допомагає з правовими питаннями",
      category: "legal",
      capabilities: [
        "contract_review",
        "compliance_check",
        "risk_assessment",
        "legal_advice",
        "dispute_prevention",
        "documentation",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Переглядає договір
   */
  async reviewContract(contractId: string): Promise<{
    contract: {
      id: string;
      type: string;
      parties: string[];
      value: number;
    };
    risks: Array<{
      clause: string;
      risk: string;
      severity: "low" | "medium" | "high";
      recommendation: string;
    }>;
    overallRisk: "low" | "medium" | "high";
  }> {
    const contract = {
      id: contractId,
      type: "Construction Agreement",
      parties: ["Client", "Contractor"],
      value: 1000000,
    };

    const risks = [
      {
        clause: "Force Majeure",
        risk: "Limited scope of force majeure events",
        severity: "medium" as const,
        recommendation: "Expand force majeure clause to include pandemics",
      },
      {
        clause: "Payment Terms",
        risk: "No late payment penalties specified",
        severity: "medium" as const,
        recommendation: "Add late payment penalties",
      },
    ];

    const overallRisk = "medium" as const;

    return { contract, risks, overallRisk };
  }

  /**
   * Перевіряє відповідність
   */
  async checkCompliance(projectId: string, jurisdiction: string): Promise<{
    compliant: boolean;
    requirements: Array<{
      requirement: string;
      status: "compliant" | "non_compliant" | "pending";
      dueDate: Date;
    }>;
    violations: Array<{
      type: string;
      description: string;
      penalty: string;
    }>;
  }> {
    const requirements = [
      {
        requirement: "Building permits",
        status: "compliant" as const,
        dueDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      },
      {
        requirement: "Environmental assessment",
        status: "pending" as const,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        requirement: "Labor regulations",
        status: "compliant" as const,
        dueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      },
    ];

    const violations: Array<{
      type: string;
      description: string;
      penalty: string;
    }> = [];

    const compliant = violations.length === 0;

    return { compliant, requirements, violations };
  }

  /**
   * Оцінює ризики
   */
  async assessRisks(projectId: string): Promise<{
    risks: Array<{
      type: string;
      description: string;
      probability: number; // 0-100
      impact: "low" | "medium" | "high";
      mitigation: string;
    }>;
    overallRisk: "low" | "medium" | "high";
  }> {
    const risks = [
      {
        type: "Contractual",
        description: "Ambiguous scope definition",
        probability: 40,
        impact: "medium" as const,
        mitigation: "Clarify scope in writing",
      },
      {
        type: "Regulatory",
        description: "Changes in building codes",
        probability: 25,
        impact: "high" as const,
        mitigation: "Stay updated on code changes",
      },
      {
        type: "Liability",
        description: "Third-party claims",
        probability: 20,
        impact: "medium" as const,
        mitigation: "Ensure adequate insurance coverage",
      },
    ];

    const overallRisk = "medium" as const;

    return { risks, overallRisk };
  }

  /**
   * Надає юридичні консультації
   */
  async provideAdvice(query: string): Promise<{
    advice: string;
    confidence: number; // 0-100
    references: string[];
    disclaimer: string;
  }> {
    const advice = "Based on your query, here is the legal advice: [Detailed legal advice based on the query]";
    const confidence = 85;
    const references = ["Relevant statute", "Case law precedent", "Industry standard"];
    const disclaimer = "This advice is for informational purposes only and does not constitute legal counsel. Consult with a qualified attorney for specific legal advice.";

    return { advice, confidence, references, disclaimer };
  }

  /**
   * Запобігає спорам
   */
  async preventDisputes(projectId: string): Promise<{
    recommendations: Array<{
      area: string;
      recommendation: string;
      priority: "high" | "medium" | "low";
    }>;
    documentation: string[];
  }> {
    const recommendations = [
      {
        area: "Scope",
        recommendation: "Document all scope changes in writing",
        priority: "high" as const,
      },
      {
        area: "Communication",
        recommendation: "Maintain written record of all communications",
        priority: "high" as const,
      },
      {
        area: "Approvals",
        recommendation: "Obtain written approvals for all changes",
        priority: "medium" as const,
      },
    ];

    const documentation = [
      "Change order forms",
      "Meeting minutes",
      "Email confirmations",
      "Progress reports",
    ];

    return { recommendations, documentation };
  }

  /**
   * Документує
   */
  async documentLegalMatters(projectId: string): Promise<{
    documents: Array<{
      type: string;
      id: string;
      date: Date;
      status: "draft" | "review" | "final";
    }>;
    nextActions: string[];
  }> {
    const documents = [
      {
        type: "Contract",
        id: "doc-1",
        date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        status: "final" as const,
      },
      {
        type: "Change Order",
        id: "doc-2",
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        status: "review" as const,
      },
    ];

    const nextActions = [
      "Review change order documentation",
      "Update contract register",
      "Schedule legal review meeting",
    ];

    return { documents, nextActions };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const legalAdvisorAgent = new LegalAdvisorAgent();
