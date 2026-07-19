/**
 * Pure risk-score-to-label mapping — deliberately NOT in a "use server" file.
 * `src/lib/actions/risks.ts` has "use server" at the top, so every export
 * from it (including this) is treated as a Server Action; calling a plain
 * synchronous helper like this directly during a Client Component's render
 * throws "Server Functions cannot be called during initial render."
 */
export function RISK_LEVEL(score: number) {
  if (score <= 4) return { label: "Niskie", color: "bg-green-100 text-green-700" };
  if (score <= 9) return { label: "Umiarkowane", color: "bg-yellow-100 text-yellow-700" };
  if (score <= 16) return { label: "Wysokie", color: "bg-orange-100 text-orange-700" };
  return { label: "Krytyczne", color: "bg-red-100 text-red-700" };
}
