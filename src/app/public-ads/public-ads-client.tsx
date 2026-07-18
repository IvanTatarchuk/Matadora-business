"use client";

import { useState, useTransition } from "react";
import { Plus, Search, MapPin, Home, Phone, Mail, Image as ImageIcon, Filter, X, Calendar, DollarSign, Upload, Trash2 } from "lucide-react";
import { createPublicAd, uploadAdPhoto, deleteAdPhoto, type PublicAd, type CreateAdInput } from "@/lib/actions/public-ads";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PROPERTY_TYPES = [
  { value: "apartment", label: "Mieszkanie" },
  { value: "house", label: "Dom" },
  { value: "office", label: "Biuro" },
  { value: "commercial", label: "Lokal komercyjny" },
];

const WORK_TYPES = [
  { value: "full_repair", label: "Remont kompleksowy" },
  { value: "partial", label: "Remont częściowy" },
  { value: "electric", label: "Elektryka" },
  { value: "plumbing", label: "Hydraulika" },
  { value: "painting", label: "Prace malarskie" },
  { value: "flooring", label: "Podłogi" },
  { value: "other", label: "Inne" },
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [tempAdId, setTempAdId] = useState<string | null>(null);
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
      setError("Tytuł i miasto są wymagane");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createPublicAd(form);
      if (!res.ok) {
        setError(res.error ?? "Błąd tworzenia ogłoszenia");
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

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file) return;
    
    // Sprawdzenie liczby zdjęć
    if (form.photos && form.photos.length >= 10) {
      setError("Maksymalnie 10 zdjęć");
      return;
    }

    // Sprawdzenie rozmiaru
    if (file.size > 5 * 1024 * 1024) {
      setError("Plik jest za duży (maks. 5MB)");
      return;
    }

    // Sprawdzenie typu
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError("Nieobsługiwany format (tylko JPG, PNG, WEBP)");
      return;
    }

    setUploadingPhoto(true);
    setError(null);

    try {
      // Tworzymy tymczasowe ID na potrzeby przesyłania
      const tempId = tempAdId || crypto.randomUUID();
      setTempAdId(tempId);

      const res = await uploadAdPhoto(file, tempId);
      if (!res.ok) {
        setError(res.error ?? "Błąd przesyłania");
        return;
      }

      setForm((prev) => ({
        ...prev,
        photos: [...(prev.photos || []), res.url!],
      }));
    } catch (err) {
      setError("Błąd przesyłania zdjęcia");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handlePhotoDelete(photoUrl: string) {
    setError(null);

    try {
      const res = await deleteAdPhoto(photoUrl);
      if (!res.ok) {
        setError(res.error ?? "Błąd usuwania");
        return;
      }

      setForm((prev) => ({
        ...prev,
        photos: prev.photos?.filter((p) => p !== photoUrl) || [],
      }));
    } catch (err) {
      setError("Błąd usuwania zdjęcia");
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Ogłoszenia remontowe</h1>
        <p className="text-muted-foreground">
          Znajdź wykonawcę do remontu swojej nieruchomości lub dodaj własne ogłoszenie
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <Button onClick={() => setShowForm(true)} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Dodaj ogłoszenie
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po nazwie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Input
              placeholder="Miasto"
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="w-[150px]"
            />
            <select
              value={filterPropertyType}
              onChange={(e) => setFilterPropertyType(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">Wszystkie typy obiektów</option>
              {PROPERTY_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>{pt.label}</option>
              ))}
            </select>
            <select
              value={filterWorkType}
              onChange={(e) => setFilterWorkType(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">Wszystkie rodzaje prac</option>
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
              <CardTitle>Utwórz ogłoszenie</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="title">Tytuł *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Np.: Remont mieszkania 3-pokojowego"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="property_type">Typ obiektu *</Label>
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
                <Label htmlFor="area_size">Powierzchnia (m²)</Label>
                <Input
                  id="area_size"
                  type="number"
                  value={form.area_size || ""}
                  onChange={(e) => setForm({ ...form, area_size: e.target.value ? Number(e.target.value) : undefined })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="city">Miasto *</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="address">Adres</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="budget_min">Min. budżet (zł)</Label>
                <Input
                  id="budget_min"
                  type="number"
                  value={form.budget_min || ""}
                  onChange={(e) => setForm({ ...form, budget_min: e.target.value ? Number(e.target.value) : undefined })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="budget_max">Maks. budżet (zł)</Label>
                <Input
                  id="budget_max"
                  type="number"
                  value={form.budget_max || ""}
                  onChange={(e) => setForm({ ...form, budget_max: e.target.value ? Number(e.target.value) : undefined })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+48 XXX XXX XXX"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="start_date">Preferowana data rozpoczęcia</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Opis</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Opisz szczegóły remontu, jakie prace należy wykonać..."
                  rows={4}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Rodzaje prac</Label>
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
                <Label htmlFor="photos">Zdjęcia (maks. 10 szt.)</Label>
                <div className="mt-2 space-y-3">
                  {/* Uploaded photos preview */}
                  {form.photos && form.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {form.photos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={photo}
                            alt={`Zdjęcie ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => handlePhotoDelete(photo)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Upload button */}
                  {(!form.photos || form.photos.length < 10) && (
                    <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                      <input
                        type="file"
                        id="photos"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                        className="hidden"
                      />
                      <label htmlFor="photos" className="cursor-pointer">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {uploadingPhoto ? "Przesyłanie..." : "Kliknij, aby wybrać zdjęcie"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG, WEBP do 5MB
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {form.photos?.length || 0}/10 zdjęć
                        </p>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>
                {pending ? "Tworzenie..." : "Opublikuj"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Anuluj
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
                {ad.area_size && <span>• {ad.area_size} m²</span>}
              </div>
              {ad.budget_min && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-600">
                    {ad.budget_min.toLocaleString()} zł
                    {ad.budget_max && ` - ${ad.budget_max.toLocaleString()} zł`}
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
                  <span>{ad.views_count} wyświetleń</span>
                  <span>•</span>
                  <span>{ad.responses_count} odpowiedzi</span>
                </div>
                <Button size="sm" asChild>
                  <a href={`/public-ads/${ad.id}`}>Szczegóły</a>
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
            <p className="font-medium">Nie znaleziono ogłoszeń</p>
            <p className="text-sm mt-1">Spróbuj zmienić filtry lub dodaj nowe ogłoszenie</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
