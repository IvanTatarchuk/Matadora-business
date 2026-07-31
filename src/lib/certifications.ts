import type { CertificationType, WorkerCertification } from "@/lib/actions/worker-certifications";

export const CERT_LABELS: Record<CertificationType, string> = {
  bhp_general:     "Szkolenie BHP ogólne",
  bhp_instruction: "Instruktaż stanowiskowy BHP",
  upe:             "Uprawnienia budowlane",
  sep_e:           "Uprawnienia SEP — eksploatacja (do 1kV)",
  sep_d:           "Uprawnienia SEP — dozór",
  udt:             "Uprawnienia UDT (wózki, dźwigi)",
  first_aid:       "Kurs pierwszej pomocy",
  scaffold:        "Uprawnienia rusztowaniowe",
  asbestos:        "Praca z azbestem",
  welding:         "Uprawnienia spawalnicze",
  crane_operator:  "Operator dźwigu",
  forklift:        "Wózek widłowy — operator",
  explosives:      "Materiały wybuchowe",
  driving_cat_c:   "Prawo jazdy kat. C",
  driving_cat_ce:  "Prawo jazdy kat. C+E",
  work_at_height:  "Praca na wysokości",
  confined_space:  "Przestrzenie ograniczone",
  custom:          "Własne / Inne",
};

/** Days until a certification's expiry_date; negative if already expired. Only meaningful when the cert isn't permanent and has a date. */
export function daysUntilExpiry(cert: WorkerCertification): number | null {
  if (cert.is_permanent || !cert.expiry_date) return null;
  return Math.floor((new Date(cert.expiry_date).getTime() - Date.now()) / 86400000);
}
