import { Fragment } from "react";

import { formatPLN } from "@/lib/utils";
import { groupStagesByLabel } from "@/lib/offer-calc";
import type { OfferStage } from "@/types/database";

export interface OfferMaterialLine {
  product_name: string;
  unit: string;
  quantity: number;
  price_net: number;
}

export function OfferSummary({
  stages,
  materials = [],
  vatRate,
  totalNet,
  totalGross,
}: {
  stages: Pick<OfferStage, "stage_name" | "description" | "cost" | "group_label">[];
  materials?: OfferMaterialLine[];
  vatRate: number;
  totalNet: number;
  totalGross: number;
}) {
  const vatAmount = totalGross - totalNet;
  const materialsTotal = materials.reduce(
    (sum, m) => sum + Number(m.quantity) * Number(m.price_net),
    0
  );
  const groups = groupStagesByLabel(stages);
  const hasSections = groups.some((g) => g.label !== null);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="p-3 font-medium">Stage</th>
              <th className="p-3 text-right font-medium">Net cost</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {groups.map((group, gi) => (
              <Fragment key={`group-${gi}`}>
                {hasSections && (
                  <tr key={`group-${gi}`} className="bg-muted/30">
                    <td className="p-3 font-semibold" colSpan={2}>
                      {group.label ?? "Inne pozycje"}
                    </td>
                  </tr>
                )}
                {group.items.map((s, i) => (
                  <tr key={`item-${gi}-${i}`}>
                    <td className="p-3">
                      <p className="font-medium">{s.stage_name}</p>
                      {s.description && (
                        <p className="text-xs text-muted-foreground">
                          {s.description}
                        </p>
                      )}
                    </td>
                    <td className="p-3 text-right font-medium">
                      {formatPLN(Number(s.cost))}
                    </td>
                  </tr>
                ))}
                {hasSections && group.items.length > 1 && (
                  <tr key={`subtotal-${gi}`}>
                    <td className="p-3 text-right text-xs text-muted-foreground">
                      Razem: {group.label ?? "Inne pozycje"}
                    </td>
                    <td className="p-3 text-right text-xs font-semibold text-muted-foreground">
                      {formatPLN(group.subtotal)}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {materials.length > 0 && (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="p-3 font-medium">Material</th>
                <th className="p-3 text-right font-medium">Qty</th>
                <th className="p-3 text-right font-medium">Unit price</th>
                <th className="p-3 text-right font-medium">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {materials.map((m, i) => (
                <tr key={i}>
                  <td className="p-3 font-medium">{m.product_name}</td>
                  <td className="p-3 text-right">
                    {m.quantity} {m.unit}
                  </td>
                  <td className="p-3 text-right">
                    {formatPLN(Number(m.price_net))}
                  </td>
                  <td className="p-3 text-right font-medium">
                    {formatPLN(Number(m.quantity) * Number(m.price_net))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-muted/30">
              <tr>
                <td className="p-3 font-medium" colSpan={3}>
                  Materials total (net)
                </td>
                <td className="p-3 text-right font-semibold">
                  {formatPLN(materialsTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="ml-auto w-full max-w-sm space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Net total</span>
          <span>{formatPLN(totalNet)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">VAT ({vatRate}%)</span>
          <span>{formatPLN(vatAmount)}</span>
        </div>
        <div className="flex justify-between rounded-md bg-primary/5 px-3 py-2 text-base font-bold text-primary">
          <span>Gross total</span>
          <span>{formatPLN(totalGross)}</span>
        </div>
      </div>
    </div>
  );
}
