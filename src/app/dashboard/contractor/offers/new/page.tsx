import { createClient } from "@/lib/supabase/server";
import { OfferWizard } from "@/components/offers/offer-wizard";

export default async function NewOfferPage() {
  const supabase = createClient();
  const { data: materials } = await supabase
    .from("materials_catalog")
    .select("id, product_name, sku, price_net, unit, stock_status")
    .order("product_name", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Utwórz nowy kosztorys</h1>
        <p className="text-muted-foreground">
          Zbuduj profesjonalny kosztorys etapowy, a następnie dołącz materiały.
        </p>
      </div>
      <OfferWizard materials={materials ?? []} />
    </div>
  );
}
