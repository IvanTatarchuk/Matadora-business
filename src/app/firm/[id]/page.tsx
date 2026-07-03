import Image from "next/image";
import { notFound } from "next/navigation";
import { HardHat, MapPin, Phone, Globe, Building2 } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RatingStars } from "@/components/trust/rating-stars";
import { VerifiedBadge } from "@/components/trust/verified-badge";

export default async function FirmProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createAdminClient();

  const { data: firm } = await supabase
    .from("profiles")
    .select(
      "id, company_name, full_name, city, phone, website, bio, logo_url, nip, company_address, is_verified, rating_avg, rating_count, role"
    )
    .eq("id", params.id)
    .single();

  if (!firm) notFound();

  const [{ data: reviews }, { count: completedCount }] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, rating, comment, created_at, reviewer_id")
      .eq("reviewee_id", firm.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("contractor_id", firm.id)
      .eq("status", "completed"),
  ]);

  const reviewerIds = Array.from(
    new Set((reviews ?? []).map((r) => r.reviewer_id))
  );
  const { data: reviewers } = reviewerIds.length
    ? await supabase
        .from("profiles")
        .select("id, company_name, full_name")
        .in("id", reviewerIds)
    : { data: [] as { id: string; company_name: string | null; full_name: string | null }[] };
  const reviewerName = new Map(
    (reviewers ?? []).map((p) => [p.id, p.company_name || p.full_name || "Client"])
  );

  const displayName = firm.company_name || firm.full_name || "Company";

  return (
    <div className="min-h-screen bg-muted/40 py-10">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        <div className="flex items-center gap-2 text-lg font-bold">
          <HardHat className="h-6 w-6 text-primary" /> matadora.business
        </div>

        {/* Header */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {firm.logo_url ? (
                <Image
                  src={firm.logo_url}
                  alt={displayName}
                  width={96}
                  height={96}
                  className="h-full w-full object-contain"
                  unoptimized
                />
              ) : (
                <Building2 className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{displayName}</h1>
                {firm.is_verified && <VerifiedBadge />}
              </div>
              <RatingStars
                value={Number(firm.rating_avg)}
                count={firm.rating_count}
                size="md"
              />
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {firm.company_address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {firm.company_address}
                  </span>
                )}
                {firm.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" /> {firm.phone}
                  </span>
                )}
                {firm.website && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-4 w-4" /> {firm.website}
                  </span>
                )}
              </div>
              {firm.nip && (
                <p className="text-xs text-muted-foreground">NIP: {firm.nip}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {firm.bio && (
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {firm.bio}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              Reviews{" "}
              <span className="text-sm font-normal text-muted-foreground">
                · {firm.rating_count} total · {completedCount ?? 0} completed
                projects
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(reviews ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              (reviews ?? []).map((r) => (
                <div key={r.id} className="border-b pb-3 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {reviewerName.get(r.reviewer_id) ?? "Client"}
                    </span>
                    <RatingStars value={r.rating} showValue={false} />
                  </div>
                  {r.comment && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {r.comment}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
