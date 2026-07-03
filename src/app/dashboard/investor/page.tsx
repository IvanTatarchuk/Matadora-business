import Link from "next/link";
import {
  FolderKanban,
  FileText,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPLN } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success"> = {
  draft: "secondary",
  sent: "default",
  accepted: "success",
};

const STATUS_PL: Record<string, string> = {
  draft: "Szkic",
  open: "Otwarty",
  in_progress: "W toku",
  completed: "Zakończony",
  cancelled: "Anulowany",
  sent: "Wysłany",
  accepted: "Zaakceptowany",
  rejected: "Odrzucony",
};

function fmtPLN(n: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function InvestorDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, status, budget_min, budget_max, deadline")
    .eq("investor_id", user!.id)
    .order("created_at", { ascending: false });

  const projectIds = (projects ?? []).map((p) => p.id);

  const [{ data: offers }, { data: acceptedOffers }] = await Promise.all([
    projectIds.length
      ? supabase
          .from("offers")
          .select("id, title, status, total_gross, public_token, created_at, project_id")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false })
      : { data: [] as never[] },
    projectIds.length
      ? supabase
          .from("offers")
          .select("project_id, total_net")
          .in("project_id", projectIds)
          .eq("status", "accepted")
      : { data: [] as never[] },
  ]);

  const list = offers ?? [];
  const pending = list.filter((o) => o.status === "sent").length;

  const allProjects = projects ?? [];
  const activeProjects = allProjects.filter((p) => p.status === "in_progress").length;
  const completedProjects = allProjects.filter((p) => p.status === "completed").length;

  // Total contracted budget across accepted offers
  const totalContracted = (acceptedOffers ?? []).reduce(
    (s, o) => s + Number(o.total_net ?? 0),
    0
  );

  // Deadline risk: projects in_progress with deadline < 30 days
  const now = new Date();
  const atRisk = allProjects.filter((p) => {
    if (p.status !== "in_progress" || !p.deadline) return false;
    const daysLeft = Math.ceil(
      (new Date(p.deadline).getTime() - now.getTime()) / 86400000
    );
    return daysLeft < 30 && daysLeft >= 0;
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Portfolio inwestora</h1>
        <p className="text-sm text-muted-foreground">
          Pełny przegląd Twoich projektów budowlanych
        </p>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Wszystkich projektów" value={allProjects.length} icon={FolderKanban} />
        <StatCard label="W toku" value={activeProjects} icon={Activity} />
        <StatCard label="Zakończonych" value={completedProjects} icon={CheckCircle2} />
        <StatCard label="Oczekuje decyzji" value={pending} icon={Clock} />
      </div>

      {/* Financial summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Wartość kontraktów</p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {fmtPLN(totalContracted)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Otrzymanych ofert</p>
          <p className="mt-1 text-2xl font-bold">{list.length}</p>
        </div>
        <div
          className={`rounded-xl border p-5 shadow-sm ${
            atRisk > 0
              ? "border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/30"
              : "bg-card"
          }`}
        >
          <div className="flex items-center gap-2">
            {atRisk > 0 && (
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            )}
            <p className="text-xs text-muted-foreground">Deadline &lt; 30 dni</p>
          </div>
          <p
            className={`mt-1 text-2xl font-bold ${atRisk > 0 ? "text-orange-600" : ""}`}
          >
            {atRisk}
          </p>
        </div>
      </div>

      {/* Projects table */}
      <Card>
        <CardHeader>
          <CardTitle>Moje projekty</CardTitle>
        </CardHeader>
        <CardContent>
          {allProjects.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Brak projektów.{" "}
              <Link href="/dashboard/investor/projects" className="text-primary underline">
                Utwórz pierwszy
              </Link>
            </p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    {["Projekt", "Status", "Budżet", "Termin", "Akcja"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allProjects.map((p) => {
                    const accepted = (acceptedOffers ?? []).find(
                      (o) => o.project_id === p.id
                    );
                    const daysLeft = p.deadline
                      ? Math.ceil(
                          (new Date(p.deadline).getTime() - now.getTime()) /
                            86400000
                        )
                      : null;
                    return (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-3 font-medium">{p.title}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              p.status === "in_progress"
                                ? "bg-blue-100 text-blue-700"
                                : p.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : p.status === "open"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {STATUS_PL[p.status] ?? p.status}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {accepted
                            ? fmtPLN(Number(accepted.total_net))
                            : p.budget_min || p.budget_max
                            ? `${fmtPLN(Number(p.budget_min ?? 0))} – ${fmtPLN(Number(p.budget_max ?? 0))}`
                            : "—"}
                        </td>
                        <td className="px-3 py-3">
                          {p.deadline ? (
                            <span
                              className={
                                daysLeft != null && daysLeft < 30 && daysLeft >= 0
                                  ? "font-medium text-orange-600"
                                  : daysLeft != null && daysLeft < 0
                                  ? "font-medium text-red-600"
                                  : ""
                              }
                            >
                              {p.deadline}
                              {daysLeft != null && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({daysLeft < 0 ? `+${-daysLeft} dni` : `${daysLeft} dni`})
                                </span>
                              )}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {p.status === "in_progress" || p.status === "completed" ? (
                            <Link
                              href={`/dashboard/investor/projects/${p.id}`}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <TrendingUp className="h-3 w-3" />
                              Postęp
                            </Link>
                          ) : (
                            <Link
                              href="/dashboard/investor/projects"
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              Zarządzaj
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent offers */}
      {list.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ostatnie oferty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {list.slice(0, 8).map((o) => (
                <Link
                  key={o.id}
                  href={`/offer/${o.public_token}`}
                  className="flex items-center justify-between py-3 hover:bg-muted/50"
                >
                  <p className="font-medium">{o.title}</p>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">
                      {fmtPLN(Number(o.total_gross))}
                    </span>
                    <Badge variant={STATUS_VARIANT[o.status] ?? "secondary"}>
                      {STATUS_PL[o.status] ?? o.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
