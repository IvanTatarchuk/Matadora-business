// Shared helpers for generating VAT invoices ("Faktura VAT") for the
// platform's flat one-off AI-feature purchases (kosztorys_purchases table).
// Prices collected via Stripe are gross (VAT-inclusive) — see regulamin § "ceny brutto".

export const VAT_RATE = 23; // standard PL rate — none of these are construction-labor services eligible for 8%

export const PRODUCT_LABEL: Record<string, string> = {
  kosztorys: "Analiza AI kosztorysu",
  bhp_photo: "Analiza BHP zdjęcia budowy (AI)",
  adwokat: "Adwokat AI — sesja",
};

export const SELLER = {
  name: "VANBUD Ivan Tatarchuk",
  address: "ul. Mielecka 5, 70-740 Szczecin",
  nip: "955-235-98-44",
  email: "vanbud.felix@gmail.com",
} as const;

export function vatBreakdown(grossPln: number, vatRate: number = VAT_RATE) {
  const net = grossPln / (1 + vatRate / 100);
  const vat = grossPln - net;
  return { net: round2(net), vat: round2(vat), gross: round2(grossPln) };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** `FV/{sequential index within calendar year}/{YYYY}` — index derived from
 * payment order (count of paid purchases in the same year up to and including
 * this one), so numbering stays continuous without needing a dedicated
 * DB sequence/table. */
export function formatInvoiceNumber(sequenceInYear: number, year: number) {
  return `FV/${sequenceInYear}/${year}`;
}
