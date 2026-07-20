"use client";

import { useState, useTransition } from "react";
import { Search, Filter, Eye, Trash2, CheckCircle2, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Ad {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  status: string;
  created_at: string;
  views_count: number;
  responses_count: number;
  user_id: string;
}

export function AdminAdsClient() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Load ads on mount
  useState(() => {
    // In a real implementation, this would fetch from server
    setAds([]);
    setLoading(false);
  });

  const filteredAds = ads.filter((ad) => {
    const matchesSearch = !searchQuery || 
      ad.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ad.description && ad.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === "all" || ad.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  function handleDeleteAd() {
    if (!selectedAd) return;
    setError(null);
    startTransition(async () => {
      // In a real implementation, this would call a server action
      setAds(ads.filter((a) => a.id !== selectedAd.id));
      setShowDeleteDialog(false);
      setSelectedAd(null);
    });
  }

  function handleUpdateStatus(newStatus: string) {
    if (!selectedAd) return;
    setError(null);
    startTransition(async () => {
      // In a real implementation, this would call a server action
      setAds(ads.map((a) => a.id === selectedAd.id ? { ...a, status: newStatus } : a));
      setShowStatusDialog(false);
      setSelectedAd(null);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Moderacja ogłoszeń</h1>
        <p className="text-muted-foreground">
          Zarządzaj ogłoszeniami użytkowników
        </p>
      </div>

      {/* Filters */}
      <Card>
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
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">Wszystkie statusy</option>
              <option value="active">Aktywne</option>
              <option value="pending">Oczekujące na moderację</option>
              <option value="suspended">Zawieszone</option>
              <option value="closed">Zamknięte</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Wszystkich ogłoszeń</p>
            <p className="text-2xl font-bold">{ads.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Aktywne</p>
            <p className="text-2xl font-bold text-green-600">
              {ads.filter((a) => a.status === "active").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Oczekujące na moderację</p>
            <p className="text-2xl font-bold text-yellow-600">
              {ads.filter((a) => a.status === "pending").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Zawieszone</p>
            <p className="text-2xl font-bold text-red-600">
              {ads.filter((a) => a.status === "suspended").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ads List */}
      <Card>
        <CardHeader>
          <CardTitle>Ogłoszenia</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAds.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nie znaleziono ogłoszeń</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAds.map((ad) => (
                <div
                  key={ad.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{ad.title}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          ad.status === "active"
                            ? "bg-green-100 text-green-700"
                            : ad.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : ad.status === "suspended"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {ad.status === "active"
                          ? "Aktywne"
                          : ad.status === "pending"
                          ? "Oczekuje"
                          : ad.status === "suspended"
                          ? "Zawieszone"
                          : "Zamknięte"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{ad.city}</span>
                      <span>•</span>
                      <span>{new Date(ad.created_at).toLocaleDateString("pl-PL")}</span>
                      <span>•</span>
                      <span>{ad.views_count} wyświetleń</span>
                      <span>•</span>
                      <span>{ad.responses_count} odpowiedzi</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedAd(ad)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {ad.status !== "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedAd(ad);
                          setShowStatusDialog(true);
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    {ad.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedAd(ad);
                          setShowStatusDialog(true);
                        }}
                      >
                        <AlertCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedAd(ad);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      {showDeleteDialog && selectedAd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Usunąć ogłoszenie?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Czy na pewno chcesz usunąć ogłoszenie &quot;{selectedAd.title}&quot;? Tej operacji nie można cofnąć.
              </p>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Anuluj
                </Button>
                <Button variant="destructive" onClick={handleDeleteAd} disabled={pending}>
                  {pending ? "Usuwanie..." : "Usuń"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Dialog */}
      {showStatusDialog && selectedAd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Zmień status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nowy status</Label>
                <select
                  className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm"
                  defaultValue={selectedAd.status}
                >
                  <option value="active">Aktywne</option>
                  <option value="pending">Oczekuje na moderację</option>
                  <option value="suspended">Zawieszone</option>
                  <option value="closed">Zamknięte</option>
                </select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                  Anuluj
                </Button>
                <Button onClick={() => handleUpdateStatus(selectedAd.status === "active" ? "suspended" : "active")} disabled={pending}>
                  {pending ? "Aktualizowanie..." : "Zmień"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
