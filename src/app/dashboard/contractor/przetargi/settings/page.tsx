import { createClient } from "@/lib/supabase/server";
import { PrzetargiSettingsClient } from "./settings-client";

export default async function PrzetargiSettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (s: any) => s as any;
  const { data: subscription } = await db(supabase)
    .from("przetargi_subscriptions")
    .select("email, categories, voivodeship, is_active")
    .eq("email", (user?.email ?? "").toLowerCase().trim())
    .maybeSingle();

  return (
    <PrzetargiSettingsClient
      defaultEmail={user?.email ?? ""}
      subscription={subscription ?? null}
    />
  );
}
