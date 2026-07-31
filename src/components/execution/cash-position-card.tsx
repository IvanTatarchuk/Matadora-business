import { Wallet, AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPLN } from "@/lib/utils";
import { getCashPositionForecast } from "@/lib/actions/cash-position";

export async function CashPositionCard() {
  const forecast = await getCashPositionForecast();
  if ("error" in forecast) return null;

  const { cashNow, weeks } = forecast;
  const lowestWeek = weeks.reduce((min, w) => (w.cumulative < min.cumulative ? w : min), weeks[0]!);
  const willGoNegative = lowestWeek.cumulative < 0;
  const maxAbs = Math.max(...weeks.map((w) => Math.abs(w.cumulative)), Math.abs(cashNow), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-4 w-4 text-primary" />
          Gotówka teraz + prognoza na 8 tygodni
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Suma potwierdzonych przepływów, nierozliczonych faktur i kaucji w harmonogramie tygodniowym.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">Gotówka teraz</p>
          <p className={`text-2xl font-extrabold ${cashNow < 0 ? "text-destructive" : "text-green-700"}`}>
            {formatPLN(cashNow)}
          </p>
        </div>

        {willGoNegative && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Prognoza pokazuje ujemne saldo ({formatPLN(lowestWeek.cumulative)}) w tygodniu {lowestWeek.label}.
            </span>
          </div>
        )}

        <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
          {weeks.map((week) => {
            const heightPct = Math.max((Math.abs(week.cumulative) / maxAbs) * 100, 4);
            return (
              <div key={week.weekStart} className="flex min-w-[44px] flex-1 flex-col items-center gap-1">
                <div className="flex h-20 w-full items-end justify-center">
                  <div
                    className={`w-6 rounded-t-sm ${week.cumulative < 0 ? "bg-destructive" : "bg-primary/70"}`}
                    style={{ height: `${heightPct}%` }}
                    title={formatPLN(week.cumulative)}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{week.label}</span>
                <span className={`text-[10px] font-medium ${week.cumulative < 0 ? "text-destructive" : ""}`}>
                  {formatPLN(week.cumulative)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
