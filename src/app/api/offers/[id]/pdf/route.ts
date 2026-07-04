import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: offer, error } = await db(supabase)
      .from("generated_offers")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error || !offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    // Generate HTML for PDF
    const html = generateOfferHTML(offer);

    // Return HTML as response (client will handle PDF generation)
    return NextResponse.json({ html, offer }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

function generateOfferHTML(offer: any): string {
  const sections = offer.sections || [];
  const templateConfig: Record<string, { name: string; color: string }> = {
    investor: { name: "Oferta dla inwestora prywatnego", color: "#3b82f6" },
    contractor: { name: "Oferta dla generalnego wykonawcy", color: "#8b5cf6" },
    developer: { name: "Oferta dla dewelopera", color: "#10b981" },
  };
  const config = templateConfig[offer.template] || templateConfig.investor;
  const color = config?.color || "#3b82f6";
  const name = config?.name || "Oferta";

  function fmt(n: number) {
    return new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }

  const sectionsHTML = sections.map((section: any) => `
    <div class="section">
      <h3>${section.title}</h3>
      <table class="items-table">
        <thead>
          <tr>
            <th>Lp.</th>
            <th>Opis</th>
            <th>JM</th>
            <th>Ilość</th>
            <th>Cena jedn.</th>
            <th>Wartość</th>
          </tr>
        </thead>
        <tbody>
          ${section.items.map((item: any, idx: number) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${item.description}</td>
              <td>${item.unit}</td>
              <td>${item.quantity}</td>
              <td>${fmt(item.unitPrice)} PLN</td>
              <td>${fmt(item.total)} PLN</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5"><strong>Razem ${section.title}:</strong></td>
            <td><strong>${fmt(section.subtotal)} PLN</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Oferta ${offer.offer_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; line-height: 1.4; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { border-bottom: 3px solid ${color}; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: ${color}; font-size: 24px; margin-bottom: 10px; }
    .header .meta { display: flex; justify-content: space-between; color: #666; font-size: 11px; }
    .client-info { background: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 30px; }
    .client-info h3 { font-size: 14px; margin-bottom: 10px; color: ${color}; }
    .section { margin-bottom: 30px; }
    .section h3 { font-size: 16px; margin-bottom: 15px; color: ${color}; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    .items-table th { background: ${color}; color: white; padding: 8px; text-align: left; font-size: 11px; }
    .items-table td { padding: 8px; border-bottom: 1px solid #eee; }
    .items-table td:last-child { text-align: right; }
    .items-table tfoot td { background: #f5f5f5; font-weight: bold; }
    .totals { background: ${color}; color: white; padding: 20px; border-radius: 4px; margin-top: 30px; }
    .totals-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
    .totals-row.grand { font-size: 18px; font-weight: bold; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 10px; margin-top: 10px; }
    .terms { margin-top: 30px; padding: 15px; background: #f9f9f9; border-left: 3px solid ${color}; font-size: 11px; }
    .terms h4 { margin-bottom: 10px; color: ${color}; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${name}</h1>
      <div class="meta">
        <div>
          <strong>Numer oferty:</strong> ${offer.offer_number}<br>
          <strong>Data:</strong> ${new Date(offer.offer_date).toLocaleDateString('pl-PL')}<br>
          <strong>Ważna do:</strong> ${new Date(offer.valid_until).toLocaleDateString('pl-PL')}
        </div>
        <div style="text-align: right;">
          <strong>Status:</strong> ${offer.status.toUpperCase()}
        </div>
      </div>
    </div>

    <div class="client-info">
      <h3>Dane klienta</h3>
      <strong>${offer.client_name}</strong><br>
      ${offer.client_email ? `Email: ${offer.client_email}<br>` : ''}
      ${offer.client_address ? `Adres: ${offer.client_address}` : ''}
    </div>

    ${sectionsHTML}

    <div class="totals">
      <div class="totals-row">
        <span>Razem netto:</span>
        <span>${fmt(offer.total_net)} PLN</span>
      </div>
      <div class="totals-row">
        <span>VAT:</span>
        <span>${fmt(offer.total_vat)} PLN</span>
      </div>
      <div class="totals-row grand">
        <span>RAZEM BRUTTO:</span>
        <span>${fmt(offer.total_gross)} PLN</span>
      </div>
    </div>

    <div class="terms">
      <h4>Warunki oferty</h4>
      <p>${offer.terms || 'Oferta ważna 30 dni od daty wystawienia.'}</p>
      <h4 style="margin-top: 15px;">Warunki płatności</h4>
      <p>${offer.payment_terms || 'Płatność w ratach zgodnie z harmonogramem.'}</p>
      ${offer.notes ? `<h4 style="margin-top: 15px;">Uwagi</h4><p>${offer.notes}</p>` : ''}
    </div>

    <div class="footer">
      <p>Wygenerowano przez Matadora Business • ${new Date().toLocaleDateString('pl-PL')}</p>
    </div>
  </div>
</body>
</html>
  `;
}
