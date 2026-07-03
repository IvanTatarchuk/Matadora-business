import { getOrgAnalytics } from "@/lib/actions/analytics";
import { AnalyticsClient } from "./analytics-client";

export default async function AnalyticsPage() {
  const analytics = await getOrgAnalytics();
  return <AnalyticsClient analytics={analytics} />;
}
