import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conditional logic. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Polish złoty currency. */
export function formatPLN(amount: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/** Round to 2 decimal places (avoids float drift on money). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
