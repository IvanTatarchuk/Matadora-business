import { createClient } from "@/lib/supabase/server";
import { CatalogManager } from "@/components/wholesaler/catalog-manager";

export default async function WholesalerCatalogPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: materials } = await supabase
    .from("materials_catalog")
    .select("*")
    .eq("wholesaler_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Katalog materiałów</h1>
        <p className="text-sm text-muted-foreground">
          Produkty dodane tutaj mogą być wykorzystane w ofertach wykonawców.
          Zamówienia są generowane automatycznie po zaakceptowaniu takiej oferty.
        </p>
      </div>

      <CatalogManager materials={materials ?? []} />
    </div>
  );
}
