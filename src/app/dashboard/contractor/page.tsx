import Link from "next/link";
import { FileText, FolderKanban, CheckCircle2, Plus, Lightbulb, AlertTriangle, Zap, ArrowRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPLN } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success"> = {
  draft: "secondary",
  sent: "default",
  accepted: "success",
};

export default async function ContractorDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: offers } = await supabase
    .from("offers")
    .select("id, title, status, total_gross, created_at")
    .eq("contractor_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const { count: projectCount } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("contractor_id", user!.id);

  const list = offers ?? [];
  const accepted = list.filter((o) => o.status === "accepted").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panel wykonawcy</h1>
        <Button asChild>
          <Link href="/dashboard/contractor/offers/new">
            <Plus className="h-4 w-4" /> Nowy kosztorys
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Aktywne projekty" value={projectCount ?? 0} icon={FolderKanban} />
        <StatCard label="Kosztorysy" value={list.length} icon={FileText} />
        <StatCard label="Zaakceptowane" value={accepted} icon={CheckCircle2} />
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/dashboard/contractor/przetargi" className="group rounded-xl border bg-gradient-to-br from-orange-50 to-orange-100/50 p-4 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white">
              <FileText className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm">Przetargi AI</span>
          </div>
          <p className="text-xs text-muted-foreground">6 nowych przetargów dopasowanych do Ciebie dziś</p>
        </Link>
        <Link href="/dashboard/contractor/protokoly" className="group rounded-xl border bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm">Protokoły odbioru</span>
          </div>
          <p className="text-xs text-muted-foreground">Cyfrowe podpisanie — faktura KSeF automatycznie</p>
        </Link>
        <Link href="/dashboard/contractor/bhp" className="group rounded-xl border bg-gradient-to-br from-red-50 to-red-100/50 p-4 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500 text-white">
              <FolderKanban className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm">BHP Dokumentacja</span>
          </div>
          <p className="text-xs text-muted-foreground">2 dokumenty wymagają aktualizacji</p>
        </Link>
      </div>

      {/* INLINE RECOMMENDATIONS WIDGET */}
      <RecommendationsWidget projectCount={projectCount ?? 0} offerSentCount={list.filter(o => o.status === "sent").length} />

      <Card>
        <CardHeader>
          <CardTitle>Ostatnie kosztorysy</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Brak kosztorysów. Utwórz pierwszy profesjonalny kosztorys.
            </p>
          ) : (
            <div className="divide-y">
              {list.map((o) => (
                <Link
                  key={o.id}
                  href={`/dashboard/contractor/offers/${o.id}`}
                  className="flex items-center justify-between py-3 hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{o.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("pl-PL")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">
                      {formatPLN(Number(o.total_gross))}
                    </span>
                    <Badge variant={STATUS_VARIANT[o.status] ?? "secondary"}>
                      {o.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Inline widget: top recommendations ─────────────────────────────────────

function RecommendationsWidget({
  projectCount,
  offerSentCount,
}: {
  projectCount: number;
  offerSentCount: number;
}) {
  const daysToKsef = Math.floor(
    (new Date("2026-04-01").getTime() - Date.now()) / 86400000
  );

  type Alert = {
    Icon: typeof AlertTriangle;
    color: string;
    bg: string;
    text: string;
    sub: string;
    href: string;
  };

  const alerts: Alert[] = [];

  if (daysToKsef >= 0) {
    alerts.push({
      Icon: AlertTriangle,
      color: daysToKsef < 60 ? "text-red-600" : "text-orange-600",
      bg: daysToKsef < 60 ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200",
      text: `KSeF obowiązkowy za ${daysToKsef} dni (1 kwi 2026)`,
      sub: "Kara: do 100% VAT na fakturze. Skonfiguruj teraz.",
      href: "/dashboard/settings/ksef",
    });
  }

  if (offerSentCount > 0) {
    alerts.push({
      Icon: Zap,
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-200",
      text: `${offerSentCount} kosztorysów czeka na odpowiedź`,
      sub: "Follow-up po 5 dniach zwiększa konwersję o 40%.",
      href: "/dashboard/contractor/offers",
    });
  }

  if (projectCount > 0) {
    alerts.push({
      Icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-50 border-orange-200",
      text: "Sprawdź ważność dokumentów BHP",
      sub: "Kontrola PIP: kara do 100 000 zł za brakujące dokumenty.",
      href: "/dashboard/contractor/bhp",
    });
  }

  if (alerts.length === 0) return null;

  const top = alerts.slice(0, 2);

  return (
    <div className="rounded-xl border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          <span className="font-semibold text-sm">Rekomendacje dla Ciebie</span>
        </div>
        <Link
          href="/dashboard/contractor/insights"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Wszystkie <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {top.map((a, i) => (
        <Link
          key={i}
          href={a.href}
          className={`flex items-start gap-3 rounded-lg border p-3 ${a.bg} hover:opacity-80 transition-opacity`}
        >
          <a.Icon className={`h-4 w-4 mt-0.5 shrink-0 ${a.color}`} />
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${a.color}`}>{a.text}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{a.sub}</p>
          </div>
          <ArrowRight className="h-4 w-4 ml-auto shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}
