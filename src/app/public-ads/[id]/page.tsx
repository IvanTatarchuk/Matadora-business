import { createClient } from "@/lib/supabase/server";
import { getPublicAd, getAdResponses, getContractorRating, getContractorReviews } from "@/lib/actions/public-ads";
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
  const responseList = okResponses && responses ? responses : [];

  const contractorIds = Array.from(new Set(responseList.map((r: any) => r.contractor_id)));
  const [ratingResults, reviewResults] = await Promise.all([
    Promise.all(contractorIds.map(async (id) => ({ id, res: await getContractorRating(id) }))),
    Promise.all(contractorIds.map(async (id) => ({ id, res: await getContractorReviews(id) }))),
  ]);
  const contractorRatings: Record<string, { rating: number; count: number }> = {};
  for (const { id, res } of ratingResults) {
    if (res.ok && res.count) {
      contractorRatings[id] = { rating: res.rating ?? 0, count: res.count };
    }
  }
  const contractorReviews: Record<string, any[]> = {};
  for (const { id, res } of reviewResults) {
    if (res.ok && res.data) {
      contractorReviews[id] = res.data;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdDetailsClient
        ad={ok && ad ? ad : null}
        responses={responseList}
        contractorRatings={contractorRatings}
        contractorReviews={contractorReviews}
        user={user}
      />
    </div>
  );
}
