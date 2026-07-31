"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeOfferTotals, type StageInput } from "@/lib/offer-calc";
import { emailNewBid, emailOfferAccepted } from "@/lib/email";

export interface CreateOfferPayload {
  projectTitle: string;
  address: string;
  surfaceArea: number;
  offerTitle: string;
  vatRate: number;
  investorEmail?: string;
  /** When bidding on an existing marketplace project, its id. */
  projectId?: string;
  stages: StageInput[];
  materialItems: { materialId: string; quantity: number }[];
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  offerId?: string;
}

/**
 * Creates a project + offer + stages in one transaction-like flow.
 * Called from the contractor multi-step form.
 */
export async function createOffer(
  payload: CreateOfferPayload
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  // Two modes:
  //  (a) Bidding on an existing marketplace project (payload.projectId set).
  //  (b) Contractor-initiated estimate that also creates a self-owned project.
  const isBid = Boolean(payload.projectId);
  let projectId: string;

  if (isBid) {
    // Verify the target project exists and is open to bids.
    const { data: target, error: targetError } = await supabase
      .from("projects")
      .select("id, status")
      .eq("id", payload.projectId!)
      .single();
    if (targetError || !target) {
      return { ok: false, error: "Nie znaleziono projektu" };
    }
    if (target.status !== "open") {
      return { ok: false, error: "Ten projekt nie jest otwarty na oferty" };
    }
    projectId = target.id;

    // Notify investor of the new bid (non-blocking).
    void Promise.resolve(
      supabase
        .from("projects")
        .select("investor_id")
        .eq("id", projectId)
        .single()
    ).then(async ({ data: proj }) => {
        if (!proj) return;
        const [{ data: inv }, { data: con }] = await Promise.all([
          supabase.from("profiles").select("full_name, company_name").eq("id", proj.investor_id).single(),
          supabase.from("profiles").select("full_name, company_name").eq("id", user.id).single(),
        ]);
        const invEmail = (await supabase.auth.admin?.getUserById?.(proj.investor_id))?.data?.user?.email ?? "";
        if (invEmail && inv && con) {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://buildmate-app-nu.vercel.app";
          emailNewBid({
            investorEmail: invEmail,
            investorName: inv.full_name ?? inv.company_name ?? "Inwestor",
            contractorName: con.full_name ?? con.company_name ?? "Wykonawca",
            projectTitle: payload.projectTitle ?? target.id,
            offerTotal: 0,
            offerUrl: `${siteUrl}/dashboard/investor/offers`,
          });
        }
      })
      .catch(() => {});
  } else {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        title: payload.projectTitle,
        address: payload.address,
        surface_area: payload.surfaceArea,
        contractor_id: user.id,
        investor_id: user.id, // self-owned until an investor is linked
        status: "open",
      })
      .select("id")
      .single();

    if (projectError || !project) {
      return { ok: false, error: projectError?.message ?? "Nie udało się utworzyć projektu" };
    }
    projectId = project.id;
  }

  const { totalNet, totalGross } = computeOfferTotals(
    payload.stages,
    payload.vatRate
  );

  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .insert({
      project_id: projectId,
      contractor_id: user.id,
      title: payload.offerTitle,
      total_net: totalNet,
      total_gross: totalGross,
      vat_rate: payload.vatRate,
      // A marketplace bid is sent to the investor immediately; a self-initiated
      // estimate starts as a draft the contractor sends later.
      status: isBid ? "sent" : "draft",
      ...(isBid ? { sent_at: new Date().toISOString() } : {}),
    })
    .select("id")
    .single();

  if (offerError || !offer) {
    return { ok: false, error: offerError?.message ?? "Nie udało się utworzyć kosztorysu" };
  }

  if (payload.stages.length > 0) {
    const { error: stagesError } = await supabase.from("offer_stages").insert(
      payload.stages.map((s, i) => ({
        offer_id: offer.id,
        stage_name: s.stage_name,
        description: s.description ?? null,
        cost: s.cost,
        order_index: s.order_index ?? i,
        group_label: s.group_label?.trim() || null,
      }))
    );
    if (stagesError) return { ok: false, error: stagesError.message };
  }

  // Link selected catalog materials to the offer (snapshot current net price).
  if (payload.materialItems.length > 0) {
    const materialIds = payload.materialItems.map((m) => m.materialId);
    const { data: catalog } = await supabase
      .from("materials_catalog")
      .select("id, price_net")
      .in("id", materialIds);

    const priceById = new Map(
      (catalog ?? []).map((m) => [m.id, Number(m.price_net)])
    );

    const rows = payload.materialItems
      .filter((m) => priceById.has(m.materialId) && m.quantity > 0)
      .map((m) => ({
        offer_id: offer.id,
        material_id: m.materialId,
        quantity: m.quantity,
        price_net: priceById.get(m.materialId) ?? 0,
      }));

    if (rows.length > 0) {
      const { error: materialsError } = await supabase
        .from("offer_materials")
        .insert(rows);
      if (materialsError) return { ok: false, error: materialsError.message };
    }
  }

  revalidatePath("/dashboard/contractor");
  revalidatePath("/dashboard/investor");
  return { ok: true, offerId: offer.id };
}

/** Contractor sends an offer to the investor (status draft -> sent). */
export async function sendOffer(offerId: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("offers")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", offerId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/contractor");
  return { ok: true, offerId };
}

/**
 * Investor accepts an offer via the public link.
 * Marks it accepted and generates one pending order per wholesaler whose
 * catalog materials are referenced by the offer.
 *
 * Uses the service-role (admin) client because the public offer link is
 * authorized by its token, not by an authenticated session — the visitor may
 * be anonymous, so RLS would otherwise block the status update and inserts.
 * Requires SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY).
 */
export async function acceptOffer(publicToken: string): Promise<ActionResult> {
  const admin = createAdminClient();

  const { data: offer, error: findError } = await admin
    .from("offers")
    .select("id, status, project_id, contractor_id")
    .eq("public_token", publicToken)
    .single();

  if (findError || !offer) {
    return { ok: false, error: "Nie znaleziono kosztorysu" };
  }

  if (offer.status !== "accepted") {
    const { error: updateError } = await admin
      .from("offers")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", offer.id);
    if (updateError) return { ok: false, error: updateError.message };

    // Assign the winning contractor to the project and move it into execution.
    const { data: projectData, error: projectError } = await admin
      .from("projects")
      .update({ contractor_id: offer.contractor_id, status: "in_progress" })
      .eq("id", offer.project_id)
      .select("title, investor_id")
      .single();
    if (projectError) return { ok: false, error: projectError.message };

    // Email contractor — offer accepted (non-blocking).
    if (projectData && offer.contractor_id) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://buildmate-app-nu.vercel.app";
      void Promise.resolve(
        admin
          .from("profiles")
          .select("full_name, company_name")
          .eq("id", offer.contractor_id)
          .single()
      ).then(async ({ data: con }) => {
          if (!con) return;
          const { data: authData } = await admin.auth.admin.getUserById(offer.contractor_id);
          const email = authData?.user?.email;
          if (!email) return;
          const { data: inv } = await admin
            .from("profiles")
            .select("full_name, company_name")
            .eq("id", projectData.investor_id)
            .single();
          emailOfferAccepted({
            contractorEmail: email,
            contractorName: con.full_name ?? con.company_name ?? "Wykonawca",
            projectTitle: projectData.title,
            investorName: inv?.full_name ?? inv?.company_name ?? "Inwestor",
            dashboardUrl: `${siteUrl}/dashboard/contractor/projects`,
          });
      }).catch(() => {});
    }

    // Reject the other competing offers on the same project.
    await admin
      .from("offers")
      .update({ status: "rejected" })
      .eq("project_id", offer.project_id)
      .neq("id", offer.id)
      .neq("status", "rejected");
  }

  // Generate wholesaler orders from the offer's materials (idempotent).
  const generateError = await generateOrdersForOffer(admin, offer.id);
  if (generateError) return { ok: false, error: generateError };

  revalidatePath(`/offer/${publicToken}`);
  redirect(`/offer/${publicToken}?accepted=1`);
}

/**
 * Creates one pending order per wholesaler for an accepted offer.
 * Skips wholesalers that already have an order for this offer, so repeated
 * acceptance is safe. Returns an error message string, or null on success.
 */
async function generateOrdersForOffer(
  admin: ReturnType<typeof createAdminClient>,
  offerId: string
): Promise<string | null> {
  const { data: items, error: itemsError } = await admin
    .from("offer_materials")
    .select("material_id, quantity, price_net")
    .eq("offer_id", offerId);

  if (itemsError) return itemsError.message;
  if (!items || items.length === 0) return null; // nothing to order

  const { data: materials, error: matError } = await admin
    .from("materials_catalog")
    .select("id, wholesaler_id")
    .in(
      "id",
      items.map((i) => i.material_id)
    );

  if (matError) return matError.message;

  const wholesalerByMaterial = new Map(
    (materials ?? []).map((m) => [m.id, m.wholesaler_id])
  );

  // Sum line totals per wholesaler.
  const totals = new Map<string, number>();
  for (const item of items) {
    const wholesalerId = wholesalerByMaterial.get(item.material_id);
    if (!wholesalerId) continue;
    const line = Number(item.quantity) * Number(item.price_net);
    totals.set(wholesalerId, (totals.get(wholesalerId) ?? 0) + line);
  }

  if (totals.size === 0) return null;

  // Skip wholesalers that already have an order for this offer (idempotency).
  const { data: existing } = await admin
    .from("orders")
    .select("wholesaler_id")
    .eq("offer_id", offerId);
  const existingWholesalers = new Set(
    (existing ?? []).map((o) => o.wholesaler_id)
  );

  const rows = Array.from(totals.entries())
    .filter(([wholesalerId]) => !existingWholesalers.has(wholesalerId))
    .map(([wholesalerId, total]) => ({
      offer_id: offerId,
      wholesaler_id: wholesalerId,
      status: "pending" as const,
      total_amount: Math.round(total * 100) / 100,
    }));

  if (rows.length === 0) return null;

  const { error: insertError } = await admin.from("orders").insert(rows);
  return insertError ? insertError.message : null;
}
