import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Dispute Resolver Agent - Агент для вирішення спорів
 * Вирішує спори між сторонами проекту та допомагає досягти згоди
 */
export class DisputeResolverAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "dispute-resolver",
      name: "Dispute Resolver Agent",
      description: "Вирішує спори між сторонами проекту, аналізує претензії та допомагає досягти згоди",
      category: "customer",
      capabilities: [
        "dispute_analysis",
        "mediation",
        "evidence_review",
        "resolution_proposal",
        "documentation",
        "escalation",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Аналізує спір
   */
  async analyzeDispute(disputeId: string): Promise<{
    dispute: {
      id: string;
      parties: string[];
      issue: string;
      category: string;
      severity: "low" | "medium" | "high";
    };
    rootCauses: string[];
    potentialResolutions: string[];
  }> {
    const dispute = {
      id: disputeId,
      parties: ["Contractor", "Client"],
      issue: "Disagreement over change order costs",
      category: "Financial",
      severity: "medium" as const,
    };

    const rootCauses = [
      "Ambiguous contract language",
      "Different interpretation of scope",
      "Lack of documentation",
    ];

    const potentialResolutions = [
      "Split the difference",
      "Third-party arbitration",
      "Mediation",
    ];

    return { dispute, rootCauses, potentialResolutions };
  }

  /**
   * Медіація
   */
  async mediate(disputeId: string): Promise<{
    mediation: {
      status: "in_progress" | "resolved" | "escalated";
      mediator: string;
      sessions: number;
    };
    positions: Array<{
      party: string;
      position: string;
      flexibility: "rigid" | "moderate" | "flexible";
    }>;
    commonGround: string[];
  }> {
    const mediation = {
      status: "in_progress" as const,
      mediator: "Project Manager",
      sessions: 2,
    };

    const positions = [
      {
        party: "Contractor",
        position: "Request full payment for change order",
        flexibility: "moderate" as const,
      },
      {
        party: "Client",
        position: "Pay only for approved scope",
        flexibility: "moderate" as const,
      },
    ];

    const commonGround = [
      "Both parties want project completion",
      "Both acknowledge some work was performed",
    ];

    return { mediation, positions, commonGround };
  }

  /**
   * Переглядає докази
   */
  async reviewEvidence(disputeId: string): Promise<{
    evidence: Array<{
      type: string;
      description: string;
      from: string;
      date: Date;
      relevance: number; // 0-100
    }>;
    findings: string[];
    gaps: string[];
  }> {
    const evidence = [
      {
        type: "Contract",
        description: "Original contract document",
        from: "Legal",
        date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        relevance: 95,
      },
      {
        type: "Change Order",
        description: "Change order request form",
        from: "Contractor",
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        relevance: 90,
      },
      {
        type: "Email",
        description: "Email communication about changes",
        from: "Both",
        date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        relevance: 85,
      },
    ];

    const findings = [
      "Change order was verbally approved",
      "Written approval not obtained",
      "Work was performed as requested",
    ];

    const gaps = [
      "Missing written approval signature",
      "No documented cost breakdown",
    ];

    return { evidence, findings, gaps };
  }

  /**
   * Пропонує рішення
   */
  async proposeResolution(disputeId: string): Promise<{
    proposal: {
      terms: string[];
      responsibilities: Record<string, string>;
      timeline: number; // в днях
    };
    acceptance: {
      contractor: boolean;
      client: boolean;
    };
    nextSteps: string[];
  }> {
    const proposal = {
      terms: [
        "Client pays 75% of change order cost",
        "Contractor provides detailed cost breakdown",
        "Both parties agree to improved documentation process",
      ],
      responsibilities: {
        contractor: "Submit cost breakdown within 5 days",
        client: "Process payment within 10 days",
      },
      timeline: 15,
    };

    const acceptance = {
      contractor: false,
      client: false,
    };

    const nextSteps = [
      "Present proposal to both parties",
      "Schedule review meeting",
      "Document agreement",
    ];

    return { proposal, acceptance, nextSteps };
  }

  /**
   * Документує
   */
  async documentResolution(disputeId: string): Promise<{
    documentId: string;
    summary: string;
    terms: string[];
    signedBy: string[];
    effectiveDate: Date;
  }> {
    return {
      documentId: `doc-${Date.now()}`,
      summary: "Dispute resolved through mediation with agreed terms",
      terms: [
        "Payment schedule agreed",
        "Documentation process improved",
        "Future dispute prevention measures",
      ],
      signedBy: ["Contractor Representative", "Client Representative", "Mediator"],
      effectiveDate: new Date(),
    };
  }

  /**
   * Ескалація
   */
  async escalate(disputeId: string, reason: string): Promise<{
    escalatedTo: string;
    reason: string;
    expectedResolution: number; // в днях
    status: "pending" | "in_review" | "resolved";
  }> {
    return {
      escalatedTo: "Legal Department",
      reason,
      expectedResolution: 30,
      status: "pending" as const,
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
export const disputeResolverAgent = new DisputeResolverAgent();
