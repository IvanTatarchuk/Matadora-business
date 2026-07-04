import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Payment Scheduler Agent - Агент для планування платежів
 * Плановує та відстежує платежі підрядникам та постачальникам
 */
export class PaymentSchedulerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "payment-scheduler",
      name: "Payment Scheduler Agent",
      description: "Плановує та відстежує платежі, забезпечує своєчасні розрахунки з підрядниками",
      category: "financial",
      capabilities: [
        "payment_scheduling",
        "invoice_processing",
        "approval_workflow",
        "reminder_generation",
        "cash_flow_optimization",
        "dispute_resolution",
      ],
      dependencies: [],
      priority: 5,
    };
  }

  /**
   * Плановує платежі
   */
  async schedulePayments(projectId: string, invoices: Array<{
    id: string;
    vendorId: string;
    amount: number;
    dueDate: Date;
  }>): Promise<{
    scheduledPayments: Array<{
      invoiceId: string;
      vendorId: string;
      amount: number;
      scheduledDate: Date;
      priority: "high" | "medium" | "low";
    }>;
  }> {
    const scheduledPayments = invoices.map(invoice => {
      const daysUntilDue = Math.ceil((invoice.dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      const priority = daysUntilDue <= 7 ? "high" as const : daysUntilDue <= 14 ? "medium" as const : "low" as const;

      return {
        invoiceId: invoice.id,
        vendorId: invoice.vendorId,
        amount: invoice.amount,
        scheduledDate: invoice.dueDate,
        priority,
      };
    });

    return { scheduledPayments };
  }

  /**
   * Обробляє інвойси
   */
  async processInvoices(invoices: Array<{
    id: string;
    vendorId: string;
    amount: number;
    items: Array<{ description: string; quantity: number; unitPrice: number }>;
  }>): Promise<{
    processed: Array<{
      invoiceId: string;
      status: "approved" | "rejected" | "needs_review";
      reason?: string;
    }>;
  }> {
    const processed = invoices.map(invoice => {
      const total = invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const matches = Math.abs(total - invoice.amount) < 0.01;

      return {
        invoiceId: invoice.id,
        status: matches ? "approved" as const : "needs_review" as const,
        reason: matches ? undefined : "Amount mismatch",
      };
    });

    return { processed };
  }

  /**
   * Керує процесом затвердження
   */
  async manageApprovalWorkflow(paymentId: string): Promise<{
    currentStep: string;
    approvers: Array<{ name: string; status: "pending" | "approved" | "rejected" }>;
    canApprove: boolean;
    estimatedCompletion: Date;
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
      estimatedCompletion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Генерує нагадування
   */
  async generateReminders(projectId: string): Promise<{
    reminders: Array<{
      type: "payment_due" | "invoice_received" | "approval_required";
      recipient: string;
      message: string;
      dueDate: Date;
    }>;
  }> {
    const reminders = [
      {
        type: "payment_due" as const,
        recipient: "Finance Team",
        message: "Payment of $25,000 due to ABC Construction in 5 days",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        type: "approval_required" as const,
        recipient: "Project Manager",
        message: "Invoice #1234 requires approval",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
    ];

    return { reminders };
  }

  /**
   * Оптимізує грошовий потік
   */
  async optimizeCashFlow(payments: Array<{
    amount: number;
    dueDate: Date;
  }>): Promise<{
    optimizedSchedule: Array<{
      originalDate: Date;
      optimizedDate: Date;
      amount: number;
      savings: number;
    }>;
    totalSavings: number;
  }> {
    const optimizedSchedule = payments.map(payment => {
      const optimizedDate = new Date(payment.dueDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const savings = payment.amount * 0.01; // 1% за 7 днів затримки

      return {
        originalDate: payment.dueDate,
        optimizedDate,
        amount: payment.amount,
        savings,
      };
    });

    const totalSavings = optimizedSchedule.reduce((sum, p) => sum + p.savings, 0);

    return { optimizedSchedule, totalSavings: Math.round(totalSavings) };
  }

  /**
   * Вирішує спори
   */
  async resolveDispute(disputeId: string): Promise<{
    status: "investigating" | "resolved" | "escalated";
    resolution?: string;
    timeline: string[];
  }> {
    return {
      status: "investigating" as const,
      resolution: undefined,
      timeline: [
        "Dispute submitted",
        "Documentation requested",
        "Under review",
        "Resolution pending",
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
export const paymentSchedulerAgent = new PaymentSchedulerAgent();
