/**
 * KSeF FA(2) XML Generator
 * Based on: Schemat FA(2) — Ministerstwo Finansów RP
 * Source: https://ksef.podatki.gov.pl/files/schemat/FA_2.xsd
 * Obowiązuje od: 1 września 2023 r.
 *
 * WAŻNE: Do wysyłania faktur do KSeF wymagany jest token sesji
 * uzyskany przez uwierzytelnienie NIP + certyfikat kwalifikowany lub
 * podpis zaufany (ePUAP).
 */

export type KsefInvoiceData = {
  // Dane sprzedawcy (wykonawca)
  seller: {
    nip: string;
    name: string;
    address: string;
    city: string;
    postalCode: string;
  };
  // Dane nabywcy (inwestor/zamawiający)
  buyer: {
    nip?: string; // opcjonalne dla os. fizycznych
    name: string;
    address: string;
    city: string;
    postalCode: string;
  };
  // Dane faktury
  invoice: {
    number: string;           // np. FV/06/2026/001
    issueDate: string;        // YYYY-MM-DD
    saleDate: string;         // YYYY-MM-DD (data wykonania usługi)
    paymentDue: string;       // YYYY-MM-DD
    paymentMethod: "przelew" | "gotowka" | "karta";
    bankAccount?: string;     // NRB 26-cyfrowy
  };
  // Pozycje faktury
  lines: Array<{
    ordinal: number;
    name: string;
    unit: string;
    qty: number;
    netUnitPrice: number;
    vatRate: 8 | 23 | 0;     // stawki budowlane
    netTotal: number;
    vatTotal: number;
    grossTotal: number;
  }>;
  // Sumy
  totals: {
    netTotal: number;
    vatTotal: number;
    grossTotal: number;
  };
  // Referencja do protokołu odbioru
  protokolRef?: string;
};

export function generateKsefXml(data: KsefInvoiceData): string {
  const now = new Date().toISOString();
  const lines = data.lines
    .map(
      (l) => `
      <P>
        <P_LP>${l.ordinal}</P_LP>
        <P_2B>${escapeXml(l.name)}</P_2B>
        <P_3>${escapeXml(l.unit)}</P_3>
        <P_4>${l.qty.toFixed(4)}</P_4>
        <P_7>${l.netUnitPrice.toFixed(2)}</P_7>
        <P_8A>${l.vatRate === 0 ? "ZW" : l.vatRate.toString()}</P_8A>
        <P_8B>${l.vatTotal.toFixed(2)}</P_8B>
        <P_9A>${l.netTotal.toFixed(2)}</P_9A>
        <P_11>${l.grossTotal.toFixed(2)}</P_11>
      </P>`
    )
    .join("\n");

  const vatRows: Record<number, { net: number; vat: number }> = {};
  for (const l of data.lines) {
    if (!vatRows[l.vatRate]) vatRows[l.vatRate] = { net: 0, vat: 0 };
    vatRows[l.vatRate]!.net += l.netTotal;
    vatRows[l.vatRate]!.vat += l.vatTotal;
  }

  const vatSummary = Object.entries(vatRows)
    .map(
      ([rate, v]) => `
      <StawkiPodatku>
        <P_12>${rate === "0" ? "ZW" : rate}</P_12>
        <P_13_${rate}>${v.net.toFixed(2)}</P_13_${rate}>
        <P_14_${rate}>${v.vat.toFixed(2)}</P_14_${rate}>
      </StawkiPodatku>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Faktura xmlns="http://crd.gov.pl/wzor/2023/06/29/12648/"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://crd.gov.pl/wzor/2023/06/29/12648/ http://crd.gov.pl/wzor/2023/06/29/12648/schemat.xsd">

  <Naglowek>
    <KodFormularza kodSystemowy="FA (2)" wersjaSchemy="1-0E">FA</KodFormularza>
    <WariantFormularza>2</WariantFormularza>
    <DataWytworzeniaFa>${now}</DataWytworzeniaFa>
    <SystemInfo>matadora.business v1.0</SystemInfo>
  </Naglowek>

  <Podmiot1>
    <DaneIdentyfikacyjne>
      <NIP>${data.seller.nip}</NIP>
      <Nazwa>${escapeXml(data.seller.name)}</Nazwa>
    </DaneIdentyfikacyjne>
    <Adres>
      <AdresL1>${escapeXml(data.seller.address)}</AdresL1>
      <AdresL2>${escapeXml(data.seller.postalCode)} ${escapeXml(data.seller.city)}</AdresL2>
    </Adres>
  </Podmiot1>

  <Podmiot2>
    <DaneIdentyfikacyjne>
      ${data.buyer.nip ? `<NIP>${data.buyer.nip}</NIP>` : "<BrakID>1</BrakID>"}
      <Nazwa>${escapeXml(data.buyer.name)}</Nazwa>
    </DaneIdentyfikacyjne>
    <Adres>
      <AdresL1>${escapeXml(data.buyer.address)}</AdresL1>
      <AdresL2>${escapeXml(data.buyer.postalCode)} ${escapeXml(data.buyer.city)}</AdresL2>
    </Adres>
  </Podmiot2>

  <Fa>
    <KodWaluty>PLN</KodWaluty>
    <P_1>${data.invoice.issueDate}</P_1>
    <P_1M>${data.invoice.saleDate}</P_1M>
    <P_2>${escapeXml(data.invoice.number)}</P_2>

    ${lines}

    ${vatSummary}

    <P_15>${data.totals.grossTotal.toFixed(2)}</P_15>

    <Adnotacje>
      <P_16>2</P_16>
      <P_17>2</P_17>
      <P_18>2</P_18>
      <P_18A>2</P_18A>
      <P_19>2</P_19>
      <P_22>2</P_22>
      <P_23>2</P_23>
      ${data.protokolRef ? `<P_UWAGI>Protokół odbioru: ${escapeXml(data.protokolRef)}</P_UWAGI>` : ""}
    </Adnotacje>

    <Platnosc>
      <Termin>${data.invoice.paymentDue}</Termin>
      <FormaPlatnosci>${PAYMENT_METHOD[data.invoice.paymentMethod]}</FormaPlatnosci>
      ${data.invoice.bankAccount ? `<NrRachunku>${data.invoice.bankAccount}</NrRachunku>` : ""}
    </Platnosc>
  </Fa>

</Faktura>`;
}

const PAYMENT_METHOD = {
  przelew: "6",
  gotowka: "1",
  karta:   "2",
} as const;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Oblicza sumy dla pozycji faktury
 */
export function calcInvoiceLine(
  netUnitPrice: number,
  qty: number,
  vatRate: 8 | 23 | 0
) {
  const netTotal = Math.round(netUnitPrice * qty * 100) / 100;
  const vatTotal = Math.round(netTotal * (vatRate / 100) * 100) / 100;
  const grossTotal = Math.round((netTotal + vatTotal) * 100) / 100;
  return { netTotal, vatTotal, grossTotal };
}

/**
 * Generuje numer faktury zgodny z przepisami (Art. 106e ust. 1 pkt 2 uVAT)
 * Format: FV/MM/YYYY/NNN
 */
export function generateInvoiceNumber(
  prefix: string,
  month: number,
  year: number,
  sequence: number
): string {
  return `${prefix}/${String(month).padStart(2, "0")}/${year}/${String(sequence).padStart(3, "0")}`;
}
