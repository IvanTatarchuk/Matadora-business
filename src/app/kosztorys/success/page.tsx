import Link from "next/link";
import { CheckCircle2, ArrowRight, HardHat, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { PrintReceiptButton } from "./receipt-actions";

const PRODUCT_LABEL = "Analiza AI kosztorysu";
const PRODUCT_PRICE_PLN = 500;

const SELLER_NIP = "955-235-98-44";
const SELLER_NAME = "VANBUD Ivan Tatarchuk";
const SELLER_ADDRESS = "ul. Mielecka 5, 70-740 Szczecin";

export default async function KosztorysSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const tierLabel = PRODUCT_LABEL;
  const price = PRODUCT_PRICE_PLN;

  let invoicePaid = false;
  if (searchParams.session_id) {
    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("kosztorys_purchases")
      .select("status")
      .eq("stripe_session_id", searchParams.session_id)
      .maybeSingle();
    invoicePaid = data?.status === "paid";
  }
  const purchaseDate = new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 print:bg-white print:p-0">
      <div className="max-w-md w-full text-center print:max-w-full">
        <div className="flex justify-center mb-6 print:hidden">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <HardHat className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg">matadora.business</span>
        </div>

        <h1 className="text-2xl font-bold print:hidden">Płatność zakończona!</h1>
        <p className="mt-2 text-muted-foreground print:hidden">
          Dziękujemy za zakup. <strong>{tierLabel}</strong> uruchomi się automatycznie po powrocie do
          kalkulatora.
        </p>

        {/* RECEIPT / POTWIERDZENIE ZAKUPU */}
        <div className="mt-6 rounded-xl border bg-white p-5 text-left space-y-3 print:mt-0 print:rounded-none print:border-0 print:shadow-none">
          <p className="text-sm font-semibold text-center border-b pb-2">Potwierdzenie zakupu</p>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Produkt</dt>
              <dd className="font-medium">{tierLabel}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Kwota</dt>
              <dd className="font-medium">{price.toFixed(2)} zł brutto</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Data zakupu</dt>
              <dd className="font-medium">{purchaseDate}</dd>
            </div>
            {searchParams.session_id && (
              <div className="flex justify-between gap-2">
                <dt className="shrink-0 text-muted-foreground">Nr transakcji</dt>
                <dd className="truncate font-mono text-xs">{searchParams.session_id}</dd>
              </div>
            )}
          </dl>
          <div className="border-t pt-3 text-xs text-muted-foreground space-y-0.5">
            <p className="font-semibold text-slate-700">Sprzedawca</p>
            <p>{SELLER_NAME}</p>
            <p>{SELLER_ADDRESS}</p>
            <p>NIP: {SELLER_NIP}</p>
          </div>
          <p className="rounded-md bg-blue-50 p-2.5 text-xs text-blue-700">
            To potwierdzenie nie jest fakturą VAT.{" "}
            {invoicePaid
              ? "Faktura VAT jest już gotowa do pobrania poniżej oraz została wysłana na Twój adres e-mail."
              : "Faktura VAT zostanie wysłana automatycznie na Twój adres e-mail w ciągu kilku sekund, gdy tylko płatność zostanie zaksięgowana."}
          </p>
        </div>

        <div className="mt-6 space-y-3 print:hidden">
          {searchParams.session_id && (
            <Button variant="outline" className="w-full" asChild>
              <Link href={`/faktura/${searchParams.session_id}`}>
                <Receipt className="mr-2 h-4 w-4" /> Pobierz fakturę VAT
              </Link>
            </Button>
          )}
          <PrintReceiptButton />
          <Button className="w-full" asChild>
            <Link
              href={
                searchParams.session_id
                  ? `/kosztorys?paid_session_id=${encodeURIComponent(searchParams.session_id)}`
                  : "/kosztorys"
              }
            >
              Wróć do kalkulatora i pobierz wynik <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/register">Utwórz konto i zapisz kosztorys</Link>
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground print:hidden">
          Pytania? Napisz:{" "}
          <a href="mailto:vanbud.felix@gmail.com" className="text-primary hover:underline">
            vanbud.felix@gmail.com
          </a>
        </p>
        <p className="mt-3 text-xs text-muted-foreground print:hidden">
          <Link href="/regulamin" className="hover:text-foreground">Regulamin</Link>
          {" · "}
          <Link href="/polityka-prywatnosci" className="hover:text-foreground">Polityka prywatności</Link>
        </p>
      </div>
    </div>
  );
}
