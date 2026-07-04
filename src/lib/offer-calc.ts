import { round2 } from "@/lib/utils";

export interface StageInput {
  stage_name: string;
  description?: string;
  cost: number;
  order_index?: number;
  /** Optional section/room label for grouping stages (e.g. "Łazienka"). */
  group_label?: string | null;
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

/** Non-blocking warnings surfaced before a contractor sends an estimate to a client. */
export function validateEstimateForSubmission(
  stages: Pick<StageInput, "stage_name" | "cost">[],
  opts: { clientName?: string } = {}
): string[] {
  const warnings: string[] = [];

  const zeroCost = stages.filter((s) => (Number(s.cost) || 0) <= 0);
  if (zeroCost.length === 1) {
    warnings.push(`Pozycja "${zeroCost[0]!.stage_name}" ma zerową cenę.`);
  } else if (zeroCost.length > 1) {
    warnings.push(`${zeroCost.length} pozycji ma zerową cenę.`);
  }

  if (!opts.clientName?.trim()) {
    warnings.push("Brak nazwy klienta / zamawiającego.");
  }

  return warnings;
}

export interface RateItem {
  name: string;
  unit: string;
  laborRate: number;
  materialRate: number;
}

/**
 * Flags labor/material rates far outside the given reference range — usually a
 * data-entry mistake (e.g. a misplaced decimal) rather than deliberate pricing.
 */
export function findOutlierRates(
  items: RateItem[],
  bounds: { min: number; max: number }
): string[] {
  const warnings: string[] = [];
  for (const item of items) {
    if (item.laborRate > 0 && (item.laborRate < bounds.min || item.laborRate > bounds.max)) {
      warnings.push(
        `"${item.name}": stawka robocizny ${item.laborRate} zł/${item.unit} odbiega od typowych wartości.`
      );
    }
    if (item.materialRate > 0 && (item.materialRate < bounds.min || item.materialRate > bounds.max)) {
      warnings.push(
        `"${item.name}": stawka materiału ${item.materialRate} zł/${item.unit} odbiega od typowych wartości.`
      );
    }
  }
  return warnings;
}

export interface StageGroup<T> {
  label: string | null;
  items: T[];
  subtotal: number;
}

/**
 * Groups stages by `group_label`, preserving first-seen order. Ungrouped
 * stages (null/empty label) are collected under a `null`-label group.
 */
export function groupStagesByLabel<T extends Pick<StageInput, "cost" | "group_label">>(
  stages: T[]
): StageGroup<T>[] {
  const groups = new Map<string | null, T[]>();
  for (const stage of stages) {
    const label = stage.group_label?.trim() || null;
    const bucket = groups.get(label);
    if (bucket) bucket.push(stage);
    else groups.set(label, [stage]);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({
    label,
    items,
    subtotal: round2(items.reduce((sum, s) => sum + (Number(s.cost) || 0), 0)),
  }));
}

/** Default professional construction stages used to seed the estimate form. */
export const DEFAULT_STAGES: StageInput[] = [
  { stage_name: "Logistics", description: "Transport, site setup, equipment rental", cost: 0, order_index: 0 },
  { stage_name: "Demolition", description: "Tear-out, debris removal, prep work", cost: 0, order_index: 1 },
  { stage_name: "Material", description: "Building materials sourced from wholesalers", cost: 0, order_index: 2 },
  { stage_name: "Labor", description: "Workforce, subcontractors", cost: 0, order_index: 3 },
];
