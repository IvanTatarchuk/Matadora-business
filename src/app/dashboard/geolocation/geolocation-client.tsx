"use client";

import { useState, useTransition } from "react";
import { MapPin, Plus, AlertCircle, CheckCircle2, Clock, Navigation, Layers, X, Search, Filter } from "lucide-react";
import {
  recordWorkerLocation, createGeofence,
  type WorkerLocation, type Geofence, type GeofenceEvent,
} from "@/lib/actions/geolocation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  initialLocations: WorkerLocation[];
  initialGeofences: Geofence[];
  initialEvents: GeofenceEvent[];
};

export function GeolocationClient({ initialLocations, initialGeofences, initialEvents }: Props) {
  const [locations, setLocations] = useState<WorkerLocation[]>(initialLocations);
  const [geofences, setGeofences] = useState<Geofence[]>(initialGeofences);
  const [events, setEvents] = useState<GeofenceEvent[]>(initialEvents);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEventType, setFilterEventType] = useState<"all" | "entry" | "exit">("all");

  const [showLocationForm, setShowLocationForm] = useState(false);
  const [showGeofenceForm, setShowGeofenceForm] = useState(false);

  const [locationForm, setLocationForm] = useState({
    workerId: "", projectId: "", latitude: 0, longitude: 0,
    accuracy: 0, locationMethod: "gps" as const, notes: "",
  });

  const [geofenceForm, setGeofenceForm] = useState({
    projectId: "", name: "", description: "", centerLat: 0, centerLon: 0,
    radiusMeters: 100, entryNotification: false, exitNotification: false,
  });

  function handleRecordLocation() {
    if (!locationForm.workerId || !locationForm.latitude || !locationForm.longitude) {
      setError("Worker ID i koordynaty są wymagane");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await recordWorkerLocation(locationForm);
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      setShowLocationForm(false);
      setLocationForm({ workerId: "", projectId: "", latitude: 0, longitude: 0, accuracy: 0, locationMethod: "gps", notes: "" });
    });
  }

  function handleCreateGeofence() {
    if (!geofenceForm.name || !geofenceForm.centerLat || !geofenceForm.centerLon) {
      setError("Nazwa i koordynaty są wymagane");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createGeofence(geofenceForm);
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      setShowGeofenceForm(false);
      setGeofenceForm({ projectId: "", name: "", description: "", centerLat: 0, centerLon: 0, radiusMeters: 100, entryNotification: false, exitNotification: false });
    });
  }

  const filteredGeofences = geofences.filter((gf) => {
    const matchesSearch = !searchQuery || 
      gf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (gf.description && gf.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const filteredEvents = events.filter((evt) => {
    const matchesSearch = !searchQuery || 
      evt.event_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterEventType === "all" || evt.event_type === filterEventType;
    return matchesSearch && matchesType;
  });

  const recentEvents = filteredEvents.slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          Geolokalizacja
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Śledzenie lokalizacji pracowników i geofence
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Lokalizacje</p>
              <Navigation className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{locations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Geofence</p>
              <Layers className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{geofences.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Zdarzenia</p>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold">{events.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setShowLocationForm(true)}>
          <Navigation className="h-4 w-4 mr-2" />
          Zapisz lokalizację
        </Button>
        <Button variant="outline" onClick={() => setShowGeofenceForm(true)}>
          <Layers className="h-4 w-4 mr-2" />
          Utwórz geofence
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj geofence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterEventType}
          onChange={(e) => setFilterEventType(e.target.value as "all" | "entry" | "exit")}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Wszystkie typy zdarzeń</option>
          <option value="entry">Wejście</option>
          <option value="exit">Wyjście</option>
        </select>
      </div>

      {/* Location Form */}
      {showLocationForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Zapisz lokalizację</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowLocationForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">ID pracownika</label>
                <Input value={locationForm.workerId} onChange={(e) => setLocationForm({ ...locationForm, workerId: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">ID projektu</label>
                <Input value={locationForm.projectId} onChange={(e) => setLocationForm({ ...locationForm, projectId: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Szerokość</label>
                <Input type="number" step="0.0000001" value={locationForm.latitude} onChange={(e) => setLocationForm({ ...locationForm, latitude: Number(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Długość</label>
                <Input type="number" step="0.0000001" value={locationForm.longitude} onChange={(e) => setLocationForm({ ...locationForm, longitude: Number(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Dokładność (m)</label>
                <Input type="number" value={locationForm.accuracy} onChange={(e) => setLocationForm({ ...locationForm, accuracy: Number(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Metoda</label>
                <select
                  value={locationForm.locationMethod}
                  onChange={(e) => setLocationForm({ ...locationForm, locationMethod: e.target.value as any })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="gps">GPS</option>
                  <option value="wifi">WiFi</option>
                  <option value="ip">IP</option>
                  <option value="manual">Ręcznie</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Notatki</label>
                <Input value={locationForm.notes} onChange={(e) => setLocationForm({ ...locationForm, notes: e.target.value })} className="mt-1" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleRecordLocation} disabled={pending}>{pending ? "Zapisywanie..." : "Zapisz"}</Button>
              <Button variant="outline" onClick={() => { setShowLocationForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Geofence Form */}
      {showGeofenceForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Utwórz geofence</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowGeofenceForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Nazwa</label>
                <Input value={geofenceForm.name} onChange={(e) => setGeofenceForm({ ...geofenceForm, name: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">ID projektu</label>
                <Input value={geofenceForm.projectId} onChange={(e) => setGeofenceForm({ ...geofenceForm, projectId: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Promień (m)</label>
                <Input type="number" value={geofenceForm.radiusMeters} onChange={(e) => setGeofenceForm({ ...geofenceForm, radiusMeters: Number(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Szerokość środka</label>
                <Input type="number" step="0.0000001" value={geofenceForm.centerLat} onChange={(e) => setGeofenceForm({ ...geofenceForm, centerLat: Number(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Długość środka</label>
                <Input type="number" step="0.0000001" value={geofenceForm.centerLon} onChange={(e) => setGeofenceForm({ ...geofenceForm, centerLon: Number(e.target.value) })} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Opis</label>
                <Input value={geofenceForm.description} onChange={(e) => setGeofenceForm({ ...geofenceForm, description: e.target.value })} className="mt-1" />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="entry"
                  checked={geofenceForm.entryNotification}
                  onChange={(e) => setGeofenceForm({ ...geofenceForm, entryNotification: e.target.checked })}
                />
                <label htmlFor="entry" className="text-sm">Powiadom przy wejściu</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="exit"
                  checked={geofenceForm.exitNotification}
                  onChange={(e) => setGeofenceForm({ ...geofenceForm, exitNotification: e.target.checked })}
                />
                <label htmlFor="exit" className="text-sm">Powiadom przy wyjściu</label>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreateGeofence} disabled={pending}>{pending ? "Tworzenie..." : "Utwórz"}</Button>
              <Button variant="outline" onClick={() => { setShowGeofenceForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Geofences */}
      <Card>
        <CardHeader>
          <CardTitle>Geofence</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredGeofences.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak geofence
            </div>
          ) : (
            <div className="space-y-2">
              {filteredGeofences.map((gf) => (
                <div key={gf.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{gf.name}</p>
                      {gf.active && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Promień: {gf.radius_meters}m • {gf.entry_notification && "Wejście"} {gf.exit_notification && "Wyjście"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Ostatnie zdarzenia</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak zdarzeń
            </div>
          ) : (
            <div className="space-y-2">
              {recentEvents.map((evt) => (
                <div key={evt.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${evt.event_type === "entry" ? "bg-green-500" : "bg-red-500"}`} />
                    <div>
                      <p className="font-medium">{evt.event_type === "entry" ? "Wejście" : "Wyjście"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(evt.timestamp).toLocaleString("pl-PL")}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
