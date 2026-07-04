import type { SubSpecialty } from "@/lib/actions/subcontractors";

export const SPECIALTY_LABELS: Record<SubSpecialty, string> = {
  general:    "Generalny wykonawca",
  electrical: "Elektryka",
  plumbing:   "Hydraulika / Instalacje sanitarne",
  hvac:       "HVAC / Klimatyzacja",
  roofing:    "Dachy / Pokrycia dachowe",
  flooring:   "Podłogi / Posadzki",
  painting:   "Malowanie / Tynkowanie",
  insulation: "Izolacje",
  concrete:   "Beton / Żelbet",
  steel:      "Konstrukcje stalowe",
  windows:    "Okna / Drzwi / Fasady",
  landscaping:"Zagospodarowanie terenu",
  demolition: "Rozbiórki",
  excavation: "Ziemne / Fundamenty",
  other:      "Inne",
};
