"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createReview, type ReviewableProject } from "@/lib/actions/reviews";

export function ReviewsPanel({ items }: { items: ReviewableProject[] }) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave a review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {items.map((item) => (
          <ReviewRow key={item.projectId} item={item} />
        ))}
      </CardContent>
    </Card>
  );
}

function ReviewRow({ item }: { item: ReviewableProject }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(item.alreadyReviewed);

  if (done) {
    return (
      <div className="flex items-center justify-between border-b pb-3 text-sm last:border-0">
        <span>
          <span className="font-medium">{item.revieweeName}</span>
          <span className="text-muted-foreground"> · {item.projectTitle}</span>
        </span>
        <span className="flex items-center gap-1 text-emerald-600">
          <Check className="h-4 w-4" /> Reviewed
        </span>
      </div>
    );
  }

  function submit() {
    setError(null);
    if (rating < 1) {
      setError("Please select a rating.");
      return;
    }
    startTransition(async () => {
      const res = await createReview({
        projectId: item.projectId,
        revieweeId: item.revieweeId,
        rating,
        comment,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not submit");
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 border-b pb-4 last:border-0">
      <div className="text-sm">
        <span className="font-medium">{item.revieweeName}</span>
        <span className="text-muted-foreground"> · {item.projectTitle}</span>
      </div>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(i)}
            className="p-0.5"
            aria-label={`${i} star`}
          >
            <Star
              className={cn(
                "h-6 w-6",
                (hover || rating) >= i
                  ? "fill-amber-400 text-amber-400"
                  : "fill-muted text-muted-foreground/40"
              )}
            />
          </button>
        ))}
      </div>
      <Textarea
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience (optional)"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="button" size="sm" onClick={submit} disabled={pending}>
        {pending ? "Submitting…" : "Submit review"}
      </Button>
    </div>
  );
}
