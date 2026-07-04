import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Invoice Processor Agent - Агент для обробки інвойсів
 * Обробляє інвойси, перевіряє відповідність та автоматизує платежі
 */
export class InvoiceProcessorAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "invoice-processor",
      name: "Invoice Processor Agent",
      description: "Обробляє інвойси від постачальників та підрядників, перевіряє відповідність контрактам",
      category: "financial",
      capabilities: [
        "invoice_validation",
        "payment_processing",
        "expense_tracking",
        "tax_calculation",
        "approval_workflow",
        "dispute_handling",
      ],
      dependencies: [],
      priority: 50,
    };
  }

  /**
   * Валідує інвойс
   */
  async validateInvoice(invoice: {
    number: string;
    vendor: string;
    amount: number;
    items: Array<{ description: string; quantity: number; unitPrice: number }>;
    dueDate: Date;
  }): Promise<{
    valid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Перевірка суми
    const calculatedTotal = invoice.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    if (Math.abs(calculatedTotal - invoice.amount) > 0.01) {
      issues.push("Invoice total does not match item totals");
    }

    // Перевірка дати
    if (invoice.dueDate < new Date()) {
      warnings.push("Invoice is overdue");
    }

    // Перевірка предметів
    if (invoice.items.length === 0) {
      issues.push("Invoice has no line items");
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
    };
  }

  /**
   * Обробляє платіж
   */
  async processPayment(invoiceId: string): Promise<{
    status: "pending" | "approved" | "rejected" | "paid";
    paymentDate?: Date;
    reference?: string;
  }> {
    // Симуляція обробки платежу
    return {
      status: "approved",
      paymentDate: new Date(),
      reference: `PAY-${Date.now()}`,
    };
  }

  /**
   * Відстежує витрати
   */
  async trackExpenses(projectId: string, period: {
    start: Date;
    end: Date;
  }): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byVendor: Record<string, number>;
    trend: "increasing" | "decreasing" | "stable";
  }> {
    const byCategory = {
      materials: 45000,
      labor: 35000,
      equipment: 15000,
      subcontractors: 25000,
    };

    const byVendor = {
      "ABC Supplies": 20000,
      "XYZ Construction": 30000,
      "Equipment Rental": 15000,
    };

    const total = Object.values(byCategory).reduce((sum, val) => sum + val, 0);

    return {
      total,
      byCategory,
      byVendor,
      trend: "increasing",
    };
  }

  /**
   * Розраховує податки
   */
  async calculateTax(invoice: {
    amount: number;
    taxRate: number;
    jurisdiction: string;
  }): Promise<{
    taxAmount: number;
    totalWithTax: number;
    breakdown: Array<{ type: string; amount: number }>;
  }> {
    const taxAmount = invoice.amount * (invoice.taxRate / 100);
    const totalWithTax = invoice.amount + taxAmount;

    const breakdown = [
      { type: "Subtotal", amount: invoice.amount },
      { type: "VAT", amount: taxAmount },
    ];

    return {
      taxAmount,
      totalWithTax,
      breakdown,
    };
  }

  /**
   * Керує процесом затвердження
   */
  async manageApprovalWorkflow(invoiceId: string): Promise<{
    currentStep: string;
    approvers: Array<{ name: string; status: "pending" | "approved" | "rejected" }>;
    canApprove: boolean;
  }> {
    const approvers = [
      { name: "Project Manager", status: "approved" as const },
      { name: "Finance Manager", status: "pending" as const },
      { name: "Director", status: "pending" as const },
    ];

    return {
      currentStep: "Finance Manager",
      approvers,
      canApprove: true,
    };
  }

  /**
   * Обробляє спори
   */
  async handleDispute(invoiceId: string, dispute: {
    reason: string;
    amount: number;
  }): Promise<{
    status: "submitted" | "under_review" | "resolved" | "rejected";
    resolution?: string;
    timeline: string[];
  }> {
    return {
      status: "under_review",
      resolution: undefined,
      timeline: [
        "Dispute submitted",
        "Vendor notified",
        "Documentation requested",
        "Under review",
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
export const invoiceProcessorAgent = new InvoiceProcessorAgent();
