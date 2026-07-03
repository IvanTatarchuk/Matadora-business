import Link from "next/link";
import { MapPin, CalendarClock, Ruler } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPLN } from "@/lib/utils";

export default async function MarketplacePage() {
  const supabase = createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, title, description, category, address, surface_area, budget_min, budget_max, deadline, published_at"
    )
    .eq("status", "open")
    .order("published_at", { ascending: false });

  const list = projects ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketplace</h1>
        <p className="text-sm text-muted-foreground">
          Open projects looking for contractors. Open one to submit a competitive bid.
        </p>
      </div>

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No open projects right now. Check back soon.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <Link key={p.id} href={`/dashboard/marketplace/${p.id}`}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{p.title}</h3>
                    {p.category && (
                      <Badge variant="secondary" className="shrink-0">
                        {p.category}
                      </Badge>
                    )}
                  </div>

                  {p.description && (
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {p.description}
                    </p>
                  )}

                  <div className="space-y-1 text-xs text-muted-foreground">
                    {p.address && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> {p.address}
                      </p>
                    )}
                    {p.surface_area != null && (
                      <p className="flex items-center gap-1.5">
                        <Ruler className="h-3.5 w-3.5" /> {p.surface_area} m²
                      </p>
                    )}
                    {p.deadline && (
                      <p className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5" />{" "}
                        {new Date(p.deadline).toLocaleDateString("pl-PL")}
                      </p>
                    )}
                  </div>

                  {(p.budget_min || p.budget_max) && (
                    <p className="text-sm font-semibold">
                      {formatPLN(Number(p.budget_min ?? 0))} –{" "}
                      {formatPLN(Number(p.budget_max ?? 0))}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
