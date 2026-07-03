import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HardHat, CheckCircle2, MapPin, Ruler, Globe, Phone } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { acceptOffer } from "@/lib/actions/offers";
import { OfferSummary } from "@/components/offers/offer-summary";
import { PrintButton } from "@/components/offers/print-button";
import { RatingStars } from "@/components/trust/rating-stars";
import { VerifiedBadge } from "@/components/trust/verified-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PublicOfferView({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { accepted?: string };
}) {
  const supabase = createAdminClient();

  const { data: offer } = await supabase
    .from("offers")
    .select("*")
    .eq("public_token", params.token)
    .single();

  if (!offer) notFound();

  const [
    { data: project },
    { data: stages },
    { data: contractor },
    { data: materialRows },
  ] = await Promise.all([
      supabase
        .from("projects")
        .select("title, address, surface_area")
        .eq("id", offer.project_id)
        .single(),
      supabase
        .from("offer_stages")
        .select("stage_name, description, cost, order_index")
        .eq("offer_id", offer.id)
        .order("order_index"),
      supabase
        .from("profiles")
        .select(
          "id, company_name, full_name, city, phone, logo_url, nip, company_address, website, is_verified, rating_avg, rating_count"
        )
        .eq("id", offer.contractor_id)
        .single(),
      supabase
        .from("offer_materials")
        .select("quantity, price_net, materials_catalog(product_name, unit)")
        .eq("offer_id", offer.id),
    ]);

  const materials = (materialRows ?? []).map((row) => {
    const cat = row.materials_catalog as unknown as
      | { product_name: string; unit: string }
      | { product_name: string; unit: string }[]
      | null;
    const m = Array.isArray(cat) ? cat[0] : cat;
    return {
      product_name: m?.product_name ?? "Material",
      unit: m?.unit ?? "szt",
      quantity: Number(row.quantity),
      price_net: Number(row.price_net),
    };
  });

  const accepted = offer.status === "accepted" || searchParams.accepted === "1";

  return (
    <div className="min-h-screen bg-muted/40 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <HardHat className="h-6 w-6 text-primary" /> matadora.business
          </div>
          <div className="flex items-center gap-3">
            <PrintButton />
            <Badge variant={accepted ? "success" : "default"}>
              {accepted ? "Accepted" : offer.status}
            </Badge>
          </div>
        </div>

        {(contractor?.logo_url || contractor?.company_name) && (
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              {contractor?.logo_url && (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                  <Image
                    src={contractor.logo_url}
                    alt={contractor.company_name || "Logo"}
                    width={64}
                    height={64}
                    className="h-full w-full object-contain"
                    unoptimized
                  />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-lg font-semibold">
                    {contractor?.company_name || contractor?.full_name}
                  </p>
                  {contractor?.is_verified && <VerifiedBadge />}
                </div>
                {typeof contractor?.rating_avg === "number" && (
                  <div className="mt-0.5">
                    <RatingStars
                      value={Number(contractor.rating_avg)}
                      count={contractor.rating_count}
                    />
                  </div>
                )}
                {contractor?.nip && (
                  <p className="text-xs text-muted-foreground">
                    NIP: {contractor.nip}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {contractor?.company_address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {contractor.company_address}
                    </span>
                  )}
                  {contractor?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {contractor.phone}
                    </span>
                  )}
                  {contractor?.website && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {contractor.website}
                    </span>
                  )}
                </div>
                {contractor?.id && (
                  <Link
                    href={`/firm/${contractor.id}`}
                    className="mt-1 inline-block text-xs font-medium text-primary hover:underline print:hidden"
                  >
                    View company profile →
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{offer.title}</CardTitle>
            <p className="text-muted-foreground">{project?.title}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {project?.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {project.address}
                </span>
              )}
              {project?.surface_area ? (
                <span className="flex items-center gap-1">
                  <Ruler className="h-4 w-4" /> {project.surface_area} m²
                </span>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <OfferSummary
              stages={stages ?? []}
              materials={materials}
              vatRate={Number(offer.vat_rate)}
              totalNet={Number(offer.total_net)}
              totalGross={Number(offer.total_gross)}
            />
          </CardContent>
        </Card>

        <Card className="print:hidden">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            {accepted ? (
              <>
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                <div>
                  <p className="text-lg font-semibold">Offer accepted</p>
                  <p className="text-sm text-muted-foreground">
                    {contractor?.company_name || contractor?.full_name} has been
                    notified. Material orders will be dispatched to wholesalers.
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Review the estimate above. Accepting confirms the scope and
                  pricing with{" "}
                  <span className="font-medium text-foreground">
                    {contractor?.company_name || contractor?.full_name}
                  </span>
                  .
                </p>
                <form
                  action={async () => {
                    "use server";
                    await acceptOffer(params.token);
                  }}
                >
                  <Button size="lg" type="submit">
                    <CheckCircle2 className="h-5 w-5" /> Accept offer
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Powered by matadora.business — transparent construction estimates.
        </p>
      </div>
    </div>
  );
}
