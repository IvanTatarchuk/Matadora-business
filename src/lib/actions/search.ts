"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchResultType = "project" | "offer" | "worker" | "material" | "inventory" | "document";

export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  url: string;
  metadata?: Record<string, any>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function globalSearch(query: string, type?: SearchResultType): Promise<SearchResult[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const results: SearchResult[] = [];
  const searchLower = query.toLowerCase();

  // Search projects
  if (!type || type === "project") {
    const { data: projects } = await db(supabase)
      .from("projects")
      .select("id, name, status, location")
      .eq("org_id", member.org_id)
      .ilike("name", `%${searchLower}%`)
      .limit(10);
    
    for (const p of projects ?? []) {
      results.push({
        id: p.id,
        type: "project",
        title: p.name,
        subtitle: `Projekt • ${p.status}`,
        url: `/dashboard/contractor/projects/${p.id}`,
        metadata: { status: p.status, location: p.location },
      });
    }
  }

  // Search offers
  if (!type || type === "offer") {
    const { data: offers } = await db(supabase)
      .from("offers")
      .select("id, project_id, status, total_net")
      .eq("created_by", user.id)
      .ilike("title", `%${searchLower}%`)
      .limit(10);
    
    for (const o of offers ?? []) {
      results.push({
        id: o.id,
        type: "offer",
        title: o.title || `Oferta #${o.id.slice(0, 8)}`,
        subtitle: `Oferta • ${o.status} • ${Number(o.total_net).toLocaleString("pl-PL")} PLN`,
        url: `/dashboard/contractor/offers/${o.id}`,
        metadata: { status: o.status, amount: o.total_net },
      });
    }
  }

  // Search workers
  if (!type || type === "worker") {
    const { data: workers } = await db(supabase)
      .from("workers")
      .select("id, full_name, specialty, hourly_rate")
      .eq("org_id", member.org_id)
      .ilike("full_name", `%${searchLower}%`)
      .limit(10);
    
    for (const w of workers ?? []) {
      results.push({
        id: w.id,
        type: "worker",
        title: w.full_name,
        subtitle: `Pracownik • ${w.specialty || "Brak specjalizacji"} • ${w.hourly_rate ? `${w.hourly_rate} PLN/h` : "-"}`,
        url: `/dashboard/workers`,
        metadata: { specialty: w.specialty, hourlyRate: w.hourly_rate },
      });
    }
  }

  // Search materials catalog
  if (!type || type === "material") {
    const { data: materials } = await db(supabase)
      .from("materials_catalog")
      .select("id, name, category, unit_price")
      .eq("org_id", member.org_id)
      .ilike("name", `%${searchLower}%`)
      .limit(10);
    
    for (const m of materials ?? []) {
      results.push({
        id: m.id,
        type: "material",
        title: m.name,
        subtitle: `Materiał • ${m.category || "Inne"} • ${m.unit_price ? `${Number(m.unit_price).toLocaleString("pl-PL")} PLN` : "-"}`,
        url: `/dashboard/wholesaler/catalog`,
        metadata: { category: m.category, price: m.unit_price },
      });
    }
  }

  // Search inventory
  if (!type || type === "inventory") {
    const { data: inventory } = await db(supabase)
      .from("inventory_items")
      .select("id, name, sku, current_stock, unit")
      .eq("org_id", member.org_id)
      .or(`name.ilike.%${searchLower}%,sku.ilike.%${searchLower}%`)
      .limit(10);
    
    for (const i of inventory ?? []) {
      results.push({
        id: i.id,
        type: "inventory",
        title: i.name,
        subtitle: `Magazyn • ${i.sku} • Stan: ${i.current_stock} ${i.unit}`,
        url: `/dashboard/inventory`,
        metadata: { sku: i.sku, stock: i.current_stock, unit: i.unit },
      });
    }
  }

  // Search documents
  if (!type || type === "document") {
    const { data: documents } = await db(supabase)
      .from("project_documents")
      .select("id, name, category, project_id")
      .eq("org_id", member.org_id)
      .ilike("name", `%${searchLower}%`)
      .limit(10);
    
    for (const d of documents ?? []) {
      results.push({
        id: d.id,
        type: "document",
        title: d.name,
        subtitle: `Dokument • ${d.category || "Inne"}`,
        url: `/dashboard/contractor/projects/${d.project_id}/dokumenty`,
        metadata: { category: d.category, projectId: d.project_id },
      });
    }
  }

  return results;
}

export async function getRecentSearches(userId: string): Promise<string[]> {
  const supabase = createClient();
  const { data } = await db(supabase)
    .from("search_history")
    .select("query")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  
  return (data ?? []).map((s: { query: string }) => s.query);
}

export async function saveSearch(query: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await db(supabase).from("search_history").upsert({
    user_id: user.id,
    query,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,query" });
}
