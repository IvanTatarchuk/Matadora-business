/** Construction project categories used across the marketplace UI. */
export const PROJECT_CATEGORIES = [
  "Renovation",
  "New build",
  "Roofing",
  "Electrical",
  "Plumbing",
  "HVAC",
  "Flooring",
  "Painting",
  "Demolition",
  "Landscaping",
  "Other",
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];
