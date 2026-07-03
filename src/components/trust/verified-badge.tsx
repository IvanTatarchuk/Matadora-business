import { BadgeCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/** Shown on profiles that have been verified (NIP / license checked). */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700",
        className
      )}
    >
      <BadgeCheck className="h-3.5 w-3.5" />
      Verified
    </span>
  );
}
