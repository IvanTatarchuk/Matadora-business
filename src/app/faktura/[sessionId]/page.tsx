import { notFound } from "next/navigation";
import { HardHat } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatPLN } from "@/lib/utils";
import { PRODUCT_LABEL, SELLER, VAT_RATE, vatBreakdown, formatInvoiceNumber } from "@/lib/invoice";
import { PrintButton } from "@/components/offers/print-button";

export default async function FakturaPage({ params }: { params: { sessionId: string } }) {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (s: any) => s as any;

  const { data: purchase } = await db(supabase)
    .from("kosztorys_purchases")
    .select("*")
    .eq("stripe_session_id", params.sessionId)
    .maybeSingle();

  if (!purchase) notFound();

  if (purchase.status !== "paid" || !purchase.paid_at) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="flex items-center gap-2 font-bold text-lg">
          <HardHat className="h-6 w-6 text-primary" /> matadora.business
        </div>
        <p className="mt-4 max-w-sm text-sm text-muted-foreground">
          Płatność nie została jeszcze zaksięgowana. Faktura VAT pojawi się na tej stronie automatycznie
          po potwierdzeniu płatności — zwykle w ciągu kilku sekund. Odśwież stronę za chwilę lub sprawdź
          swoją skrzynkę e-mail.
        </p>
      </div>
    );
  }

  const paidAt = new Date(purchase.paid_at);
  const year = paidAt.getFullYear();

  const { count: sequenceInYear } = await db(supabase)
    .from("kosztorys_purchases")
    .select("id", { count: "exact", head: true })
    .eq("status", "paid")
    .gte("paid_at", `${year}-01-01T00:00:00Z`)
    .lte("paid_at", purchase.paid_at);

  const invoiceNumber = formatInvoiceNumber(sequenceInYear ?? 1, year);
  const productKey = purchase.metadata?.product ?? "kosztorys";
  const productLabel = PRODUCT_LABEL[productKey] ?? "Usługa cyfrowa";
  const { net, vat, gross } = vatBreakdown(purchase.amount_pln / 100);
  const buyerNip = purchase.metadata?.nip as string | undefined;

  return (
    <div className="min-h-screen bg-muted/40 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-2xl space-y-6 px-4">
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 font-bold text-lg">
            <HardHat className="h-6 w-6 text-primary" /> matadora.business
          </div>
          <PrintButton label="Pobierz PDF" />
        </div>

        <div className="rounded-xl border bg-white p-8 print:border-0 print:p-0">
          <div className="flex items-start justify-between border-b pb-4">
            <div>
              <h1 className="text-xl font-bold">Faktura VAT nr {invoiceNumber}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Data wystawienia / sprzedaży: {paidAt.toLocaleDateString("pl-PL")}
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>matadora.business</p>
              <p>{purchase.stripe_payment_id ?? purchase.stripe_session_id}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sprzedawca</p>
              <p className="mt-1 text-sm font-medium">{SELLER.name}</p>
              <p className="text-sm text-muted-foreground">{SELLER.address}</p>
              <p className="text-sm text-muted-foreground">NIP: {SELLER.nip}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nabywca</p>
              <p className="mt-1 text-sm font-medium">{purchase.email}</p>
              {buyerNip && <p className="text-sm text-muted-foreground">NIP: {buyerNip}</p>}
            </div>
          </div>

          <table className="mt-8 w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="pb-2">Nazwa usługi</th>
                <th className="pb-2 text-right">Netto</th>
                <th className="pb-2 text-right">VAT ({VAT_RATE}%)</th>
                <th className="pb-2 text-right">Brutto</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3">{productLabel}</td>
                <td className="py-3 text-right tabular-nums">{formatPLN(net)}</td>
                <td className="py-3 text-right tabular-nums">{formatPLN(vat)}</td>
                <td className="py-3 text-right tabular-nums">{formatPLN(gross)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <div className="w-56 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Razem netto</span>
                <span className="tabular-nums">{formatPLN(net)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Razem VAT</span>
                <span className="tabular-nums">{formatPLN(vat)}</span>
              </div>
              <div className="flex justify-between rounded-md bg-primary/10 px-2 py-1.5 font-bold">
                <span>Do zapłaty</span>
                <span className="tabular-nums">{formatPLN(gross)}</span>
              </div>
            </div>
          </div>

          <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">
            Faktura wystawiona i przesłana w formie elektronicznej zgodnie z art. 106n ustawy o podatku od
            towarów i usług — nie wymaga podpisu ani pieczęci. Płatność zrealizowana kartą płatniczą za
            pośrednictwem Stripe.
          </p>
        </div>
      </div>
    </div>
  );
}
