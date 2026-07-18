"use client";

import { useState, useTransition } from "react";
import { Upload, File, Trash2, Download, Search, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createFileUpload, deleteFileUpload, type FileCategory,
} from "@/lib/actions/file-uploads";

type Props = {
  orgId: string;
  initialUploads: any[];
  initialStats: {
    totalFiles: number;
    totalSize: number;
    byCategory: Record<FileCategory, number>;
  };
};

export function UploadsClient({ orgId, initialUploads, initialStats }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState(initialUploads);
  const [stats, setStats] = useState(initialStats);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    description: "",
    category: "other" as FileCategory,
    tags: "",
    isPublic: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filterCategory, setFilterCategory] = useState<FileCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }

  function handleUpload() {
    setError(null);
    if (!selectedFile) {
      setError("Wybierz plik do przesłania");
      return;
    }
    startTransition(async () => {
      // Simulate file upload - in production, this would upload to storage
      const storagePath = `uploads/${Date.now()}_${selectedFile.name}`;
      const storageUrl = `https://storage.example.com/${storagePath}`;
      
      const res = await createFileUpload({
        orgId,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        storagePath,
        storageUrl,
        category: uploadForm.category,
        description: uploadForm.description || undefined,
        tags: uploadForm.tags ? uploadForm.tags.split(",").map(t => t.trim()) : [],
        isPublic: uploadForm.isPublic,
      });
      
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      setShowUploadForm(false);
      setSelectedFile(null);
      setUploadForm({ description: "", category: "other", tags: "", isPublic: false });
      // Reload uploads
      const newUploads = await fetch(`/api/uploads`).then(r => r.json());
      setUploads(newUploads);
    });
  }

  function handleDelete(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteFileUpload(id);
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      setUploads(uploads.filter((u) => u.id !== id));
    });
  }

  function handleDownload(id: string) {
    setError(null);
    startTransition(async () => {
      // In production, this would trigger actual download
      console.log("Downloading file:", id);
    });
  }

  const categoryLabels: Record<FileCategory, string> = {
    document: "Dokument",
    image: "Zdjęcie",
    video: "Wideo",
    audio: "Audio",
    other: "Inne",
  };

  const filteredUploads = uploads.filter((upload) => {
    const matchesCategory = filterCategory === "all" || upload.category === filterCategory;
    const matchesSearch = upload.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (upload.description && upload.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Przesyłanie plików</h1>
        <p className="text-sm text-muted-foreground">
          Zarządzaj plikami swojej organizacji
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Wszystkich plików</p>
              <File className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{stats.totalFiles}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Łączny rozmiar</p>
              <Upload className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Dokumenty</p>
              <File className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{stats.byCategory.document}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Zdjęcia</p>
              <File className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold">{stats.byCategory.image}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => setShowUploadForm(!showUploadForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Prześlij plik
        </Button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Prześlij plik</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Plik</Label>
              <Input type="file" onChange={handleFileSelect} className="mt-1" />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  Wybrano: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>
            <div>
              <Label>Kategoria</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mt-1"
                value={uploadForm.category}
                onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value as FileCategory })}
              >
                <option value="document">Dokument</option>
                <option value="image">Zdjęcie</option>
                <option value="video">Wideo</option>
                <option value="audio">Audio</option>
                <option value="other">Inne</option>
              </select>
            </div>
            <div>
              <Label>Opis</Label>
              <Input
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Tagi (rozdzielone przecinkami)</Label>
              <Input
                value={uploadForm.tags}
                onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                className="mt-1"
                placeholder="tag1, tag2, tag3"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="public"
                checked={uploadForm.isPublic}
                onChange={(e) => setUploadForm({ ...uploadForm, isPublic: e.target.checked })}
              />
              <label htmlFor="public" className="text-sm">Plik publiczny</label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleUpload} disabled={pending}>
                {pending ? "Przesyłanie..." : "Prześlij"}
              </Button>
              <Button variant="outline" onClick={() => setShowUploadForm(false)}>
                Anuluj
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj plików..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as FileCategory | "all")}
        >
          <option value="all">Wszystkie kategorie</option>
          <option value="document">Dokumenty</option>
          <option value="image">Zdjęcia</option>
          <option value="video">Wideo</option>
          <option value="audio">Audio</option>
          <option value="other">Inne</option>
        </select>
      </div>

      {/* Files List */}
      <Card>
        <CardHeader>
          <CardTitle>Pliki ({filteredUploads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUploads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak plików
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUploads.map((upload) => (
                <div key={upload.id} className="flex items-center justify-between p-3 rounded bg-muted">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{upload.file_name}</p>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {categoryLabels[upload.category as FileCategory]}
                      </span>
                      {upload.is_public && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Publiczny</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(upload.file_size)} · {new Date(upload.created_at).toLocaleString("pl-PL")}
                    </p>
                    {upload.description && (
                      <p className="text-xs text-muted-foreground">{upload.description}</p>
                    )}
                    {upload.tags && upload.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {upload.tags.map((tag: string) => (
                          <span key={tag} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(upload.id)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(upload.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
