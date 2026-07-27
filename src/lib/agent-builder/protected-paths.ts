/**
 * Paths the autonomous builder agent must never touch, and that require a
 * human "Approve" click even when CI passes. Kept intentionally small and
 * specific — over-broad protection defeats the point of an autonomous team;
 * under-broad protection risks real client money and auth.
 *
 * Mirrored (independently) in .github/workflows/auto-merge.yml as a second,
 * defense-in-depth check — if this list and the workflow's regex list ever
 * disagree, the workflow's is authoritative since it runs outside the
 * builder's own process.
 */
export const PROTECTED_PATH_PATTERNS: RegExp[] = [
  /^supabase\/migrations\//, // schema changes always need review
  /^src\/lib\/actions\/finance\.ts$/, // real money: invoices, payments
  /^src\/lib\/actions\/offers\.ts$/, // real client-facing offer totals
  /^src\/lib\/offer-calc\.ts$/, // VAT/pricing math
  /^src\/middleware\.ts$/, // auth/session handling
  /^src\/lib\/supabase\/admin\.ts$/, // service-role client (bypasses RLS)
  /^src\/lib\/ksef\//, // Polish e-invoicing compliance
  /^\.github\/workflows\//, // CI/auto-merge config itself
  /^vercel\.json$/, // deploy/cron config
  /^package\.json$/, // dependency changes need review
];

export function touchesProtectedPath(filePath: string): boolean {
  return PROTECTED_PATH_PATTERNS.some((pattern) => pattern.test(filePath));
}
