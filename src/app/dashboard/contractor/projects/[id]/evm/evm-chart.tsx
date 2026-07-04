import { Card, CardContent } from "@/components/ui/card";
import type { EvmSnapshot } from "@/lib/actions/evm";

const SERIES: { key: "pv" | "ev" | "ac"; label: string; color: string }[] = [
  { key: "pv", label: "PV — plan", color: "#94a3b8" },
  { key: "ev", label: "EV — wypracowano", color: "#2563eb" },
  { key: "ac", label: "AC — wydano", color: "#dc2626" },
];

const WIDTH = 640;
const HEIGHT = 220;
const PAD_X = 8;
const PAD_Y = 16;

export function EvmSCurve({ snapshots }: { snapshots: EvmSnapshot[] }) {
  const sorted = [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
  if (sorted.length < 2) return null;

  const maxValue = Math.max(1, ...sorted.flatMap((s) => [s.bac, s.pv, s.ev, s.ac]));
  const xFor = (i: number) => PAD_X + (i / (sorted.length - 1)) * (WIDTH - PAD_X * 2);
  const yFor = (v: number) => HEIGHT - PAD_Y - (v / maxValue) * (HEIGHT - PAD_Y * 2);
  const pointsFor = (key: "pv" | "ev" | "ac") =>
    sorted.map((s, i) => `${xFor(i)},${yFor(s[key])}`).join(" ");

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="text-sm font-medium">Krzywa S — PV / EV / AC w czasie</p>
          <div className="flex gap-3 text-xs text-muted-foreground">
            {SERIES.map((s) => (
              <span key={s.key} className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-48" preserveAspectRatio="none">
          <line
            x1={PAD_X} y1={HEIGHT - PAD_Y} x2={WIDTH - PAD_X} y2={HEIGHT - PAD_Y}
            stroke="currentColor" strokeOpacity={0.15}
          />
          {SERIES.map((s) => (
            <polyline key={s.key} points={pointsFor(s.key)} fill="none" stroke={s.color} strokeWidth={2} />
          ))}
          {SERIES.map((s) =>
            sorted.map((snap, i) => (
              <circle key={`${s.key}-${snap.id}`} cx={xFor(i)} cy={yFor(snap[s.key])} r={2.5} fill={s.color} />
            ))
          )}
        </svg>
      </CardContent>
    </Card>
  );
}
