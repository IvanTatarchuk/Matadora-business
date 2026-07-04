import { createClient } from "@/lib/supabase/server";
import { listPublicAds } from "@/lib/actions/public-ads";
import { PublicAdsClient } from "./public-ads-client";

export default async function PublicAdsPage({
  searchParams,
}: {
  searchParams: { city?: string; property_type?: string; work_type?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { ok, data: ads } = await listPublicAds({
    city: searchParams.city,
    property_type: searchParams.property_type,
    work_type: searchParams.work_type,
  });

  return (
    <div className="min-h-screen bg-background">
      <PublicAdsClient initialAds={ok ? ads || [] : []} user={user} />
    </div>
  );
}
