"use client";

import { useState, useTransition } from "react";
import { Star, MessageSquare, CheckCircle2, Clock } from "lucide-react";
import { createReview, type ReviewableProject } from "@/lib/actions/reviews";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  initialReviewableProjects: ReviewableProject[];
};

export function ReviewsClient({ initialReviewableProjects }: Props) {
  const [reviewableProjects, setReviewableProjects] = useState<ReviewableProject[]>(initialReviewableProjects);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const pendingProjects = reviewableProjects.filter((p) => !p.alreadyReviewed);
  const completedProjects = reviewableProjects.filter((p) => p.alreadyReviewed);

  function handleStartReview(projectId: string) {
    setReviewing(projectId);
    setRating(0);
    setComment("");
    setError(null);
  }

  function handleSubmitReview(projectId: string, revieweeId: string) {
    if (rating === 0) {
      setError("Wybierz ocenę (1-5 gwiazdek)");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createReview({
        projectId,
        revieweeId,
        rating,
        comment: comment || undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "Błąd dodawania opinii");
        return;
      }
      setReviewableProjects((prev) =>
        prev.map((p) => (p.projectId === projectId ? { ...p, alreadyReviewed: true } : p))
      );
      setReviewing(null);
      setRating(0);
      setComment("");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Opinie i recenzje</h1>
        <p className="text-sm text-muted-foreground mt-1">Oceń współpracę z kontrahentami</p>
      </div>

      {/* Pending Reviews */}
      {pendingProjects.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Oczekujące opinie ({pendingProjects.length})</h2>
          <div className="space-y-3">
            {pendingProjects.map((project) => (
              <Card key={project.projectId}>
                <CardContent className="p-4">
                  {reviewing === project.projectId ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium">Oceń współpracę z {project.revieweeName}</p>
                        <p className="text-xs text-muted-foreground">{project.projectTitle}</p>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className="text-2xl transition-colors"
                          >
                            <Star
                              className={`h-6 w-6 ${
                                star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <Input
                        placeholder="Dodaj komentarz (opcjonalne)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                      {error && <p className="text-sm text-destructive">{error}</p>}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSubmitReview(project.projectId, project.revieweeId)}
                          disabled={pending}
                        >
                          {pending ? "Wysyłanie..." : "Wyślij opinię"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setReviewing(null)}>
                          Anuluj
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{project.revieweeName}</p>
                        <p className="text-sm text-muted-foreground">{project.projectTitle}</p>
                      </div>
                      <Button size="sm" onClick={() => handleStartReview(project.projectId)}>
                        <MessageSquare className="h-4 w-4 mr-1" /> Dodaj opinię
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Reviews */}
      {completedProjects.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Wysłane opinie ({completedProjects.length})</h2>
          <div className="space-y-3">
            {completedProjects.map((project) => (
              <Card key={project.projectId} className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{project.revieweeName}</p>
                      <p className="text-sm text-muted-foreground">{project.projectTitle}</p>
                    </div>
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm">Opinia wysłana</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Reviews */}
      {reviewableProjects.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <MessageSquare className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Brak projektów do oceny</p>
            <p className="text-sm mt-1">Opinie możesz dodać po zakończeniu współpracy</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
