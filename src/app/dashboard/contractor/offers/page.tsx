import Link from "next/link";
import { FileText, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatPLN } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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

export default async function OffersListPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: offers } = await supabase
    .from("offers")
    .select("id, title, status, total_gross, created_at, project_id, projects(title)")
    .eq("contractor_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const rows = (offers ?? []).map((o) => {
    const project = o.projects as unknown as { title: string } | { title: string }[] | null;
    const projectTitle = Array.isArray(project) ? project[0]?.title : project?.title;
    return { ...o, projectTitle: projectTitle ?? "—" };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kosztorysy</h1>
          <p className="text-muted-foreground">
            Wszystkie kosztorysy utworzone dla Twoich projektów
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/contractor/offers/new">
            <Plus className="h-4 w-4" /> Nowy kosztorys
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nie masz jeszcze żadnego kosztorysu</p>
            <p className="text-sm text-muted-foreground">
              Utwórz pierwszy kosztorys, aby wysłać go inwestorowi.
            </p>
            <Button asChild className="mt-2">
              <Link href="/dashboard/contractor/offers/new">
                <Plus className="h-4 w-4" /> Utwórz kosztorys
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="p-3 font-medium">Kosztorys</th>
                <th className="p-3 font-medium">Projekt</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 text-right font-medium">Kwota brutto</th>
                <th className="p-3 text-right font-medium">Data utworzenia</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((offer) => (
                <tr key={offer.id} className="hover:bg-muted/40">
                  <td className="p-3">
                    <Link
                      href={`/dashboard/contractor/offers/${offer.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {offer.title}
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{offer.projectTitle}</td>
                  <td className="p-3">
                    <Badge variant={STATUS_VARIANT[offer.status] ?? "secondary"}>
                      {STATUS_LABEL[offer.status] ?? offer.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-right font-medium">
                    {formatPLN(Number(offer.total_gross))}
                  </td>
                  <td className="p-3 text-right text-muted-foreground">
                    {new Date(offer.created_at).toLocaleDateString("pl-PL")}
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
