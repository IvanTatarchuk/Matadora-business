import {
  Truck,
  Hammer,
  Package,
  Users,
  Zap,
  PaintBucket,
  Layers,
  type LucideIcon,
} from "lucide-react";

import { formatPLN } from "@/lib/utils";
import { groupStagesByLabel } from "@/lib/offer-calc";
import type { OfferStage } from "@/types/database";

export interface OfferMaterialLine {
  product_name: string;
  unit: string;
  quantity: number;
  price_net: number;
}

/** Picks a representative icon for a stage/section based on its label — purely
 * cosmetic, falls back to a generic layers icon for anything unrecognized. */
function iconFor(label: string): LucideIcon {
  const s = label.toLowerCase();
  if (/(transport|logistyk|dostaw)/.test(s)) return Truck;
  if (/(rozbiór|demonta|wyburz)/.test(s)) return Hammer;
  if (/(materia)/.test(s)) return Package;
  if (/(robocizn|monta|pracown|ekipa)/.test(s)) return Users;
  if (/(elektr|instalacj)/.test(s)) return Zap;
  if (/(malow|tynk|wykończ|posadzk|glazur)/.test(s)) return PaintBucket;
  return Layers;
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

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {groups.map((group, gi) => {
          const label = group.label ?? "Pozostałe pozycje";
          const Icon = iconFor(label);
          return (
            <div
              key={`group-${gi}`}
              className="overflow-hidden rounded-xl border print:break-inside-avoid"
            >
              <div className="flex items-center gap-2.5 border-b bg-primary/5 px-4 py-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <p className="font-semibold text-primary">{label}</p>
              </div>
              <div className="divide-y">
                {group.items.map((s, i) => (
                  <div
                    key={`item-${gi}-${i}`}
                    className="flex items-start justify-between gap-4 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{s.stage_name}</p>
                      {s.description && (
                        <p className="text-xs text-muted-foreground">
                          {s.description}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 font-medium tabular-nums">
                      {formatPLN(Number(s.cost))}
                    </p>
                  </div>
                ))}
              </div>
              {group.items.length > 1 && (
                <div className="flex justify-between bg-muted/40 px-4 py-2 text-xs">
                  <span className="text-muted-foreground">Razem: {label}</span>
                  <span className="font-semibold tabular-nums">
                    {formatPLN(group.subtotal)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {materials.length > 0 && (
        <div className="overflow-hidden rounded-xl border print:break-inside-avoid">
          <div className="flex items-center gap-2.5 border-b bg-primary/5 px-4 py-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
              <Package className="h-3.5 w-3.5" />
            </div>
            <p className="font-semibold text-primary">Materiały</p>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 pt-3 font-medium">Materiał</th>
                <th className="px-4 pt-3 text-right font-medium">Ilość</th>
                <th className="px-4 pt-3 text-right font-medium">Cena jedn.</th>
                <th className="px-4 pt-3 text-right font-medium">Wartość</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {materials.map((m, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 font-medium">{m.product_name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {m.quantity} {m.unit}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatPLN(Number(m.price_net))}
                  </td>
                  <td className="px-4 py-2 text-right font-medium tabular-nums">
                    {formatPLN(Number(m.quantity) * Number(m.price_net))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between bg-muted/40 px-4 py-2 text-xs">
            <span className="text-muted-foreground">Suma materiałów (netto)</span>
            <span className="font-semibold tabular-nums">
              {formatPLN(materialsTotal)}
            </span>
          </div>
        </div>
      )}

      <div className="ml-auto w-full max-w-sm space-y-2 text-sm print:break-inside-avoid">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Suma netto</span>
          <span className="tabular-nums">{formatPLN(totalNet)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">VAT ({vatRate}%)</span>
          <span className="tabular-nums">{formatPLN(vatAmount)}</span>
        </div>
        <div className="flex justify-between rounded-lg bg-primary px-4 py-3 text-base font-bold text-white">
          <span>Suma brutto</span>
          <span className="tabular-nums">{formatPLN(totalGross)}</span>
        </div>
      </div>
    </div>
  );
}
