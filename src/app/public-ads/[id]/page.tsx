import { createClient } from "@/lib/supabase/server";
import { getPublicAd, getAdResponses, getContractorRating } from "@/lib/actions/public-ads";
import { AdDetailsClient } from "./ad-details-client";

export default async function AdDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { ok, data: ad } = await getPublicAd(params.id);
  const { ok: okResponses, data: responses } = await getAdResponses(params.id);

  return (
    <div className="min-h-screen bg-background">
      <AdDetailsClient 
        ad={ok ? ad : null} 
        responses={okResponses ? responses : []}
        user={user}
      />
    </div>
  );
}
