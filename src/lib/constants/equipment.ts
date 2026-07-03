import type { EquipmentCategory } from "@/lib/actions/equipment";

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  excavator:      "Koparka / Ładowarka",
  crane:          "Dźwig / Żuraw",
  concrete_mixer: "Betoniarka / Mieszalnik",
  forklift:       "Wózek widłowy",
  scaffold:       "Rusztowanie",
  compressor:     "Sprężarka",
  generator:      "Generator / Agregat",
  pump:           "Pompa",
  vehicle:        "Pojazd / Transport",
  hand_tool:      "Narzędzie ręczne",
  measurement:    "Sprzęt pomiarowy",
  safety:         "Sprzęt BHP",
  other:          "Inne",
};
