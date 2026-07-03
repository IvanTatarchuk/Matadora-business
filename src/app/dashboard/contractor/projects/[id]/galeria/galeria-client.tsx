"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Upload, X, Image, Camera, Trash2,
  ZoomIn, Tag, MapPin, Calendar,
} from "lucide-react";
import { addPhotoRecord, deletePhoto, uploadProjectPhoto, type ProjectPhoto, type PhotoCategory } from "@/lib/actions/photos";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const CATEGORY_LABELS: Record<PhotoCategory, string> = {
  progress:   "Postęp prac",
  defect:     "Wada / Usterka",
  inspection: "Inspekcja",
  safety:     "BHP / Bezpieczeństwo",
  handover:   "Odbiór",
  before:     "Stan przed",
  after:      "Stan po",
  drone:      "Zdjęcie z drona",
  other:      "Inne",
};

const CATEGORY_COLORS: Record<PhotoCategory, string> = {
  progress:   "bg-blue-100 text-blue-700",
  defect:     "bg-red-100 text-red-700",
  inspection: "bg-purple-100 text-purple-700",
  safety:     "bg-orange-100 text-orange-700",
  handover:   "bg-green-100 text-green-700",
  before:     "bg-slate-100 text-slate-600",
  after:      "bg-teal-100 text-teal-700",
  drone:      "bg-sky-100 text-sky-700",
  other:      "bg-muted text-muted-foreground",
};

export function GaleriaClient({ projectId, initialPhotos }: { projectId: string; initialPhotos: ProjectPhoto[] }) {
  const [photos, setPhotos] = useState<ProjectPhoto[]>(initialPhotos);
  const [selectedPhoto, setSelectedPhoto] = useState<ProjectPhoto | null>(null);
  const [filterCat, setFilterCat] = useState<PhotoCategory | "all">("all");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [meta, setMeta] = useState({
    title: "", description: "", category: "progress" as PhotoCategory,
    locationNote: "", takenAt: new Date().toISOString().slice(0, 10),
  });

  const filtered = filterCat === "all" ? photos : photos.filter((p) => p.category === filterCat);
  const categoryCounts = photos.reduce((acc, p) => { acc[p.category] = (acc[p.category] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await uploadProjectPhoto(projectId, fd);
      if (!uploadRes.ok) { setError(uploadRes.error ?? "Błąd uploadu"); continue; }

      const addRes = await addPhotoRecord({
        projectId, storagePath: uploadRes.path!,
        fileName: file.name, fileSize: file.size, mimeType: file.type,
        title: meta.title || file.name.replace(/\.[^.]+$/, ""),
        description: meta.description || undefined,
        category: meta.category,
        locationNote: meta.locationNote || undefined,
        takenAt: meta.takenAt || undefined,
      });
      if (addRes.ok) {
        const newPhoto: ProjectPhoto = {
          id: addRes.id!, project_id: projectId, org_id: "", uploaded_by: null,
          storage_path: uploadRes.path!, file_name: file.name,
          file_size: file.size, mime_type: file.type,
          width: null, height: null,
          title: meta.title || file.name.replace(/\.[^.]+$/, ""),
          description: meta.description || null,
          category: meta.category,
          taken_at: meta.takenAt || null,
          location_note: meta.locationNote || null,
          tags: [], is_cover: false,
          created_at: new Date().toISOString(),
          public_url: `https://wyuxlvieoifkfiovsfux.supabase.co/storage/v1/object/public/project-photos/${uploadRes.path}`,
        };
        setPhotos((prev) => [newPhoto, ...prev]);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDelete(photo: ProjectPhoto) {
    startTransition(async () => {
      await deletePhoto(photo.id, photo.storage_path, projectId);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      if (selectedPhoto?.id === photo.id) setSelectedPhoto(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Galeria zdjęć</h1>
          <p className="text-sm text-muted-foreground">Dokumentacja fotograficzna postępu budowy — {photos.length} zdjęć</p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload className="mr-1 h-4 w-4" />{uploading ? "Wgrywanie..." : "Dodaj zdjęcia"}
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
      </div>

      {/* UPLOAD META */}
      <Card className="border-dashed border-primary/30">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3">Metadane dla nowych zdjęć</p>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <label className="text-xs text-muted-foreground">Kategoria</label>
              <select value={meta.category} onChange={(e) => setMeta({ ...meta, category: e.target.value as PhotoCategory })}
                className="mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm">
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tytuł (opcjonalny)</label>
              <Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} placeholder="np. Strop S2 etap 1" className="mt-0.5 h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Lokalizacja</label>
              <Input value={meta.locationNote} onChange={(e) => setMeta({ ...meta, locationNote: e.target.value })} placeholder="np. Kondygnacja 3" className="mt-0.5 h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Data wykonania</label>
              <Input type="date" value={meta.takenAt} onChange={(e) => setMeta({ ...meta, takenAt: e.target.value })} className="mt-0.5 h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Opis</label>
              <Input value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} placeholder="Opcjonalny opis" className="mt-0.5 h-8 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* CATEGORY FILTERS */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCat("all")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterCat === "all" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
          Wszystkie ({photos.length})
        </button>
        {Object.entries(CATEGORY_LABELS).filter(([k]) => (categoryCounts[k] ?? 0) > 0).map(([k, v]) => (
          <button key={k} onClick={() => setFilterCat(k as PhotoCategory)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterCat === k ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
            {v} ({categoryCounts[k] ?? 0})
          </button>
        ))}
      </div>

      {/* LIGHTBOX */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="absolute -top-10 right-0 text-white hover:bg-white/20"
              onClick={() => setSelectedPhoto(null)}><X className="h-5 w-5" /></Button>
            {selectedPhoto.public_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedPhoto.public_url} alt={selectedPhoto.title ?? selectedPhoto.file_name}
                className="w-full max-h-[70vh] object-contain rounded-lg" />
            )}
            <div className="mt-3 text-white">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[selectedPhoto.category]}`}>
                  {CATEGORY_LABELS[selectedPhoto.category]}
                </span>
              </div>
              <p className="font-semibold">{selectedPhoto.title ?? selectedPhoto.file_name}</p>
              <div className="flex gap-4 text-sm text-white/70 mt-1 flex-wrap">
                {selectedPhoto.location_note && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedPhoto.location_note}</span>}
                {selectedPhoto.taken_at && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(selectedPhoto.taken_at).toLocaleDateString("pl-PL")}</span>}
                {selectedPhoto.file_size && <span>{(selectedPhoto.file_size / 1024 / 1024).toFixed(1)} MB</span>}
              </div>
              {selectedPhoto.description && <p className="text-sm text-white/60 mt-1">{selectedPhoto.description}</p>}
            </div>
            <div className="absolute top-2 right-2">
              <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedPhoto)} disabled={pending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* GRID */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Camera className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Brak zdjęć</p>
            <p className="text-sm mt-1">Dokumentuj postęp budowy — dodaj pierwsze zdjęcia</p>
            <Button className="mt-4" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />Dodaj zdjęcia
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((photo) => (
            <div key={photo.id} className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}>
              {photo.public_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.public_url} alt={photo.title ?? photo.file_name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Image className="h-8 w-8 text-muted-foreground/40" /></div>
              )}
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100">
                <span className={`self-start rounded-full px-1.5 py-0.5 text-[10px] font-semibold mb-1 ${CATEGORY_COLORS[photo.category]}`}>
                  {CATEGORY_LABELS[photo.category]}
                </span>
                <p className="text-white text-xs font-medium truncate">{photo.title ?? photo.file_name}</p>
                {photo.location_note && <p className="text-white/70 text-[10px] flex items-center gap-0.5 truncate"><MapPin className="h-2.5 w-2.5" />{photo.location_note}</p>}
              </div>
              <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-1">
                  <Button variant="secondary" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); setSelectedPhoto(photo); }}>
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                  <Button variant="destructive" size="sm" className="h-6 w-6 p-0" disabled={pending}
                    onClick={(e) => { e.stopPropagation(); handleDelete(photo); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {photo.tags && photo.tags.length > 0 && (
                <div className="absolute bottom-1.5 left-1.5">
                  <span className="bg-black/50 text-white rounded px-1 text-[10px] flex items-center gap-0.5">
                    <Tag className="h-2.5 w-2.5" />{photo.tags.length}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
