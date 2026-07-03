import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPLN } from "@/lib/utils";
import { OrderStatusControl } from "@/components/wholesaler/order-status-control";

export default async function WholesalerOrdersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total_amount, created_at, offer_id")
    .eq("wholesaler_id", user!.id)
    .order("created_at", { ascending: false });

  const list = orders ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">
          Orders are created automatically when a contractor offer that
          references your materials is accepted.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incoming orders ({list.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No orders yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3 font-medium">Order</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 text-right font-medium">Amount</th>
                    <th className="p-3 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {list.map((o) => (
                    <tr key={o.id}>
                      <td className="p-3 font-medium">
                        #{o.id.slice(0, 8)}
                        <p className="text-xs font-normal text-muted-foreground">
                          offer {o.offer_id.slice(0, 8)}
                        </p>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("pl-PL")}
                      </td>
                      <td className="p-3 text-right font-semibold">
                        {formatPLN(Number(o.total_amount))}
                      </td>
                      <td className="p-3">
                        <OrderStatusControl orderId={o.id} status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
