"use server";

import { createClient } from "@/lib/supabase/server";

export type CostItem = {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  labor_rate: number;
  material_rate: number;
};

const DEFAULT_LIMIT = 25;

/** Trigram-backed search over the cost_items catalog (public read, no auth required). */
export async function searchCostItems(query: string): Promise<CostItem[]> {
  const supabase = createClient();
  const trimmed = query.trim();

  if (!trimmed) {
    const { data } = await supabase
      .from("cost_items")
      .select("id, code, name, category, unit, labor_rate, material_rate")
      .order("category", { ascending: true })
      .order("name", { ascending: true })
      .limit(DEFAULT_LIMIT);
    return (data ?? []) as CostItem[];
  }

  const { data } = await supabase
    .from("cost_items")
    .select("id, code, name, category, unit, labor_rate, material_rate")
    .or(`name.ilike.%${trimmed}%,code.ilike.%${trimmed}%`)
    .order("name", { ascending: true })
    .limit(DEFAULT_LIMIT);

  return (data ?? []) as CostItem[];
}
