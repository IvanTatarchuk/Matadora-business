"use client";

import { useState, useTransition } from "react";
import { MapPin, Home, Phone, Mail, Calendar, DollarSign, Send, X, Star, MessageSquare, CheckCircle2, Clock, ThumbsUp } from "lucide-react";
import { respondToAd, updateResponseStatus, createContractorReview, getContractorRating, type PublicAd, type AdResponse } from "@/lib/actions/public-ads";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PROPERTY_TYPES = [
  { value: "apartment", label: "Квартира" },
  { value: "house", label: "Будинок" },
  { value: "office", label: "Офіс" },
  { value: "commercial", label: "Комерційне приміщення" },
];

const WORK_TYPES = [
  { value: "full_repair", label: "Повний ремонт" },
  { value: "partial", label: "Частковий ремонт" },
  { value: "electric", label: "Електрика" },
  { value: "plumbing", label: "Сантехніка" },
  { value: "painting", label: "Малярні роботи" },
  { value: "flooring", label: "Підлога" },
  { value: "other", label: "Інше" },
];

interface Props {
  ad: PublicAd | null;
  responses: any[];
  user: any;
}

export function AdDetailsClient({ ad, responses, user }: Props) {
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  const [responseForm, setResponseForm] = useState({
    message: "",
    estimated_price: "",
    estimated_days: "",
  });

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    review: "",
  });

  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  if (!ad) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <p className="font-medium">Оголошення не знайдено</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwner = user && user.id === ad.user_id;
  const canRespond = user && !isOwner;

  function handleRespond() {
    if (!responseForm.message.trim()) {
      setError("Повідомлення є обов'язковим");
      return;
    }
    if (!ad) {
      setError("Оголошення не знайдено");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await respondToAd({
        ad_id: ad.id,
        message: responseForm.message,
        estimated_price: responseForm.estimated_price ? Number(responseForm.estimated_price) : undefined,
        estimated_days: responseForm.estimated_days ? Number(responseForm.estimated_days) : undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "Помилка відправки відповіді");
        return;
      }
      setShowResponseForm(false);
      setResponseForm({ message: "", estimated_price: "", estimated_days: "" });
      window.location.reload();
    });
  }

  function handleUpdateStatus(responseId: string, status: "accepted" | "rejected") {
    startTransition(async () => {
      const res = await updateResponseStatus(responseId, status);
      if (!res.ok) {
        setError(res.error ?? "Помилка оновлення статусу");
        return;
      }
      window.location.reload();
    });
  }

  function handleCreateReview(contractorId: string) {
    if (!reviewForm.review.trim()) {
      setError("Відгук є обов'язковим");
      return;
    }
    if (!ad) {
      setError("Оголошення не знайдено");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createContractorReview({
        ad_id: ad.id,
        contractor_id: contractorId,
        rating: reviewForm.rating,
        review: reviewForm.review,
      });
      if (!res.ok) {
        setError(res.error ?? "Помилка створення відгуку");
        return;
      }
      setShowReviewForm(false);
      setReviewForm({ rating: 5, review: "" });
      window.location.reload();
    });
  }

  function handleContactSubmit() {
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      setError("Ім'я, email та повідомлення є обов'язковими");
      return;
    }
    setError(null);
    // In a real implementation, this would send an email
    alert("Повідомлення відправлено! Автор оголошення зв'яжеться з вами.");
    setShowContactForm(false);
    setContactForm({ name: "", email: "", phone: "", message: "" });
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Back button */}
      <Button variant="ghost" className="mb-4" onClick={() => window.history.back()}>
        ← Назад
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photos */}
          {ad.photos && ad.photos.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="grid grid-cols-2 gap-2 p-2">
                  {ad.photos.map((photo, index) => (
                    <div
                      key={index}
                      className={`aspect-video bg-muted rounded-lg overflow-hidden ${
                        index === 0 ? "col-span-2" : ""
                      }`}
                    >
                      <img
                        src={photo}
                        alt={`${ad.title} - фото ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ad Details */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">{ad.title}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{new Date(ad.created_at).toLocaleDateString("uk-UA")}</span>
                    <span>•</span>
                    <span>{ad.views_count} переглядів</span>
                    <span>•</span>
                    <span>{ad.responses_count} відповідей</span>
                  </div>
                </div>
                {ad.status === "closed" && (
                  <span className="px-3 py-1 bg-muted rounded-full text-sm">
                    Закрито
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Location */}
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{ad.city}</p>
                  {ad.address && <p className="text-sm text-muted-foreground">{ad.address}</p>}
                </div>
              </div>

              {/* Property Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {PROPERTY_TYPES.find((pt) => pt.value === ad.property_type)?.label}
                    </p>
                    {ad.area_size && <p className="text-sm text-muted-foreground">{ad.area_size} м²</p>}
                  </div>
                </div>
                {ad.start_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Початок робіт</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(ad.start_date).toLocaleDateString("uk-UA")}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Budget */}
              {ad.budget_min && (
                <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">Бюджет</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-400">
                      {ad.budget_min.toLocaleString()} грн
                      {ad.budget_max && ` - ${ad.budget_max.toLocaleString()} грн`}
                    </p>
                  </div>
                </div>
              )}

              {/* Work Types */}
              {ad.work_type && ad.work_type.length > 0 && (
                <div>
                  <p className="font-medium mb-2">Види робіт:</p>
                  <div className="flex flex-wrap gap-2">
                    {ad.work_type.map((wt) => (
                      <span
                        key={wt}
                        className="px-3 py-1 bg-muted rounded-full text-sm"
                      >
                        {WORK_TYPES.find((w) => w.value === wt)?.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {ad.description && (
                <div>
                  <p className="font-medium mb-2">Опис:</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{ad.description}</p>
                </div>
              )}

              {/* Contact */}
              {ad.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <a
                    href={`tel:${ad.phone}`}
                    className="font-medium hover:underline"
                  >
                    {ad.phone}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Responses */}
          {isOwner && responses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Відповіді ({responses.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {responses.map((response) => (
                  <div
                    key={response.id}
                    className="p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">
                          {response.contractor?.full_name || "Підрядник"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(response.created_at).toLocaleString("uk-UA")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {response.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(response.id, "accepted")}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Прийняти
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(response.id, "rejected")}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Відхилити
                            </Button>
                          </>
                        )}
                        {response.status === "accepted" && (
                          <>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                              Прийнято
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowReviewForm(response.id)}
                            >
                              <Star className="h-4 w-4 mr-1" />
                              Відгук
                            </Button>
                          </>
                        )}
                        {response.status === "rejected" && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                            Відхилено
                          </span>
                        )}
                      </div>
                    </div>
                    {response.message && (
                      <p className="text-sm">{response.message}</p>
                    )}
                    <div className="flex gap-4 text-sm">
                      {response.estimated_price && (
                        <span className="font-medium">
                          {response.estimated_price.toLocaleString()} грн
                        </span>
                      )}
                      {response.estimated_days && (
                        <span className="text-muted-foreground">
                          {response.estimated_days} днів
                        </span>
                      )}
                    </div>
                    {/* Review Form */}
                    {showReviewForm === response.id && (
                      <div className="mt-3 pt-3 border-t space-y-3">
                        <div>
                          <Label>Оцінка</Label>
                          <div className="flex gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                className="text-2xl"
                              >
                                {star <= reviewForm.rating ? "⭐" : "☆"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="review">Відгук</Label>
                          <Textarea
                            id="review"
                            value={reviewForm.review}
                            onChange={(e) => setReviewForm({ ...reviewForm, review: e.target.value })}
                            placeholder="Опишіть ваш досвід роботи з цим підрядником..."
                            rows={3}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleCreateReview(response.contractor_id)}
                            disabled={pending}
                          >
                            {pending ? "Відправка..." : "Надіслати відгук"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowReviewForm(false)}
                          >
                            Скасувати
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action Card */}
          <Card>
            <CardHeader>
              <CardTitle>Дії</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canRespond && ad.status === "active" && (
                <>
                  {!showResponseForm ? (
                    <Button
                      className="w-full"
                      onClick={() => setShowResponseForm(true)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Відповісти на оголошення
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="message">Повідомлення *</Label>
                        <Textarea
                          id="message"
                          value={responseForm.message}
                          onChange={(e) => setResponseForm({ ...responseForm, message: e.target.value })}
                          placeholder="Опишіть ваш досвід та пропозицію..."
                          rows={4}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="estimated_price">Оціночна вартість (грн)</Label>
                        <Input
                          id="estimated_price"
                          type="number"
                          value={responseForm.estimated_price}
                          onChange={(e) => setResponseForm({ ...responseForm, estimated_price: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="estimated_days">Оціночний термін (днів)</Label>
                        <Input
                          id="estimated_days"
                          type="number"
                          value={responseForm.estimated_days}
                          onChange={(e) => setResponseForm({ ...responseForm, estimated_days: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      {error && <p className="text-sm text-destructive">{error}</p>}
                      <Button
                        className="w-full"
                        onClick={handleRespond}
                        disabled={pending}
                      >
                        {pending ? "Відправка..." : "Відправити відповідь"}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowResponseForm(false)}
                      >
                        Скасувати
                      </Button>
                    </div>
                  )}
                </>
              )}
              {isOwner && ad.status === "active" && (
                <p className="text-sm text-muted-foreground">
                  Ви є власником цього оголошення
                </p>
              )}
              {ad.status === "closed" && (
                <p className="text-sm text-muted-foreground">
                  Оголошення закрито
                </p>
              )}
            </CardContent>
          </Card>

          {/* Contact Card */}
          {ad.phone && (
            <Card>
              <CardHeader>
                <CardTitle>Контакт</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <a
                    href={`tel:${ad.phone}`}
                    className="font-medium hover:underline"
                  >
                    {ad.phone}
                  </a>
                </div>
                <p className="text-sm text-muted-foreground">
                  {ad.preferred_contact === "phone"
                    ? "Бажано зв'язуватися телефоном"
                    : ad.preferred_contact === "email"
                    ? "Бажано зв'язуватися email"
                    : "Бажано зв'язуватися через чат"}
                </p>
                {!showContactForm ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => setShowContactForm(true)}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Написати повідомлення
                  </Button>
                ) : (
                  <div className="space-y-3 pt-3 border-t">
                    <div>
                      <Label htmlFor="contact-name">Ім'я *</Label>
                      <Input
                        id="contact-name"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact-email">Email *</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact-phone">Телефон</Label>
                      <Input
                        id="contact-phone"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact-message">Повідомлення *</Label>
                      <Textarea
                        id="contact-message"
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder="Ваше повідомлення автору оголошення..."
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={handleContactSubmit}
                        disabled={pending}
                      >
                        {pending ? "Відправка..." : "Надіслати"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowContactForm(false)}
                      >
                        Скасувати
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
