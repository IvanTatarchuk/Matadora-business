"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { type BoqItem } from "./boq";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export type OfferTemplate = "investor" | "contractor" | "developer";

export type OfferSection = {
  title: string;
  items: {
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
};

export type GeneratedOffer = {
  id: string;
  projectId: string;
  template: OfferTemplate;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  offerNumber: string;
  offerDate: string;
  validUntil: string;
  sections: OfferSection[];
  totalNet: number;
  totalVat: number;
  totalGross: number;
  notes?: string;
  terms?: string;
  paymentTerms?: string;
  status: "draft" | "sent" | "accepted" | "rejected";
  createdAt: string;
};

const TEMPLATE_CONFIG: Record<OfferTemplate, {
  name: string;
  description: string;
  defaultTerms: string;
  defaultPaymentTerms: string;
}> = {
  investor: {
    name: "Oferta dla inwestora prywatnego",
    description: "Szczegółowa oferta z podziałem na etapy i koszty",
    defaultTerms: "Oferta ważna 30 dni od daty wystawienia. Zastrzegamy sobie prawo do zmiany cen w przypadku zmian kosztów materiałów.",
    defaultPaymentTerms: "Płatność w ratach: 30% zaliczka, 40% po zakończeniu prac, 30% po odbiorze.",
  },
  contractor: {
    name: "Oferta dla generalnego wykonawcy",
    description: "Oferta podwykonawcza z harmonogramem i specyfikacją",
    defaultTerms: "Oferta ważna 14 dni. Prace wykonywane zgodnie z harmonogramem i specyfikacją techniczną.",
    defaultPaymentTerms: "Płatność miesięczna na podstawie protokołów odbioru częściowego.",
  },
  developer: {
    name: "Oferta dla dewelopera",
    description: "Kompleksowa oferta wieloetapowa z gwarancjami",
    defaultTerms: "Oferta ważna 21 dni. Gwarancja jakości 5 lat na wykonane prace.",
    defaultPaymentTerms: "Płatność zgodnie z harmonogramem płatności FDD.",
  },
};

export async function generateOfferFromBoq(input: {
  projectId: string;
  boqDocumentId: string;
  template: OfferTemplate;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  validDays?: number;
  notes?: string;
}): Promise<{ ok: boolean; offerId?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  // Get BoQ items
  const { data: boqItems, error: boqError } = await db(supabase)
    .from("boq_items")
    .select("*")
    .eq("document_id", input.boqDocumentId)
    .order("sort_order");
  if (boqError || !boqItems) return { ok: false, error: "Błąd pobierania pozycji przedmiaru" };

  // Group by section
  const sectionsMap = new Map<string, BoqItem[]>();
  boqItems.forEach((item: BoqItem) => {
    const section = item.section ?? "Pozycje ogólne";
    if (!sectionsMap.has(section)) sectionsMap.set(section, []);
    sectionsMap.get(section)!.push(item);
  });

  const sections: OfferSection[] = Array.from(sectionsMap.entries()).map(([section, items]) => ({
    title: section,
    items: items.map((item: BoqItem) => ({
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      total: item.total_net,
    })),
    subtotal: items.reduce((sum: number, item: BoqItem) => sum + item.total_net, 0),
  }));

  const totalNet = sections.reduce((sum: number, s: OfferSection) => sum + s.subtotal, 0);
  const totalVat = boqItems.reduce((sum: number, item: BoqItem) => sum + item.total_vat, 0);
  const totalGross = totalNet + totalVat;

  const offerNumber = `OF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const validUntil = new Date(Date.now() + (input.validDays || 30) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const templateConfig = TEMPLATE_CONFIG[input.template];

  const { data: offer, error: offerError } = await db(supabase)
    .from("generated_offers")
    .insert({
      project_id: input.projectId,
      org_id: member.org_id,
      created_by: user.id,
      template: input.template,
      client_name: input.clientName,
      client_email: input.clientEmail ?? null,
      client_address: input.clientAddress ?? null,
      offer_number: offerNumber,
      offer_date: new Date().toISOString().slice(0, 10),
      valid_until: validUntil,
      sections: sections as any,
      total_net: totalNet,
      total_vat: totalVat,
      total_gross: totalGross,
      notes: input.notes ?? null,
      terms: templateConfig.defaultTerms,
      payment_terms: templateConfig.defaultPaymentTerms,
      status: "draft",
    })
    .select("id")
    .single();

  if (offerError || !offer) return { ok: false, error: offerError?.message ?? "Błąd tworzenia oferty" };

  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/oferty`);
  return { ok: true, offerId: offer.id };
}

export async function listGeneratedOffers(projectId: string): Promise<GeneratedOffer[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("generated_offers")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as GeneratedOffer[];
}

export async function updateOfferStatus(
  id: string, projectId: string, status: GeneratedOffer["status"]
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase)
    .from("generated_offers")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/oferty`);
  return { ok: true };
}

export async function deleteGeneratedOffer(id: string, projectId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("generated_offers")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/oferty`);
  return { ok: true };
}
