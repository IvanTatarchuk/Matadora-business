import { getReviewableProjects } from "@/lib/actions/reviews";
import { ReviewsClient } from "./reviews-client";

export default async function ReviewsPage() {
  const reviewableProjects = await getReviewableProjects();
  return <ReviewsClient initialReviewableProjects={reviewableProjects} />;
}
