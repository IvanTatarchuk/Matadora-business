import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, CalendarClock, Ruler, ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPLN } from "@/lib/utils";

const OFFER_VARIANT: Record<string, "default" | "secondary" | "success"> = {
  draft: "secondary",
  sent: "default",
  accepted: "success",
  rejected: "secondary",
};

const OFFER_LABEL: Record<string, string> = {
  draft: "Szkic",
  sent: "Wysłana",
  accepted: "Zaakceptowana",
  rejected: "Odrzucona",
};

const PROJECT_STATUS_LABEL: Record<string, string> = {
  draft: "Szkic",
  open: "Otwarty",
  in_progress: "W trakcie",
  completed: "Zakończony",
  cancelled: "Anulowany",
};

export default async function MarketplaceProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!project) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const isOwner = project.investor_id === user!.id;
  const isContractor = profile?.role === "contractor";

  // Offers: RLS shows the investor all bids; a contractor sees only their own.
  const { data: offers } = await supabase
    .from("offers")
    .select("id, title, status, total_gross, public_token, contractor_id, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const offerList = offers ?? [];
  const myOffer = offerList.find((o) => o.contractor_id === user!.id);
  const canBid = isContractor && !isOwner && project.status === "open" && !myOffer;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/marketplace"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Wróć do rynku ofert
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{project.title}</h1>
            <Badge variant="secondary">{PROJECT_STATUS_LABEL[project.status] ?? project.status}</Badge>
          </div>
          {project.category && (
            <p className="text-sm text-muted-foreground">{project.category}</p>
          )}
        </div>

        {canBid && (
          <Button asChild>
            <Link href={`/dashboard/marketplace/${project.id}/bid`}>
              Złóż ofertę
            </Link>
          </Button>
        )}
        {myOffer && (
          <Badge variant={OFFER_VARIANT[myOffer.status] ?? "secondary"}>
            Twoja oferta: {OFFER_LABEL[myOffer.status] ?? myOffer.status}
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          {project.description && (
            <p className="whitespace-pre-wrap text-sm">{project.description}</p>
          )}
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {project.address && (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {project.address}
              </p>
            )}
            {project.surface_area != null && (
              <p className="flex items-center gap-2">
                <Ruler className="h-4 w-4" /> {project.surface_area} m²
              </p>
            )}
            {project.deadline && (
              <p className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />{" "}
                {new Date(project.deadline).toLocaleDateString("pl-PL")}
              </p>
            )}
            {(project.budget_min || project.budget_max) && (
              <p className="font-semibold text-foreground">
                Budżet: {formatPLN(Number(project.budget_min ?? 0))} –{" "}
                {formatPLN(Number(project.budget_max ?? 0))}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Otrzymane oferty ({offerList.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {offerList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Brak ofert.
              </p>
            ) : (
              <div className="divide-y">
                {offerList.map((o) => (
                  <Link
                    key={o.id}
                    href={`/offer/${o.public_token}`}
                    className="flex items-center justify-between py-3 hover:bg-muted/50"
                  >
                    <p className="font-medium">{o.title}</p>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">
                        {formatPLN(Number(o.total_gross))}
                      </span>
                      <Badge variant={OFFER_VARIANT[o.status] ?? "secondary"}>
                        {OFFER_LABEL[o.status] ?? o.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
