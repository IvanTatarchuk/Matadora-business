"use client";

import { useState, useTransition } from "react";
import { Sparkles, AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPLN } from "@/lib/utils";
import { getCashFlowInsight, type CashFlowInsight } from "@/lib/actions/agent-insights";

const RISK_LABEL: Record<"low" | "medium" | "high", string> = {
  low: "Niskie",
  medium: "Średnie",
  high: "Wysokie",
};

const RISK_VARIANT: Record<"low" | "medium" | "high", "default" | "secondary" | "destructive"> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
};

export function CashFlowInsightCard({ projectId }: { projectId: string }) {
  const [insight, setInsight] = useState<CashFlowInsight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await getCashFlowInsight(projectId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setInsight(result);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          AI: analiza przepływu gotówki
        </CardTitle>
        <Button size="sm" variant="outline" onClick={generate} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Wygeneruj"}
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> Błąd: {error}
          </p>
        )}

        {!insight && !error && !pending && (
          <p className="text-sm text-muted-foreground">
            Kliknij &quot;Wygeneruj&quot;, aby przeanalizować należności, zobowiązania i kaucje tego projektu.
          </p>
        )}

        {insight && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Należności</p>
                <p className="font-semibold">{formatPLN(insight.receivableOutstanding)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Zobowiązania</p>
                <p className="font-semibold">{formatPLN(insight.payableOutstanding)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kaucje zatrzymane</p>
                <p className="font-semibold">{formatPLN(insight.retentionHeldByUs)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pozycja netto</p>
                <p className={`font-semibold ${insight.netPosition < 0 ? "text-destructive" : ""}`}>
                  {formatPLN(insight.netPosition)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Ryzyko płynności:</span>
              <Badge variant={RISK_VARIANT[insight.liquidityRisk]}>
                {RISK_LABEL[insight.liquidityRisk]}
              </Badge>
            </div>

            {insight.risks.length > 0 && (
              <ul className="space-y-1 text-sm">
                {insight.risks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    {r.detail}
                  </li>
                ))}
              </ul>
            )}

            {insight.summary && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm font-medium">{insight.summary}</p>
                {insight.recommendations.length > 0 && (
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {insight.recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
