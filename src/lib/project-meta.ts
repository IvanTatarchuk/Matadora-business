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

/** Polish display labels — the values above stay stable for storage/filtering. */
export const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  Renovation: "Remont",
  "New build": "Nowa budowa",
  Roofing: "Dach",
  Electrical: "Instalacje elektryczne",
  Plumbing: "Instalacje sanitarne",
  HVAC: "Wentylacja i klimatyzacja",
  Flooring: "Podłogi",
  Painting: "Malowanie",
  Demolition: "Rozbiórka",
  Landscaping: "Zagospodarowanie terenu",
  Other: "Inne",
};
