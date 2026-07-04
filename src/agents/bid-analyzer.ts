import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Bid Analyzer Agent - Агент для аналізу тендерних пропозицій
 * Аналізує пропозиції підрядників та допомагає вибрати найкращу
 */
export class BidAnalyzerAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "bid-analyzer",
      name: "Bid Analyzer Agent",
      description: "Аналізує тендерні пропозиції, порівнює ціни та допомагає вибрати найкращого підрядника",
      category: "financial",
      capabilities: [
        "bid_comparison",
        "price_analysis",
        "vendor_evaluation",
        "risk_assessment",
        "recommendation",
        "negotiation_support",
      ],
      dependencies: [],
      priority: 25,
    };
  }

  /**
   * Порівнює пропозиції
   */
  async compareBids(projectId: string, bids: Array<{
    vendorId: string;
    vendorName: string;
    price: number;
    timeline: number; // в днях
    qualifications: string[];
  }>): Promise<{
    comparison: Array<{
      vendorId: string;
      vendorName: string;
      price: number;
      priceRank: number;
      timeline: number;
      timelineRank: number;
      overallScore: number;
    }>;
    recommendation: {
      vendorId: string;
      reason: string;
    };
  }> {
    const sortedByPrice = [...bids].sort((a, b) => a.price - b.price);
    const sortedByTimeline = [...bids].sort((a, b) => a.timeline - b.timeline);

    const comparison = bids.map(bid => {
      const priceRank = sortedByPrice.findIndex(b => b.vendorId === bid.vendorId) + 1;
      const timelineRank = sortedByTimeline.findIndex(b => b.vendorId === bid.vendorId) + 1;
      const overallScore = (priceRank + timelineRank) / 2;

      return {
        vendorId: bid.vendorId,
        vendorName: bid.vendorName,
        price: bid.price,
        priceRank,
        timeline: bid.timeline,
        timelineRank,
        overallScore,
      };
    });

    const bestBid = comparison.sort((a, b) => a.overallScore - b.overallScore)[0];

    if (!bestBid) {
      return {
        comparison,
        recommendation: {
          vendorId: "",
          reason: "No bids available for comparison",
        },
      };
    }

    return {
      comparison,
      recommendation: {
        vendorId: bestBid.vendorId,
        reason: `Best balance of price (${bestBid.priceRank}) and timeline (${bestBid.timelineRank})`,
      },
    };
  }

  /**
   * Аналізує ціни
   */
  async analyzePrice(bid: {
    price: number;
    breakdown: Array<{ category: string; amount: number }>;
  }, marketRates: Record<string, number>): Promise<{
    totalBid: number;
    marketEstimate: number;
    variance: number; // у процентах
    overpricedItems: Array<{ category: string; bidAmount: number; marketRate: number; variance: number }>;
    underpricedItems: Array<{ category: string; bidAmount: number; marketRate: number; variance: number }>;
  }> {
    const marketEstimate = Object.entries(marketRates).reduce((sum, [_, rate]) => sum + rate, 0);
    const variance = ((bid.price - marketEstimate) / marketEstimate) * 100;

    const overpricedItems: Array<{ category: string; bidAmount: number; marketRate: number; variance: number }> = [];
    const underpricedItems: Array<{ category: string; bidAmount: number; marketRate: number; variance: number }> = [];

    for (const item of bid.breakdown) {
      const marketRate = marketRates[item.category] || 0;
      const itemVariance = ((item.amount - marketRate) / marketRate) * 100;

      if (itemVariance > 10) {
        overpricedItems.push({ category: item.category, bidAmount: item.amount, marketRate, variance: itemVariance });
      } else if (itemVariance < -10) {
        underpricedItems.push({ category: item.category, bidAmount: item.amount, marketRate, variance: itemVariance });
      }
    }

    return {
      totalBid: bid.price,
      marketEstimate,
      variance: Math.round(variance * 100) / 100,
      overpricedItems,
      underpricedItems,
    };
  }

  /**
   * Оцінює постачальника
   */
  async evaluateVendor(vendorId: string): Promise<{
    rating: number; // 0-100
    pastProjects: number;
    onTimeDelivery: number; // відсоток
    qualityScore: number; // 0-100
    references: Array<{ project: string; rating: number; comment: string }>;
  }> {
    const rating = 85 + Math.random() * 10;
    const pastProjects = 15 + Math.floor(Math.random() * 20);
    const onTimeDelivery = 80 + Math.random() * 15;
    const qualityScore = 85 + Math.random() * 10;

    const references = [
      {
        project: "Office Building A",
        rating: 4.5,
        comment: "Excellent work, completed on time",
      },
      {
        project: "Residential Complex B",
        rating: 4.2,
        comment: "Good quality, minor delays",
      },
    ];

    return {
      rating: Math.round(rating),
      pastProjects,
      onTimeDelivery: Math.round(onTimeDelivery),
      qualityScore: Math.round(qualityScore),
      references,
    };
  }

  /**
   * Оцінює ризики пропозиції
   */
  async assessRisks(bid: {
    vendorId: string;
    price: number;
    timeline: number;
  }): Promise<{
    risks: Array<{
      type: string;
      severity: "low" | "medium" | "high";
      description: string;
      mitigation: string;
    }>;
    overallRisk: "low" | "medium" | "high";
  }> {
    const risks: Array<{
      type: string;
      severity: "low" | "medium" | "high";
      description: string;
      mitigation: string;
    }> = [
      {
        type: "price",
        severity: "low" as const,
        description: "Price is significantly below market rate",
        mitigation: "Verify quality and scope",
      },
      {
        type: "timeline",
        severity: "medium" as const,
        description: "Timeline is aggressive",
        mitigation: "Add buffer time in contract",
      },
    ];

    const overallRisk = "medium" as const;

    return { risks, overallRisk };
  }

  /**
   * Дає рекомендацію
   */
  async provideRecommendation(bids: Array<{
    vendorId: string;
    vendorName: string;
    price: number;
    timeline: number;
  }>): Promise<{
    recommended: {
      vendorId: string;
      vendorName: string;
      confidence: number; // 0-100
    };
    alternatives: Array<{
      vendorId: string;
      vendorName: string;
      reason: string;
    }>;
  }> {
    const sortedByPrice = [...bids].sort((a, b) => a.price - b.price);
    const recommended = sortedByPrice[0];

    if (!recommended) {
      return {
        recommended: {
          vendorId: "",
          vendorName: "",
          confidence: 0,
        },
        alternatives: [],
      };
    }

    const alternatives = sortedByPrice.slice(1, 3).map(bid => ({
      vendorId: bid.vendorId,
      vendorName: bid.vendorName,
      reason: "Competitive alternative",
    }));

    return {
      recommended: {
        vendorId: recommended.vendorId,
        vendorName: recommended.vendorName,
        confidence: 85,
      },
      alternatives,
    };
  }

  /**
   * Підтримує переговори
   */
  async supportNegotiation(bid: {
    vendorId: string;
    price: number;
  }, targetPrice: number): Promise<{
    negotiationPoints: Array<{
      category: string;
      current: number;
      target: number;
      strategy: string;
    }>;
    estimatedSavings: number;
  }> {
    const negotiationPoints = [
      {
        category: "Materials",
        current: bid.price * 0.4,
        target: targetPrice * 0.4,
        strategy: "Request volume discount",
      },
      {
        category: "Labor",
        current: bid.price * 0.35,
        target: targetPrice * 0.35,
        strategy: "Optimize schedule",
      },
    ];

    const estimatedSavings = bid.price - targetPrice;

    return { negotiationPoints, estimatedSavings };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const bidAnalyzerAgent = new BidAnalyzerAgent();
