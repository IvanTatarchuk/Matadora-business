import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Insurance Agent - Агент для управління страхуванням
 * Керує страховими полісами, відстежує покриття та забезпечує відповідність вимогам
 */
export class InsuranceAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "insurance",
      name: "Insurance Agent",
      description: "Керує страховими полісами, відстежує покриття, забезпечує відповідність вимогам та допомагає з заявками",
      category: "legal",
      capabilities: [
        "policy_management",
        "coverage_tracking",
        "compliance_check",
        "claims_management",
        "renewal_management",
        "risk_assessment",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Керує полісами
   */
  async managePolicies(projectId: string): Promise<{
    policies: Array<{
      policyId: string;
      type: string;
      insurer: string;
      coverage: number;
      premium: number;
      expiryDate: Date;
      status: "active" | "expired" | "pending";
    }>;
    summary: {
      totalCoverage: number;
      annualPremium: number;
      activePolicies: number;
    };
  }> {
    const policies = [
      {
        policyId: "pol-1",
        type: "General Liability",
        insurer: "ABC Insurance",
        coverage: 2000000,
        premium: 15000,
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        status: "active" as const,
      },
      {
        policyId: "pol-2",
        type: "Workers Compensation",
        insurer: "XYZ Insurance",
        coverage: 500000,
        premium: 25000,
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: "active" as const,
      },
      {
        policyId: "pol-3",
        type: "Property Insurance",
        insurer: "ABC Insurance",
        coverage: 1000000,
        premium: 10000,
        expiryDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        status: "expired" as const,
      },
    ];

    const summary = {
      totalCoverage: policies.reduce((sum, p) => sum + p.coverage, 0),
      annualPremium: policies.reduce((sum, p) => sum + p.premium, 0),
      activePolicies: policies.filter(p => p.status === "active").length,
    };

    return { policies, summary };
  }

  /**
   * Відстежує покриття
   */
  async trackCoverage(projectId: string): Promise<{
    coverage: Array<{
      type: string;
      covered: boolean;
      limit: number;
      deductible: number;
      exclusions: string[];
    }>;
    gaps: string[];
    recommendations: string[];
  }> {
    const coverage = [
      {
        type: "General Liability",
        covered: true,
        limit: 2000000,
        deductible: 10000,
        exclusions: ["Intentional acts", "Professional liability"],
      },
      {
        type: "Professional Liability",
        covered: false,
        limit: 0,
        deductible: 0,
        exclusions: [],
      },
      {
        type: "Workers Compensation",
        covered: true,
        limit: 500000,
        deductible: 5000,
        exclusions: ["Contractor negligence"],
      },
    ];

    const gaps = ["Professional liability not covered"];
    const recommendations = [
      "Consider adding professional liability coverage",
      "Review exclusions with insurer",
    ];

    return { coverage, gaps, recommendations };
  }

  /**
   * Перевіряє відповідність
   */
  async checkCompliance(projectId: string, requirements: string[]): Promise<{
    compliant: boolean;
    requirements: Array<{
      requirement: string;
      met: boolean;
      policyId: string;
      notes: string;
    }>;
    deficiencies: string[];
  }> {
    const requirementsCheck = [
      {
        requirement: "General Liability $2M",
        met: true,
        policyId: "pol-1",
        notes: "Coverage meets requirement",
      },
      {
        requirement: "Workers Compensation",
        met: true,
        policyId: "pol-2",
        notes: "Coverage meets requirement",
      },
      {
        requirement: "Professional Liability",
        met: false,
        policyId: "",
        notes: "No policy in place",
      },
    ];

    const compliant = requirementsCheck.every(r => r.met);
    const deficiencies = requirementsCheck.filter(r => !r.met).map(r => r.requirement);

    return { compliant, requirements: requirementsCheck, deficiencies };
  }

  /**
   * Керує заявками
   */
  async manageClaims(projectId: string): Promise<{
    claims: Array<{
      claimId: string;
      type: string;
      date: Date;
      amount: number;
      status: "open" | "in_progress" | "settled" | "denied";
      description: string;
    }>;
    summary: {
      totalClaims: number;
      openClaims: number;
      totalPaid: number;
    };
  }> {
    const claims = [
      {
        claimId: "claim-1",
        type: "Property Damage",
        date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        amount: 25000,
        status: "settled" as const,
        description: "Equipment damage due to weather",
      },
      {
        claimId: "claim-2",
        type: "Liability",
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        amount: 15000,
        status: "in_progress" as const,
        description: "Third-party property damage",
      },
      {
        claimId: "claim-3",
        type: "Workers Injury",
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        amount: 5000,
        status: "open" as const,
        description: "Worker injury on site",
      },
    ];

    const summary = {
      totalClaims: claims.length,
      openClaims: claims.filter(c => c.status === "open" || c.status === "in_progress").length,
      totalPaid: claims.filter(c => c.status === "settled").reduce((sum, c) => sum + c.amount, 0),
    };

    return { claims, summary };
  }

  /**
   * Керує поновленням
   */
  async manageRenewals(projectId: string): Promise<{
    renewals: Array<{
      policyId: string;
      type: string;
      expiryDate: Date;
      renewalWindow: {
        start: Date;
        end: Date;
      };
      estimatedPremium: number;
    }>;
    actions: string[];
  }> {
    const renewals = [
      {
        policyId: "pol-1",
        type: "General Liability",
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        renewalWindow: {
          start: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
          end: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        },
        estimatedPremium: 16500,
      },
      {
        policyId: "pol-2",
        type: "Workers Compensation",
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        renewalWindow: {
          start: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
        estimatedPremium: 27500,
      },
    ];

    const actions = [
      "Contact insurer for renewal quotes",
      "Review coverage limits",
      "Compare with market rates",
    ];

    return { renewals, actions };
  }

  /**
   * Оцінює ризики
   */
  async assessRisks(projectId: string): Promise<{
    risks: Array<{
      type: string;
      probability: number; // 0-100
      potentialLoss: number;
      covered: boolean;
      mitigation: string;
    }>;
    recommendations: string[];
  }> {
    const risks = [
      {
        type: "Property Damage",
        probability: 30,
        potentialLoss: 50000,
        covered: true,
        mitigation: "Maintain property insurance",
      },
      {
        type: "Professional Liability",
        probability: 20,
        potentialLoss: 100000,
        covered: false,
        mitigation: "Add professional liability coverage",
      },
      {
        type: "Workers Injury",
        probability: 15,
        potentialLoss: 75000,
        covered: true,
        mitigation: "Maintain safety protocols",
      },
    ];

    const recommendations = [
      "Add professional liability coverage",
      "Review coverage limits annually",
      "Implement risk mitigation measures",
    ];

    return { risks, recommendations };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const insuranceAgent = new InsuranceAgent();
