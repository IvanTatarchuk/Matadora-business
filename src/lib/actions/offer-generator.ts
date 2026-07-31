"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { type BoqItem } from "./boq";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export type OfferTemplate = 
  | "investor" 
  | "contractor" 
  | "developer"
  | "renovation"
  | "new_construction"
  | "commercial"
  | "industrial"
  | "infrastructure"
  | "knr_standard"
  | "knr_simplified"
  | "material_labor"
  | "public_sector"
  | "private_client";

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
  defaultVatRate: number;
}> = {
  investor: {
    name: "Oferta dla inwestora prywatnego",
    description: "Szczegółowa oferta z podziałem na etapy i koszty",
    defaultTerms: "Oferta ważna 30 dni od daty wystawienia. Zastrzegamy sobie prawo do zmiany cen w przypadku zmian kosztów materiałów.",
    defaultPaymentTerms: "Płatność w ratach: 30% zaliczka, 40% po zakończeniu prac, 30% po odbiorze.",
    defaultVatRate: 8,
  },
  contractor: {
    name: "Oferta dla generalnego wykonawcy",
    description: "Oferta podwykonawcza z harmonogramem i specyfikacją",
    defaultTerms: "Oferta ważna 14 dni. Prace wykonywane zgodnie z harmonogramem i specyfikacją techniczną.",
    defaultPaymentTerms: "Płatność miesięczna na podstawie protokołów odbioru częściowego.",
    defaultVatRate: 23,
  },
  developer: {
    name: "Oferta dla dewelopera",
    description: "Kompleksowa oferta wieloetapowa z gwarancjami",
    defaultTerms: "Oferta ważna 21 dni. Gwarancja jakości 5 lat na wykonane prace.",
    defaultPaymentTerms: "Płatność zgodnie z harmonogramem płatności FDD.",
    defaultVatRate: 8,
  },
  renovation: {
    name: "Kosztorys remontu",
    description: "Szczegółowy kosztorys prac remontowych z podziałem na pomieszczenia",
    defaultTerms: "Oferta ważna 14 dni od daty wystawienia. Zastrzegamy sobie prawo do weryfikacji stanu technicznego przed rozpoczęciem prac.",
    defaultPaymentTerms: "Płatność w ratach: 40% zaliczka, 30% po połowie prac, 30% po odbiorze końcowym.",
    defaultVatRate: 8,
  },
  new_construction: {
    name: "Kosztorys nowego budynku",
    description: "Kompleksowy kosztorys budowy od fundamentów do stanu deweloperskiego",
    defaultTerms: "Oferta ważna 30 dni. Ceny mogą ulec zmianie w przypadku zmian kosztów materiałów lub robocizny.",
    defaultPaymentTerms: "Płatność etapowa zgodnie z harmonogramem: fundamenty 20%, stan surowy 25%, stan deweloperski 30%, odbiór 25%.",
    defaultVatRate: 8,
  },
  commercial: {
    name: "Kosztorys obiektu komercyjnego",
    description: "Profesjonalny kosztorys dla powierzchni biurowych, handlowych i usługowych",
    defaultTerms: "Oferta ważna 21 dni. Wymaga szczegółowej specyfikacji technicznej.",
    defaultPaymentTerms: "Płatność miesięczna na podstawie protokołów postępu prac. Zaliczka 15%.",
    defaultVatRate: 23,
  },
  industrial: {
    name: "Kosztorys obiektu przemysłowego",
    description: "Specjalistyczny kosztorys dla hal produkcyjnych, magazynów i obiektów przemysłowych",
    defaultTerms: "Oferta ważna 30 dni. Wymaga uzgodnień technicznych przed rozpoczęciem.",
    defaultPaymentTerms: "Płatność etapowa: fundamenty i konstrukcja 30%, instalacje 25%, wykończenie 25%, odbiór 20%.",
    defaultVatRate: 23,
  },
  infrastructure: {
    name: "Kosztorys infrastruktury",
    description: "Kosztorys prac infrastrukturalnych: drogi, sieci, uzbrojenie terenu",
    defaultTerms: "Oferta ważna 30 dni. Ceny uzależnione od warunków gruntowych.",
    defaultPaymentTerms: "Płatność zgodnie z harmonogramem realizacji etapów.",
    defaultVatRate: 23,
  },
  knr_standard: {
    name: "Kosztorys KNR (standard)",
    description: "Oficjalny kosztorys zgodny z normami KNR dla przetargów publicznych",
    defaultTerms: "Oferta ważna 30 dni. Kosztorys sporządzony zgodnie z Katalogiem Norm Rozpadowych.",
    defaultPaymentTerms: "Płatność zgodnie z umową i protokołami odbioru.",
    defaultVatRate: 23,
  },
  knr_simplified: {
    name: "Kosztorys KNR (uproszczony)",
    description: "Uproszczony kosztorys KNR dla małych projektów i klientów prywatnych",
    defaultTerms: "Oferta ważna 14 dni. Kosztorys oparty na uproszczonych normach.",
    defaultPaymentTerms: "Płatność w ratach: 50% zaliczka, 50% po odbiorze.",
    defaultVatRate: 8,
  },
  material_labor: {
    name: "Kosztorys materiał + robocizna",
    description: "Szczegółowy podział na materiały i robociznę dla pełnej transparacji kosztów",
    defaultTerms: "Oferta ważna 21 dni. Ceny materiałów mogą ulec zmianie.",
    defaultPaymentTerms: "Płatność etapowa: materiały z góry, robocizna po wykonaniu.",
    defaultVatRate: 23,
  },
  public_sector: {
    name: "Kosztorys sektora publicznego",
    description: "Oficjalny kosztorys zgodny z wymogami zamówień publicznych",
    defaultTerms: "Oferta ważna 30 dni. Wymaga pełnej dokumentacji technicznej.",
    defaultPaymentTerms: "Płatność zgodnie z ustawą o zamówieniach publicznych i protokołami odbioru.",
    defaultVatRate: 23,
  },
  private_client: {
    name: "Kosztorys dla klienta prywatnego",
    description: "Prosty i przejrzysty kosztorys dla osób prywatnych",
    defaultTerms: "Oferta ważna 14 dni. Bez zbędnej formalności.",
    defaultPaymentTerms: "Płatność elastyczna: zaliczka 30%, reszta po zakończeniu prac.",
    defaultVatRate: 8,
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

export async function signOffer(
  id: string, projectId: string, signatureData: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const { error } = await db(supabase)
    .from("generated_offers")
    .update({ 
      signature_data: signatureData,
      signed_at: new Date().toISOString(),
      signed_by: user.id,
      status: "accepted"
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${projectId}/oferty`);
  return { ok: true };
}
