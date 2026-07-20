import Link from "next/link";
import { FileText } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatPLN } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success"> = {
  draft: "secondary",
  sent: "default",
  accepted: "success",
  rejected: "secondary",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Szkic",
  sent: "Oczekuje na decyzję",
  accepted: "Zaakceptowana",
  rejected: "Odrzucona",
};

export default async function InvestorOffersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title")
    .eq("investor_id", user!.id);

  const projectIds = (projects ?? []).map((p) => p.id);
  const projectTitleById = new Map((projects ?? []).map((p) => [p.id, p.title]));

  const { data: offers } = projectIds.length
    ? await supabase
        .from("offers")
        .select("id, title, status, total_gross, public_token, created_at, project_id")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const list = offers ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Oferty</h1>
        <p className="text-sm text-muted-foreground">
          Kosztorysy przesłane przez wykonawców dla Twoich projektów
        </p>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nie masz jeszcze żadnych ofert</p>
            <p className="text-sm text-muted-foreground">
              Oferty pojawią się tutaj, gdy wykonawca prześle kosztorys dla Twojego projektu.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="p-3 font-medium">Oferta</th>
                <th className="p-3 font-medium">Projekt</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 text-right font-medium">Kwota brutto</th>
                <th className="p-3 text-right font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.map((o) => (
                <tr key={o.id} className="hover:bg-muted/40">
                  <td className="p-3">
                    <Link
                      href={`/offer/${o.public_token}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {o.title}
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {projectTitleById.get(o.project_id) ?? "—"}
                  </td>
                  <td className="p-3">
                    <Badge variant={STATUS_VARIANT[o.status] ?? "secondary"}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-right font-medium">
                    {formatPLN(Number(o.total_gross))}
                  </td>
                  <td className="p-3 text-right text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("pl-PL")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
