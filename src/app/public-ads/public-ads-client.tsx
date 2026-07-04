"use client";

import { useState, useTransition } from "react";
import { Plus, Search, MapPin, Home, Phone, Mail, Image as ImageIcon, Filter, X, Calendar, DollarSign } from "lucide-react";
import { createPublicAd, type PublicAd, type CreateAdInput } from "@/lib/actions/public-ads";
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
  initialAds: PublicAd[];
  user: any;
}

export function PublicAdsClient({ initialAds, user }: Props) {
  const [ads, setAds] = useState<PublicAd[]>(initialAds);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterPropertyType, setFilterPropertyType] = useState<string>("all");
  const [filterWorkType, setFilterWorkType] = useState<string>("all");

  const [form, setForm] = useState<CreateAdInput>({
    title: "",
    description: "",
    property_type: "apartment",
    area_size: undefined,
    address: "",
    city: "",
    latitude: undefined,
    longitude: undefined,
    budget_min: undefined,
    budget_max: undefined,
    photos: [],
    phone: "",
    preferred_contact: "phone",
    work_type: [],
    start_date: "",
  });

  const filteredAds = ads.filter((ad) => {
    const matchesSearch = !searchQuery || 
      ad.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ad.description && ad.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCity = !filterCity || ad.city?.toLowerCase().includes(filterCity.toLowerCase());
    const matchesPropertyType = filterPropertyType === "all" || ad.property_type === filterPropertyType;
    const matchesWorkType = filterWorkType === "all" || ad.work_type.includes(filterWorkType);
    return matchesSearch && matchesCity && matchesPropertyType && matchesWorkType;
  });

  function handleCreate() {
    if (!form.title.trim() || !form.city?.trim()) {
      setError("Заголовок та місто є обов'язковими");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createPublicAd(form);
      if (!res.ok) {
        setError(res.error ?? "Помилка створення оголошення");
        return;
      }
      setShowForm(false);
      setForm({
        title: "",
        description: "",
        property_type: "apartment",
        area_size: undefined,
        address: "",
        city: "",
        latitude: undefined,
        longitude: undefined,
        budget_min: undefined,
        budget_max: undefined,
        photos: [],
        phone: "",
        preferred_contact: "phone",
        work_type: [],
        start_date: "",
      });
      // Refresh ads
      window.location.reload();
    });
  }

  function handleWorkTypeToggle(workType: string) {
    setForm((prev) => ({
      ...prev,
      work_type: prev.work_type?.includes(workType)
        ? prev.work_type.filter((wt) => wt !== workType)
        : [...(prev.work_type || []), workType],
    }));
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Оголошення про ремонт</h1>
        <p className="text-muted-foreground">
          Знайдіть підрядника для ремонту вашого житла або розмістіть власне оголошення
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <Button onClick={() => setShowForm(true)} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Додати оголошення
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Пошук за назвою..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Input
              placeholder="Місто"
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="w-[150px]"
            />
            <select
              value={filterPropertyType}
              onChange={(e) => setFilterPropertyType(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">Всі типи об'єктів</option>
              {PROPERTY_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>{pt.label}</option>
              ))}
            </select>
            <select
              value={filterWorkType}
              onChange={(e) => setFilterWorkType(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">Всі види робіт</option>
              {WORK_TYPES.map((wt) => (
                <option key={wt.value} value={wt.value}>{wt.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Create Form */}
      {showForm && (
        <Card className="mb-6 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Створити оголошення</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="title">Заголовок *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Наприклад: Ремонт 3-кімнатної квартири"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="property_type">Тип об'єкта *</Label>
                <select
                  id="property_type"
                  value={form.property_type}
                  onChange={(e) => setForm({ ...form, property_type: e.target.value as any })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {PROPERTY_TYPES.map((pt) => (
                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="area_size">Площа (м²)</Label>
                <Input
                  id="area_size"
                  type="number"
                  value={form.area_size || ""}
                  onChange={(e) => setForm({ ...form, area_size: e.target.value ? Number(e.target.value) : undefined })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="city">Місто *</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="address">Адреса</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="budget_min">Мін. бюджет (грн)</Label>
                <Input
                  id="budget_min"
                  type="number"
                  value={form.budget_min || ""}
                  onChange={(e) => setForm({ ...form, budget_min: e.target.value ? Number(e.target.value) : undefined })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="budget_max">Макс. бюджет (грн)</Label>
                <Input
                  id="budget_max"
                  type="number"
                  value={form.budget_max || ""}
                  onChange={(e) => setForm({ ...form, budget_max: e.target.value ? Number(e.target.value) : undefined })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+380 XX XXX XX XX"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="start_date">Бажана дата початку</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Опис</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Опишіть деталі ремонту, що потрібно зробити..."
                  rows={4}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Види робіт</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {WORK_TYPES.map((wt) => (
                    <button
                      key={wt.value}
                      type="button"
                      onClick={() => handleWorkTypeToggle(wt.value)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        form.work_type?.includes(wt.value)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted"
                      }`}
                    >
                      {wt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="photos">Фото (до 10 шт.)</Label>
                <div className="mt-2 border-2 border-dashed rounded-lg p-6 text-center">
                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Перетягніть фото сюди або натисніть для вибору
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, WEBP до 5MB
                  </p>
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>
                {pending ? "Створення..." : "Опублікувати"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Скасувати
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ads List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAds.map((ad) => (
          <Card key={ad.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {ad.photos && ad.photos.length > 0 && (
              <div className="aspect-video bg-muted relative">
                <img
                  src={ad.photos[0]}
                  alt={ad.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader className="pb-3">
              <CardTitle className="text-lg line-clamp-2">{ad.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{ad.city}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Home className="h-4 w-4" />
                <span>{PROPERTY_TYPES.find((pt) => pt.value === ad.property_type)?.label}</span>
                {ad.area_size && <span>• {ad.area_size} м²</span>}
              </div>
              {ad.budget_min && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-600">
                    {ad.budget_min.toLocaleString()} грн
                    {ad.budget_max && ` - ${ad.budget_max.toLocaleString()} грн`}
                  </span>
                </div>
              )}
              {ad.work_type && ad.work_type.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {ad.work_type.slice(0, 3).map((wt) => (
                    <span key={wt} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                      {WORK_TYPES.find((w) => w.value === wt)?.label}
                    </span>
                  ))}
                  {ad.work_type.length > 3 && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                      +{ad.work_type.length - 3}
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{ad.views_count} переглядів</span>
                  <span>•</span>
                  <span>{ad.responses_count} відповідей</span>
                </div>
                <Button size="sm" asChild>
                  <a href={`/public-ads/${ad.id}`}>Детальніше</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAds.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Home className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">Оголошень не знайдено</p>
            <p className="text-sm mt-1">Спробуйте змінити фільтри або створіть нове оголошення</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
