import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/** Read-only star rating display with optional count. */
export function RatingStars({
  value,
  count,
  size = "sm",
  showValue = true,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
  showValue?: boolean;
}) {
  const dim = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const rounded = Math.round(value * 2) / 2; // nearest half

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = rounded >= i;
          const half = !filled && rounded >= i - 0.5;
          return (
            <Star
              key={i}
              className={cn(
                dim,
                filled || half
                  ? "fill-amber-400 text-amber-400"
                  : "fill-muted text-muted-foreground/40"
              )}
            />
          );
        })}
      </div>
      {showValue && (
        <span className="text-sm text-muted-foreground">
          {value > 0 ? value.toFixed(1) : "—"}
          {typeof count === "number" && count > 0 ? ` (${count})` : ""}
        </span>
      )}
    </div>
  );
}
