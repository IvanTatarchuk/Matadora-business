import { Card, CardContent } from "@/components/ui/card";

const WIDTH = 640;
const HEIGHT = 180;
const PAD_X = 8;
const PAD_Y = 16;

function fmt(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(n);
}

export function CostTimelineChart({ timeline }: { timeline: { month: string; actual: number }[] }) {
  if (timeline.length < 2) return null;

  const firstMonth = timeline[0]!.month;
  const lastMonth = timeline[timeline.length - 1]!.month;
  const maxValue = Math.max(1, ...timeline.map((t) => t.actual));
  const barWidth = (WIDTH - PAD_X * 2) / timeline.length;
  const yFor = (v: number) => HEIGHT - PAD_Y - (v / maxValue) * (HEIGHT - PAD_Y * 2);

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm font-medium mb-2">Rzeczywiste koszty w czasie (wszystkie miesiące)</p>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-40" preserveAspectRatio="none">
          <line
            x1={PAD_X} y1={HEIGHT - PAD_Y} x2={WIDTH - PAD_X} y2={HEIGHT - PAD_Y}
            stroke="currentColor" strokeOpacity={0.15}
          />
          {timeline.map((t, i) => {
            const x = PAD_X + i * barWidth;
            const y = yFor(t.actual);
            const h = HEIGHT - PAD_Y - y;
            return (
              <g key={t.month}>
                <rect x={x + barWidth * 0.15} y={y} width={barWidth * 0.7} height={h} fill="#2563eb" rx={1}>
                  <title>{`${t.month}: ${fmt(t.actual)}`}</title>
                </rect>
              </g>
            );
          })}
        </svg>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{firstMonth}</span>
          <span>{lastMonth}</span>
        </div>
      </CardContent>
    </Card>
  );
}
