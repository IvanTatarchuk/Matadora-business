import { round2 } from "@/lib/utils";

export interface StageInput {
  stage_name: string;
  description?: string;
  cost: number;
  order_index?: number;
}

export interface OfferTotals {
  totalNet: number;
  vatAmount: number;
  totalGross: number;
}

/** Standard Polish VAT rates relevant to construction. */
export const VAT_RATES = [
  { value: 8, label: "8% (renovation / housing)" },
  { value: 23, label: "23% (standard)" },
] as const;

export type VatRate = (typeof VAT_RATES)[number]["value"];

/** Sum stage costs (net) and apply VAT to produce offer totals. */
export function computeOfferTotals(
  stages: Pick<StageInput, "cost">[],
  vatRate: number
): OfferTotals {
  const totalNet = round2(
    stages.reduce((sum, s) => sum + (Number(s.cost) || 0), 0)
  );
  const vatAmount = round2(totalNet * (vatRate / 100));
  const totalGross = round2(totalNet + vatAmount);
  return { totalNet, vatAmount, totalGross };
}

/** Default professional construction stages used to seed the estimate form. */
export const DEFAULT_STAGES: StageInput[] = [
  { stage_name: "Logistics", description: "Transport, site setup, equipment rental", cost: 0, order_index: 0 },
  { stage_name: "Demolition", description: "Tear-out, debris removal, prep work", cost: 0, order_index: 1 },
  { stage_name: "Material", description: "Building materials sourced from wholesalers", cost: 0, order_index: 2 },
  { stage_name: "Labor", description: "Workforce, subcontractors", cost: 0, order_index: 3 },
];
