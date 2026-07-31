import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Send, Link as LinkIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { sendOffer } from "@/lib/actions/offers";
import { OfferSummary } from "@/components/offers/offer-summary";
import { PrintButton } from "@/components/offers/print-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success"> = {
  draft: "secondary",
  sent: "default",
  accepted: "success",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Szkic",
  sent: "Wysłany",
  accepted: "Zaakceptowany",
};

export default async function OfferDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: offer } = await supabase
    .from("offers")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!offer) notFound();

  const { data: project } = await supabase
    .from("projects")
    .select("title, address, surface_area")
    .eq("id", offer.project_id)
    .single();

  const { data: stages } = await supabase
    .from("offer_stages")
    .select("stage_name, description, cost, order_index, group_label")
    .eq("offer_id", offer.id)
    .order("order_index");

  const { data: materialRows } = await supabase
    .from("offer_materials")
    .select("quantity, price_net, materials_catalog(product_name, unit)")
    .eq("offer_id", offer.id);

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

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const shareUrl = `${siteUrl}/offer/${offer.public_token}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard/contractor/offers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Wróć do kosztorysów
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{offer.title}</h1>
          <p className="text-muted-foreground">{project?.title}</p>
        </div>
        <div className="flex items-center gap-3">
          <PrintButton />
          <Badge variant={STATUS_VARIANT[offer.status] ?? "secondary"}>
            {STATUS_LABEL[offer.status] ?? offer.status}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kosztorys</CardTitle>
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
        <CardHeader>
          <CardTitle>Udostępnij inwestorowi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm">
            <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{shareUrl}</span>
          </div>
          {offer.status === "draft" ? (
            <form
              action={async () => {
                "use server";
                await sendOffer(offer.id);
              }}
            >
              <Button type="submit">
                <Send className="h-4 w-4" /> Wyślij kosztorys do inwestora
              </Button>
            </form>
          ) : (
            <Button variant="outline" asChild>
              <a href={shareUrl} target="_blank" rel="noreferrer">
                Otwórz widok inwestora
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
