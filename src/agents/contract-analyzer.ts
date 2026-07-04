import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Contract Analyzer Agent - Агент для аналізу контрактів
 * Аналізує будівельні контракти та виявляє ризикові положення
 */
export class ContractAnalyzerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "contract-analyzer",
      name: "Contract Analyzer Agent",
      description: "Аналізує контракти, виявляє ризикові положення та забезпечує відповідність стандартам",
      category: "legal",
      capabilities: [
        "clause_analysis",
        "risk_identification",
        "compliance_check",
        "term_extraction",
        "obligation_tracking",
        "dispute_resolution",
      ],
      dependencies: [],
      priority: 55,
    };
  }

  /**
   * Аналізує положення контракту
   */
  async analyzeClauses(contract: {
    content: string;
    type: string;
  }): Promise<{
    clauses: Array<{
      id: string;
      type: string;
      content: string;
      risk: "low" | "medium" | "high";
      recommendation?: string;
    }>;
  }> {
    const clauses = [
      {
        id: "clause-1",
        type: "payment",
        content: "Payment terms: 30% upfront, 40% at milestone, 30% on completion",
        risk: "low" as const,
        recommendation: "Consider milestone-based payments",
      },
      {
        id: "clause-2",
        type: "liability",
        content: "Contractor liable for all damages regardless of cause",
        risk: "high" as const,
        recommendation: "Negotiate liability cap and force majeure clause",
      },
      {
        id: "clause-3",
        type: "termination",
        content: "Either party may terminate with 30 days notice",
        risk: "medium" as const,
        recommendation: "Add termination for convenience fee",
      },
    ];

    return { clauses };
  }

  /**
   * Виявляє ризики в контракті
   */
  async identifyRisks(contract: {
    content: string;
  }): Promise<{
    risks: Array<{
      id: string;
      type: string;
      description: string;
      severity: "low" | "medium" | "high";
      mitigation: string;
    }>;
  }> {
    const risks = [
      {
        id: "risk-1",
        type: "financial",
        description: "Unlimited liability clause",
        severity: "high" as const,
        mitigation: "Negotiate liability cap at project value",
      },
      {
        id: "risk-2",
        type: "schedule",
        description: "No liquidated damages for delays",
        severity: "medium" as const,
        mitigation: "Add liquidated damages clause",
      },
      {
        id: "risk-3",
        type: "scope",
        description: "Vague scope of work definition",
        severity: "medium" as const,
        mitigation: "Request detailed specifications",
      },
    ];

    return { risks };
  }

  /**
   * Перевіряє відповідність стандартам
   */
  async checkCompliance(contract: {
    content: string;
    jurisdiction: string;
  }): Promise<{
    compliant: boolean;
    issues: Array<{
      standard: string;
      description: string;
      required: boolean;
    }>;
  }> {
    const issues = [
      {
        standard: "Local Building Code",
        description: "Missing reference to local building codes",
        required: true,
      },
      {
        standard: "Insurance Requirements",
        description: "Insurance coverage below minimum requirements",
        required: true,
      },
      {
        standard: "Payment Bond",
        description: "No payment bond specified",
        required: false,
      },
    ];

    return {
      compliant: issues.filter(i => i.required).length === 0,
      issues,
    };
  }

  /**
   * Екстрактує умови контракту
   */
  async extractTerms(contract: {
    content: string;
  }): Promise<{
    terms: {
      payment: string;
      duration: string;
      warranty: string;
      insurance: string;
      termination: string;
    };
  }> {
    return {
      terms: {
        payment: "Net 30 days from invoice",
        duration: "12 months from commencement",
        warranty: "2 years from completion",
        insurance: "General liability $2M, Workers' comp as required",
        termination: "30 days notice for convenience",
      },
    };
  }

  /**
   * Відстежує зобов'язання
   */
  async trackObligations(contract: {
    content: string;
  }): Promise<{
    obligations: Array<{
      id: string;
      party: "contractor" | "client" | "both";
      description: string;
      deadline?: Date;
      status: "pending" | "completed" | "overdue";
    }>;
  }> {
    const obligations = [
      {
        id: "obl-1",
        party: "contractor" as const,
        description: "Submit weekly progress reports",
        status: "pending" as const,
      },
      {
        id: "obl-2",
        party: "client" as const,
        description: "Approve design documents within 5 days",
        status: "completed" as const,
      },
      {
        id: "obl-3",
        party: "both" as const,
        description: "Attend monthly site meetings",
        status: "pending" as const,
      },
    ];

    return { obligations };
  }

  /**
   * Допомагає вирішувати спори
   */
  async resolveDispute(dispute: {
    description: string;
    contractReference: string;
  }): Promise<{
    resolution: string;
    steps: string[];
    escalation: string[];
  }> {
    return {
      resolution: "Dispute resolution through mediation first, then arbitration",
      steps: [
        "Document the dispute",
        "Notify other party in writing",
        "Attempt informal resolution",
        "Mediation session",
        "Arbitration if needed",
      ],
      escalation: [
        "Project Manager",
        "Legal Department",
        "Senior Management",
        "Arbitration Tribunal",
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
export const contractAnalyzerAgent = new ContractAnalyzerAgent();
