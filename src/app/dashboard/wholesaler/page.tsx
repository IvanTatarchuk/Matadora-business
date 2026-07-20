import { Package, ShoppingCart, Boxes } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPLN } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "warning"> = {
  pending: "warning",
  confirmed: "default",
  shipped: "default",
  delivered: "success",
  cancelled: "secondary",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Oczekujące",
  confirmed: "Potwierdzone",
  shipped: "Wysłane",
  delivered: "Dostarczone",
  cancelled: "Anulowane",
};

export default async function WholesalerDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: productCount } = await supabase
    .from("materials_catalog")
    .select("id", { count: "exact", head: true })
    .eq("wholesaler_id", user!.id);

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total_amount, created_at")
    .eq("wholesaler_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const list = orders ?? [];
  const pending = list.filter((o) => o.status === "pending").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Panel hurtowni</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Produkty" value={productCount ?? 0} icon={Package} />
        <StatCard label="Zamówienia" value={list.length} icon={ShoppingCart} />
        <StatCard label="Oczekujące zamówienia" value={pending} icon={Boxes} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Przychodzące zamówienia</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Brak zamówień. Zamówienia pojawiają się automatycznie, gdy
              zostanie zaakceptowana oferta zawierająca Twoje materiały.
            </p>
          ) : (
            <div className="divide-y">
              {list.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium">Zamówienie #{o.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("pl-PL")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">
                      {formatPLN(Number(o.total_amount))}
                    </span>
                    <Badge variant={STATUS_VARIANT[o.status] ?? "secondary"}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
