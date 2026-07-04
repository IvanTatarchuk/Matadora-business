import { AgentConfig } from "@/lib/constants/subcontractors";

/**
 * Price Negotiator Agent - Агент для переговорів про ціни
 * Веде переговори про ціни з постачальниками та підрядниками
 */
export class PriceNegotiatorAgent {
  private config: AgentConfig;

  constructor() {
    this.config = {
      id: "price-negotiator",
      name: "Price Negotiator Agent",
      description: "Веде переговори про ціни з постачальниками та підрядниками для оптимізації витрат",
      category: "planning",
      capabilities: [
        "price_analysis",
        "negotiation_strategy",
        "counter_offer",
        "market_comparison",
        "volume_discounts",
        "term_negotiation",
      ],
      dependencies: [],
      priority: 0,
    };
  }

  /**
   * Аналізує ціни
   */
  async analyzePrice(item: string, currentPrice: number, marketData: Array<{
    supplier: string;
    price: number;
  }>): Promise<{
    currentPrice: number;
    marketAverage: number;
    marketRange: { min: number; max: number };
    position: "below_average" | "average" | "above_average";
    negotiationRoom: number; // у процентах
  }> {
    const prices = marketData.map(d => d.price);
    const marketAverage = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const marketRange = { min: Math.min(...prices), max: Math.max(...prices) };
    const position = currentPrice < marketAverage ? "below_average" as const : currentPrice > marketAverage ? "above_average" as const : "average" as const;
    const negotiationRoom = position === "above_average" ? ((currentPrice - marketAverage) / currentPrice) * 100 : 0;

    return {
      currentPrice,
      marketAverage: Math.round(marketAverage),
      marketRange,
      position,
      negotiationRoom: Math.round(negotiationRoom * 100) / 100,
    };
  }

  /**
   * Розробляє стратегію переговорів
   */
  async developStrategy(vendorId: string, targetPrice: number): Promise<{
    strategy: string;
    tactics: Array<{
      tactic: string;
      rationale: string;
      expectedImpact: number; // у процентах
    }>;
    alternatives: Array<{
      alternative: string;
      description: string;
    }>;
  }> {
    const strategy = "Multi-phase negotiation starting with volume commitment";
    const tactics = [
      {
        tactic: "Volume commitment discount",
        rationale: "Commit to larger orders for lower unit price",
        expectedImpact: 8,
      },
      {
        tactic: "Long-term contract",
        rationale: "Lock in price for extended period",
        expectedImpact: 5,
      },
      {
        tactic: "Early payment terms",
        rationale: "Offer faster payment for discount",
        expectedImpact: 2,
      },
    ];

    const alternatives = [
      {
        alternative: "Switch supplier",
        description: "Consider alternative vendors if negotiations fail",
      },
      {
        alternative: "Partial substitution",
        description: "Use alternative materials where possible",
      },
    ];

    return { strategy, tactics, alternatives };
  }

  /**
   * Робить контрпропозицію
   */
  async makeCounterOffer(vendorId: string, originalPrice: number, targetPrice: number): Promise<{
    counterOffer: number;
    discount: number; // у процентах
    justification: string[];
    terms: Array<{
      term: string;
      value: string;
    }>;
  }> {
    const counterOffer = targetPrice;
    const discount = ((originalPrice - counterOffer) / originalPrice) * 100;
    const justification = [
      "Market rates are lower",
      "Volume commitment opportunity",
      "Long-term partnership potential",
    ];

    const terms = [
      { term: "Payment terms", value: "Net 30" },
      { term: "Delivery", value: "7 days" },
      { term: "Minimum order", value: "100 units" },
    ];

    return {
      counterOffer,
      discount: Math.round(discount * 100) / 100,
      justification,
      terms,
    };
  }

  /**
   * Порівнює з ринком
   */
  async compareMarket(item: string, quantity: number): Promise<{
    competitors: Array<{
      supplier: string;
      price: number;
      rating: number;
      leadTime: number;
    }>;
    bestValue: {
      supplier: string;
      price: number;
      reason: string;
    };
  }> {
    const competitors = [
      {
        supplier: "ABC Supplies",
        price: 45,
        rating: 4.5,
        leadTime: 5,
      },
      {
        supplier: "XYZ Materials",
        price: 42,
        rating: 4.2,
        leadTime: 7,
      },
      {
        supplier: "Quality Builders",
        price: 48,
        rating: 4.8,
        leadTime: 3,
      },
    ];

    const bestValue = {
      supplier: "XYZ Materials",
      price: 42,
      reason: "Lowest price with acceptable rating",
    };

    return { competitors, bestValue };
  }

  /**
   * Отримує знижки за обсяг
   */
  async negotiateVolumeDiscounts(vendorId: string, quantity: number): Promise<{
    tiers: Array<{
      minQuantity: number;
      discount: number; // у процентах
      pricePerUnit: number;
    }>;
    recommendedTier: {
      tier: number;
      quantity: number;
      discount: number;
      savings: number;
    };
  }> {
    const basePrice = 50;
    const tiers = [
      {
        minQuantity: 1,
        discount: 0,
        pricePerUnit: basePrice,
      },
      {
        minQuantity: 100,
        discount: 5,
        pricePerUnit: basePrice * 0.95,
      },
      {
        minQuantity: 500,
        discount: 10,
        pricePerUnit: basePrice * 0.90,
      },
      {
        minQuantity: 1000,
        discount: 15,
        pricePerUnit: basePrice * 0.85,
      },
    ];

    const recommendedTier = {
      tier: 2,
      quantity: 500,
      discount: 10,
      savings: quantity * basePrice * 0.10,
    };

    return { tiers, recommendedTier };
  }

  /**
   * Веде переговори про умови
   */
  async negotiateTerms(vendorId: string): Promise<{
    currentTerms: {
      payment: string;
      delivery: string;
      warranty: string;
    };
    proposedTerms: {
      payment: string;
      delivery: string;
      warranty: string;
    };
    benefits: string[];
  }> {
    const currentTerms = {
      payment: "Net 30",
      delivery: "14 days",
      warranty: "1 year",
    };

    const proposedTerms = {
      payment: "Net 45",
      delivery: "7 days",
      warranty: "2 years",
    };

    const benefits = [
      "Extended payment terms improve cash flow",
      "Faster delivery reduces project delays",
      "Extended warranty reduces risk",
    ];

    return { currentTerms, proposedTerms, benefits };
  }

  /**
   * Отримує конфігурацію агента
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

// Експорт синглтону
export const priceNegotiatorAgent = new PriceNegotiatorAgent();
