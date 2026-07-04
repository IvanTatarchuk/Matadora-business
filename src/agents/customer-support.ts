import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Customer Support Agent - Агент для підтримки клієнтів
 * Надає підтримку клієнтам, відповідає на запитання та вирішує проблеми
 */
export class CustomerSupportAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "customer-support",
      name: "Customer Support Agent",
      description: "Надає підтримку клієнтам, відповідає на запитання, вирішує проблеми та відстежує звернення",
      category: "customer",
      capabilities: [
        "ticket_management",
        "query_response",
        "issue_resolution",
        "knowledge_base",
        "escalation",
        "satisfaction_tracking",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Керує тікетами
   */
  async manageTickets(projectId: string): Promise<{
    tickets: Array<{
      id: string;
      subject: string;
      status: "open" | "in_progress" | "resolved" | "closed";
      priority: "low" | "medium" | "high" | "urgent";
      createdAt: Date;
      assignedTo: string;
    }>;
    summary: {
      open: number;
      inProgress: number;
      resolved: number;
      closed: number;
    };
  }> {
    const tickets = [
      {
        id: "ticket-1",
        subject: "Question about project timeline",
        status: "open" as const,
        priority: "medium" as const,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        assignedTo: "Support Agent 1",
      },
      {
        id: "ticket-2",
        subject: "Invoice discrepancy",
        status: "in_progress" as const,
        priority: "high" as const,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        assignedTo: "Support Agent 2",
      },
      {
        id: "ticket-3",
        subject: "Feature request",
        status: "resolved" as const,
        priority: "low" as const,
        createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
        assignedTo: "Support Agent 1",
      },
      {
        id: "ticket-4",
        subject: "Previous inquiry",
        status: "closed" as const,
        priority: "low" as const,
        createdAt: new Date(Date.now() - 120 * 60 * 60 * 1000),
        assignedTo: "Support Agent 1",
      },
    ];

    const summary = {
      open: tickets.filter(t => t.status === "open").length,
      inProgress: tickets.filter(t => t.status === "in_progress").length,
      resolved: tickets.filter(t => t.status === "resolved").length,
      closed: tickets.filter(t => t.status === "closed").length,
    };

    return { tickets, summary };
  }

  /**
   * Відповідає на запити
   */
  async respondToQuery(query: string): Promise<{
    response: string;
    confidence: number; // 0-100
    relatedTopics: string[];
    suggestedActions: string[];
  }> {
    const response = "Based on your query about the project timeline, the current estimated completion date is [date]. This is subject to change based on various factors.";
    const confidence = 85;
    const relatedTopics = ["Project Schedule", "Milestones", "Dependencies"];
    const suggestedActions = [
      "Review project dashboard for real-time updates",
      "Contact project manager for detailed information",
    ];

    return { response, confidence, relatedTopics, suggestedActions };
  }

  /**
   * Вирішує проблеми
   */
  async resolveIssue(ticketId: string): Promise<{
    resolution: string;
    steps: string[];
    estimatedTime: number; // в годинах
    requiresEscalation: boolean;
    followUpRequired: boolean;
  }> {
    const resolution = "Issue has been resolved by updating the project timeline with the correct dates";
    const steps = [
      "Reviewed the original query",
      "Verified project data",
      "Updated timeline",
      "Notified stakeholder",
    ];
    const estimatedTime = 2;
    const requiresEscalation = false;
    const followUpRequired = true;

    return { resolution, steps, estimatedTime, requiresEscalation, followUpRequired };
  }

  /**
   * Пошук у базі знань
   */
  async searchKnowledgeBase(query: string): Promise<{
    articles: Array<{
      id: string;
      title: string;
      summary: string;
      relevance: number; // 0-100
    }>;
    suggested: string[];
  }> {
    const articles = [
      {
        id: "kb-1",
        title: "Understanding Project Timelines",
        summary: "A comprehensive guide to how project timelines are calculated and updated",
        relevance: 92,
      },
      {
        id: "kb-2",
        title: "Milestone Tracking",
        summary: "How to track project milestones and understand their impact",
        relevance: 78,
      },
    ];

    const suggested = ["How are deadlines calculated?", "What affects project timeline?"];

    return { articles, suggested };
  }

  /**
   * Ескалація
   */
  async escalate(ticketId: string, reason: string): Promise<{
    escalatedTo: string;
    reason: string;
    expectedResponse: number; // в годинах
    ticketId: string;
  }> {
    return {
      escalatedTo: "Project Manager",
      reason,
      expectedResponse: 24,
      ticketId,
    };
  }

  /**
   * Відстежує задоволеність
   */
  async trackSatisfaction(projectId: string): Promise<{
    averageRating: number; // 1-5
    ratings: Array<{
      ticketId: string;
      rating: number;
      feedback: string;
      date: Date;
    }>;
    trends: "improving" | "stable" | "declining";
  }> {
    const ratings = [
      {
        ticketId: "ticket-1",
        rating: 4,
        feedback: "Quick and helpful response",
        date: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        ticketId: "ticket-2",
        rating: 5,
        feedback: "Issue resolved completely",
        date: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
    ];

    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    const trends = "improving" as const;

    return { averageRating: Math.round(averageRating * 10) / 10, ratings, trends };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const customerSupportAgent = new CustomerSupportAgent();
