import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Tax Calculator Agent - Агент для розрахунку податків
 * Розраховує податки та збори для будівельних проектів
 */
export class TaxCalculatorAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "tax-calculator",
      name: "Tax Calculator Agent",
      description: "Розраховує податки, збори та податкові зобов'язання для будівельних проектів",
      category: "financial",
      capabilities: [
        "vat_calculation",
        "income_tax",
        "property_tax",
        "payroll_tax",
        "deduction_optimization",
        "compliance_check",
      ],
      dependencies: [],
      priority: 4,
    };
  }

  /**
   * Розраховує ПДВ
   */
  async calculateVAT(amount: number, rate: number, jurisdiction: string): Promise<{
    vatAmount: number;
    totalWithVAT: number;
    breakdown: Array<{ category: string; amount: number; vat: number }>;
  }> {
    const vatAmount = amount * (rate / 100);
    const totalWithVAT = amount + vatAmount;

    const breakdown = [
      {
        category: "Materials",
        amount: amount * 0.4,
        vat: amount * 0.4 * (rate / 100),
      },
      {
        category: "Services",
        amount: amount * 0.6,
        vat: amount * 0.6 * (rate / 100),
      },
    ];

    return {
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalWithVAT: Math.round(totalWithVAT * 100) / 100,
      breakdown,
    };
  }

  /**
   * Розраховує податок на доходи
   */
  async calculateIncomeTax(revenue: number, expenses: number, rate: number): Promise<{
    taxableIncome: number;
    taxAmount: number;
    effectiveRate: number;
    deductions: Array<{ type: string; amount: number }>;
  }> {
    const taxableIncome = Math.max(0, revenue - expenses);
    const taxAmount = taxableIncome * (rate / 100);
    const effectiveRate = revenue > 0 ? (taxAmount / revenue) * 100 : 0;

    const deductions = [
      { type: "Business expenses", amount: expenses },
      { type: "Depreciation", amount: 5000 },
      { type: "Other deductions", amount: 2000 },
    ];

    return {
      taxableIncome: Math.round(taxableIncome),
      taxAmount: Math.round(taxAmount),
      effectiveRate: Math.round(effectiveRate * 100) / 100,
      deductions,
    };
  }

  /**
   * Розраховує податок на нерухомість
   */
  async calculatePropertyTax(propertyValue: number, assessmentRate: number, taxRate: number): Promise<{
    assessedValue: number;
    annualTax: number;
      monthlyTax: number;
    exemptions: Array<{ type: string; amount: number }>;
  }> {
    const assessedValue = propertyValue * (assessmentRate / 100);
    const annualTax = assessedValue * (taxRate / 100);
    const monthlyTax = annualTax / 12;

    const exemptions = [
      { type: "Homestead exemption", amount: 5000 },
      { type: "Senior exemption", amount: 3000 },
    ];

    return {
      assessedValue: Math.round(assessedValue),
      annualTax: Math.round(annualTax),
      monthlyTax: Math.round(monthlyTax * 100) / 100,
      exemptions,
    };
  }

  /**
   * Розраховує податок на зарплату
   */
  async calculatePayrollTax(payroll: number, employeeCount: number, jurisdiction: string): Promise<{
    employerTax: number;
    employeeTax: number;
    totalTax: number;
    perEmployee: number;
    breakdown: Array<{ type: string; rate: number; amount: number }>;
  }> {
    const employerRate = 0.12; // 12%
    const employeeRate = 0.08; // 8%

    const employerTax = payroll * employerRate;
    const employeeTax = payroll * employeeRate;
    const totalTax = employerTax + employeeTax;
    const perEmployee = totalTax / employeeCount;

    const breakdown = [
      { type: "Social Security", rate: 6.2, amount: payroll * 0.062 },
      { type: "Medicare", rate: 1.45, amount: payroll * 0.0145 },
      { type: "Unemployment", rate: 0.6, amount: payroll * 0.006 },
    ];

    return {
      employerTax: Math.round(employerTax),
      employeeTax: Math.round(employeeTax),
      totalTax: Math.round(totalTax),
      perEmployee: Math.round(perEmployee),
      breakdown,
    };
  }

  /**
   * Оптимізує відрахування
   */
  async optimizeDeductions(income: number, expenses: Record<string, number>): Promise<{
    currentDeductions: number;
    optimizedDeductions: number;
    additionalDeductions: Array<{ type: string; amount: number; eligibility: string }>;
    taxSavings: number;
  }> {
    const currentDeductions = Object.values(expenses).reduce((sum, val) => sum + val, 0);
    const optimizedDeductions = currentDeductions * 1.2; // 20% більше через оптимізацію
    const additionalDeductions = [
      { type: "Equipment depreciation", amount: 3000, eligibility: "Eligible" },
      { type: "Home office", amount: 1500, eligibility: "Requires documentation" },
      { type: "Education expenses", amount: 2000, eligibility: "Eligible" },
    ];
    const taxSavings = (optimizedDeductions - currentDeductions) * 0.2; // 20% податкова ставка

    return {
      currentDeductions: Math.round(currentDeductions),
      optimizedDeductions: Math.round(optimizedDeductions),
      additionalDeductions,
      taxSavings: Math.round(taxSavings),
    };
  }

  /**
   * Перевіряє відповідність
   */
  async checkCompliance(projectId: string, jurisdiction: string): Promise<{
    compliant: boolean;
    requiredFilings: Array<{ type: string; dueDate: Date; status: "filed" | "pending" | "overdue" }>;
    recommendations: string[];
  }> {
    const requiredFilings = [
      {
        type: "Quarterly VAT return",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "pending" as const,
      },
      {
        type: "Annual income tax",
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: "pending" as const,
      },
      {
        type: "Payroll tax",
        dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        status: "overdue" as const,
      },
    ];

    const compliant = requiredFilings.every(f => f.status !== "overdue");
    const recommendations = [
      "File overdue payroll tax immediately",
      "Set up automatic reminders for tax deadlines",
      "Maintain detailed records for all transactions",
    ];

    return { compliant, requiredFilings, recommendations };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const taxCalculatorAgent = new TaxCalculatorAgent();
