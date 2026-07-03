import Link from "next/link";
import { Plus, FileSignature, Clock, CheckCircle2, XCircle, FileText, ArrowRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPLN } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "success" | "destructive" }> = {
  draft:    { label: "Szkic", variant: "secondary" },
  sent:     { label: "Wysłany", variant: "default" },
  signed:   { label: "Podpisany", variant: "success" },
  invoiced: { label: "Zafakturowany", variant: "success" },
  rejected: { label: "Odrzucony", variant: "destructive" },
};

export default async function ProtokolyPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  type Protokol = {
    id: string;
    title: string;
    status: string;
    amount_net: number;
    amount_gross: number;
    vat_rate: number;
    created_at: string;
    signed_by_client_at: string | null;
    projects: { title: string } | null;
  };

  const { data: protokoly } = await (supabase
    .from("protokoly_odbioru" as "profiles")
    .select("id, title, status, amount_net, amount_gross, vat_rate, created_at, signed_by_client_at, projects(title)")
    .eq("contractor_id" as "id", user!.id)
    .order("created_at", { ascending: false }) as unknown as Promise<{ data: Protokol[] | null }>);

  const list = protokoly ?? [];
  const signed = list.filter((p) => p.status === "signed" || p.status === "invoiced").length;
  const pending = list.filter((p) => p.status === "sent").length;
  const totalSigned = list
    .filter((p) => p.status === "signed" || p.status === "invoiced")
    .reduce((sum, p) => sum + Number(p.amount_gross), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Protokoły odbioru</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cyfrowe protokoły odbioru robót — klient podpisuje na telefonie, faktura KSeF automatycznie
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/contractor/protokoly/new">
            <Plus className="h-4 w-4 mr-2" /> Nowy protokół
          </Link>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{signed}</p>
              <p className="text-xs text-muted-foreground">Podpisanych</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pending}</p>
              <p className="text-xs text-muted-foreground">Oczekuje na podpis</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <FileSignature className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatPLN(totalSigned)}</p>
              <p className="text-xs text-muted-foreground">Wartość podpisanych</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* INFO BANNER */}
      {list.length === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
            <FileSignature className="h-12 w-12 text-blue-400 shrink-0" />
            <div>
              <p className="font-bold text-blue-900">Jak działają cyfrowe protokoły odbioru?</p>
              <p className="mt-1 text-sm text-blue-700">
                Tworzysz protokół po zakończeniu etapu prac → klient dostaje SMS z linkiem → podpisuje na telefonie →
                faktura KSeF jest gotowa automatycznie. Średnio skraca czas oczekiwania na płatność o <strong>6 tygodni</strong>.
              </p>
              <Button size="sm" className="mt-3" asChild>
                <Link href="/dashboard/contractor/protokoly/new">
                  Stwórz pierwszy protokół <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LIST */}
      {list.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Wszystkie protokoły</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {list.map((p) => {
                const cfg = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;
                const project = p.projects as { title: string } | null;
                return (
                  <Link
                    key={p.id}
                    href={`/dashboard/contractor/protokoly/${p.id}`}
                    className="flex items-center justify-between py-3 px-1 hover:bg-muted/40 rounded transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{p.title}</p>
                        <Badge variant={(cfg?.variant ?? "secondary") as "default" | "secondary" | "destructive" | "outline"}>
                          {cfg?.label ?? ""}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        {project && <span>{project.title}</span>}
                        <span>{new Date(p.created_at).toLocaleDateString("pl-PL")}</span>
                        {p.signed_by_client_at && (
                          <span className="text-green-600">
                            Podpisano {new Date(p.signed_by_client_at).toLocaleDateString("pl-PL")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-semibold">{formatPLN(Number(p.amount_gross))}</p>
                      <p className="text-xs text-muted-foreground">
                        netto {formatPLN(Number(p.amount_net))} + VAT {p.vat_rate}%
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
