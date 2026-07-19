import Link from "next/link";
import { FolderKanban } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success"> = {
  draft: "secondary",
  open: "secondary",
  in_progress: "default",
  completed: "success",
  cancelled: "secondary",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Szkic",
  open: "Otwarty",
  in_progress: "W trakcie",
  completed: "Zakończony",
  cancelled: "Anulowany",
};

export default async function ContractorProjectsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, address, status, created_at")
    .eq("contractor_id", user!.id)
    .order("created_at", { ascending: false });

  const list = projects ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Projekty</h1>
        <p className="text-sm text-muted-foreground">
          Projekty, które realizujesz. Otwórz jeden, aby zarządzać zadaniami,
          brygadami i raportami postępu.
        </p>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <FolderKanban className="h-8 w-8" />
            <p className="text-sm">
              Brak przypisanych projektów. Wygraj przetarg, aby zacząć realizację.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y rounded-lg border bg-card">
          {list.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/contractor/projects/${p.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{p.title}</p>
                {p.address && (
                  <p className="truncate text-sm text-muted-foreground">
                    {p.address}
                  </p>
                )}
              </div>
              <Badge variant={STATUS_VARIANT[p.status] ?? "secondary"}>
                {STATUS_LABEL[p.status] ?? p.status}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
