import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { CashPosition } from "@/lib/actions/cashflow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmt(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(n);
}

export function CashPositionCard({ data }: { data: CashPosition | null }) {
  if (!data) return null;

  const positive = data.currentPosition >= 0;
  const maxAbs = Math.max(...data.weeks.map((w) => Math.abs(w.cumulative)), 1);

  return (
    <Card className={positive ? "border-green-200" : "border-red-200"}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wallet className="h-4 w-4" />Pozycja gotówkowa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current position */}
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Bieżąca pozycja gotówkowa</p>
            <p className={`text-2xl font-bold ${positive ? "text-green-700" : "text-red-700"}`}>
              {fmt(data.currentPosition)}
            </p>
            <p className="text-xs text-muted-foreground">
              Zrealizowane wpływy {fmt(data.realizedInflows)} · wydatki {fmt(data.realizedOutflows)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Zaangażowane koszty (pozostałe)</p>
            <p className="text-lg font-bold text-red-700">{fmt(data.committedCosts)}</p>
            <p className="text-[11px] text-muted-foreground">Job costing — plan minus wykonanie</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Szac. koszt do zakończenia (ETC)</p>
            <p className="text-lg font-bold text-amber-700">{fmt(data.estimateToComplete)}</p>
            <p className="text-[11px] text-muted-foreground">EVM — najnowsze migawki</p>
          </div>
        </div>

        {/* Forward projection */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Prognoza na {data.weeks.length} tyg. — na podstawie zaplanowanych przepływów
          </p>
          <div className="flex items-end gap-1.5 h-24">
            {data.weeks.map((w) => {
              const height = Math.abs((w.cumulative / maxAbs) * 100);
              const up = w.cumulative >= 0;
              return (
                <div key={w.startISO} className="flex-1 flex flex-col items-center gap-1" title={`${w.label}: ${fmt(w.cumulative)}`}>
                  <div className="w-full flex flex-col justify-end" style={{ height: "72px" }}>
                    <div
                      className={`w-full rounded-sm ${up ? "bg-green-400" : "bg-red-400"}`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground text-center leading-tight">{w.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly table */}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-2 py-1.5">Tydzień</th>
                <th className="text-right px-2 py-1.5 text-green-700">Wpływy</th>
                <th className="text-right px-2 py-1.5 text-red-700">Wydatki</th>
                <th className="text-right px-2 py-1.5 font-bold">Saldo tyg.</th>
                <th className="text-right px-2 py-1.5 font-bold">Prognoza salda</th>
              </tr>
            </thead>
            <tbody>
              {data.weeks.map((w) => (
                <tr key={w.startISO} className="border-t">
                  <td className="px-2 py-1.5 font-medium">{w.label}</td>
                  <td className="px-2 py-1.5 text-right text-green-700">{w.inflow > 0 ? fmt(w.inflow) : "—"}</td>
                  <td className="px-2 py-1.5 text-right text-red-700">{w.outflow > 0 ? fmt(w.outflow) : "—"}</td>
                  <td className={`px-2 py-1.5 text-right font-medium ${w.net >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {w.net !== 0 ? (
                      <span className="inline-flex items-center gap-0.5 justify-end">
                        {w.net >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {fmt(w.net)}
                      </span>
                    ) : "—"}
                  </td>
                  <td className={`px-2 py-1.5 text-right font-bold ${w.cumulative >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {fmt(w.cumulative)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          {positive
            ? <><TrendingUp className="h-3 w-3 text-green-600" />Prognoza oparta na zaplanowanych wpisach Cash Flow rozłożonych równomiernie w miesiącu.</>
            : <><TrendingDown className="h-3 w-3 text-red-600" />Uwaga: prognozowane saldo jest ujemne — sprawdź zaplanowane wydatki.</>}
        </p>
      </CardContent>
    </Card>
  );
}
