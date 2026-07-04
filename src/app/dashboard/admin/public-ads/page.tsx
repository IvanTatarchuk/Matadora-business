import { createClient } from "@/lib/supabase/server";
import { AdminAdsClient } from "./admin-ads-client";

export default async function AdminPublicAdsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center text-muted-foreground">
          <p>Не авторизовано</p>
        </div>
      </div>
    );
  }

  // Check if user is admin (you may need to implement proper admin check)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // @ts-ignore - role type needs to be updated
  const isAdmin = profile?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center text-muted-foreground">
          <p>Доступ заборонено. Тільки адміністратори можуть переглядати цю сторінку.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <AdminAdsClient />
    </div>
  );
}
