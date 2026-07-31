import type { CertificationType, WorkerCertification } from "@/lib/actions/worker-certifications";

export const CERT_LABELS: Record<CertificationType, string> = {
  bhp_general:      "Szkolenie BHP ogólne",
  bhp_work:         "Szkolenie BHP stanowiskowe",
  udt_operator:     "Uprawnienia UDT (wózki, dźwigi)",
  electrical_e:     "Uprawnienia elektryczne E (eksploatacja)",
  electrical_d:     "Uprawnienia elektryczne D (dozór)",
  high_work:        "Praca na wysokości",
  forklift:         "Wózek widłowy — operator",
  crane:            "Operator dźwigu",
  welding:          "Uprawnienia spawalnicze",
  driving_cat_b:    "Prawo jazdy kat. B",
  driving_cat_c:    "Prawo jazdy kat. C",
  driving_cat_ce:   "Prawo jazdy kat. C+E",
  first_aid:        "Kurs pierwszej pomocy",
  asbestos:         "Praca z azbestem",
  scaffolding:      "Uprawnienia rusztowaniowe",
  blasting:         "Roboty strzałowe",
  gas_installation: "Instalacje gazowe",
  other:            "Własne / Inne",
};

/** Days until a certification's expiry_date; negative if already expired. Only meaningful when the cert isn't permanent and has a date. */
export function daysUntilExpiry(cert: WorkerCertification): number | null {
  if (cert.is_permanent || !cert.expiry_date) return null;
  return Math.floor((new Date(cert.expiry_date).getTime() - Date.now()) / 86400000);
}
