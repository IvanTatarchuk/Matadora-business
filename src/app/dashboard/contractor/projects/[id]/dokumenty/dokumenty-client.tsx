"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, File, FileText, ImageIcon, Trash2, Download,
  FolderOpen, Plus, Lock, AlertTriangle, Upload, CheckCircle2,
  Clock, Shield, X,
} from "lucide-react";
import {
  createProjectDocument,
  deleteProjectDocument,
  uploadDocumentFile,
  type ProjectDocument,
  type DocCategory,
} from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const CATEGORY_CONFIG: Record<DocCategory, { label: string; color: string }> = {
  projekt:       { label: "Projekt budowlany",  color: "bg-blue-100 text-blue-700" },
  umowa:         { label: "Umowa",               color: "bg-purple-100 text-purple-700" },
  kosztorys:     { label: "Kosztorys",           color: "bg-green-100 text-green-700" },
  bhp:           { label: "BHP / BIOZ",          color: "bg-red-100 text-red-700" },
  pozwolenie:    { label: "Pozwolenie",           color: "bg-orange-100 text-orange-700" },
  protokol:      { label: "Protokół odbioru",    color: "bg-teal-100 text-teal-700" },
  faktura:       { label: "Faktura / FV",        color: "bg-yellow-100 text-yellow-700" },
  aneks:         { label: "Aneks do umowy",      color: "bg-pink-100 text-pink-700" },
  korespondencja:{ label: "Korespondencja",      color: "bg-sky-100 text-sky-700" },
  zdjecie:       { label: "Zdjęcie z budowy",    color: "bg-emerald-100 text-emerald-700" },
  inne:          { label: "Inne",                color: "bg-slate-100 text-slate-600" },
};

const REQUIRED_DOCS: { category: DocCategory; label: string; legal: string }[] = [
  { category: "projekt",    label: "Projekt budowlany",              legal: "Prawo budowlane art. 34" },
  { category: "pozwolenie", label: "Pozwolenie na budowę / zgłoszenie", legal: "Prawo budowlane art. 28" },
  { category: "bhp",        label: "Plan BIOZ / Ocena ryzyka",       legal: "Art. 21a Prawa budowlanego" },
  { category: "umowa",      label: "Umowa z inwestorem",             legal: "Art. 647 KC" },
  { category: "kosztorys",  label: "Kosztorys ofertowy",             legal: "Dokument umowny" },
  { category: "protokol",   label: "Protokół odbioru końcowego",     legal: "Art. 647¹ KC" },
];

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1024) return bytes ? `${bytes} B` : "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(ext))
    return <ImageIcon className="h-5 w-5 text-emerald-500" />;
  if (["pdf", "doc", "docx", "odt", "rtf"].includes(ext))
    return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-slate-500" />;
}

export function DokumentyClient({
  projectId,
  initialDocs,
}: {
  projectId: string;
  initialDocs: ProjectDocument[];
}) {
  const [docs, setDocs] = useState<ProjectDocument[]>(initialDocs);
  const [filter, setFilter] = useState<DocCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<{
    name: string;
    category: DocCategory;
    notes: string;
    isConfidential: boolean;
    visibleTo: "all" | "contractor_only" | "investor_only";
    expiryDate: string;
  }>({
    name: "", category: "inne", notes: "",
    isConfidential: false, visibleTo: "all", expiryDate: "",
  });

  const [uploadedFile, setUploadedFile] = useState<{
    url: string; size: number; mimeType: string;
  } | null>(null);

  const filtered = docs.filter((d) => {
    if (filter !== "all" && d.category !== filter) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts: Record<DocCategory, number> = {} as Record<DocCategory, number>;
  for (const cat of Object.keys(CATEGORY_CONFIG) as DocCategory[]) {
    counts[cat] = docs.filter((d) => d.category === cat).length;
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    if (!form.name) setForm((f) => ({ ...f, name: file.name }));

    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadDocumentFile(fd, projectId);
    setUploading(false);
    if (!res.ok) { setError(res.error ?? "Błąd wgrywania"); return; }
    setUploadedFile({ url: res.url!, size: res.size!, mimeType: res.mimeType! });
  }

  function handleAdd() {
    if (!form.name.trim()) { setError("Nazwa dokumentu jest wymagana"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createProjectDocument({
        projectId,
        name: form.name,
        fileUrl: uploadedFile?.url,
        fileSize: uploadedFile?.size,
        mimeType: uploadedFile?.mimeType,
        category: form.category,
        isConfidential: form.isConfidential,
        visibleTo: form.visibleTo,
        notes: form.notes || undefined,
        expiryDate: form.expiryDate || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd zapisu"); return; }

      // Optimistic add
      const newDoc: ProjectDocument = {
        id: res.id!,
        project_id: projectId,
        org_id: "",
        uploaded_by: null,
        name: form.name,
        file_url: uploadedFile?.url ?? null,
        file_size: uploadedFile?.size ?? 0,
        mime_type: uploadedFile?.mimeType ?? null,
        category: form.category,
        folder_path: "/",
        version: 1,
        is_latest: true,
        is_confidential: form.isConfidential,
        visible_to: form.visibleTo,
        notes: form.notes || null,
        tags: [],
        expiry_date: form.expiryDate || null,
        requires_approval: false,
        approved_by: null,
        approved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        uploader_name: "Ty",
      };
      setDocs((prev) => [newDoc, ...prev]);
      setShowForm(false);
      setForm({ name: "", category: "inne", notes: "", isConfidential: false, visibleTo: "all", expiryDate: "" });
      setUploadedFile(null);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function handleDelete(docId: string) {
    startTransition(async () => {
      const res = await deleteProjectDocument(docId, projectId);
      if (res.ok) setDocs((prev) => prev.filter((d) => d.id !== docId));
    });
  }

  // Expiry alerts
  const expiring = docs.filter((d) => {
    if (!d.expiry_date) return false;
    const days = Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / 86400000);
    return days <= 30 && days >= 0;
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Dokumenty projektu</h1>
          <p className="text-sm text-muted-foreground">
            CDE — centralne repozytorium dokumentów budowlanych
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="mr-1 h-4 w-4" /> Dodaj dokument
        </Button>
      </div>

      {/* EXPIRY ALERTS */}
      {expiring.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3">
            <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-4 w-4" /> Dokumenty wygasające w ciągu 30 dni
            </p>
            {expiring.map((d) => {
              const days = Math.ceil((new Date(d.expiry_date!).getTime() - Date.now()) / 86400000);
              return (
                <p key={d.id} className="text-xs text-red-600">
                  {d.name} — wygasa za <strong>{days} dni</strong> ({d.expiry_date})
                </p>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* REQUIRED DOCS CHECKLIST */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            Wymagane dokumenty (podstawa prawna)
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {REQUIRED_DOCS.map((req) => {
              const ok = docs.some((d) => d.category === req.category);
              return (
                <div key={req.category} className="flex items-start gap-2">
                  {ok
                    ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    : <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
                  <div>
                    <p className={`text-xs font-medium ${ok ? "text-green-700 line-through opacity-60" : "text-amber-800"}`}>
                      {req.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{req.legal}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ADD FORM */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nowy dokument</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* FILE UPLOAD */}
            <div>
              <label className="text-sm font-medium">Plik</label>
              <div className="mt-1 flex items-center gap-2">
                <label className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted ${uploading ? "opacity-50" : ""}`}>
                  <Upload className="h-4 w-4" />
                  {uploading ? "Wgrywanie..." : uploadedFile ? "Zmień plik" : "Wybierz plik"}
                  <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} disabled={uploading} />
                </label>
                {uploadedFile && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {formatBytes(uploadedFile.size)}
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Nazwa dokumentu *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="np. Umowa o roboty budowlane"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Kategoria</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as DocCategory })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                >
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Data ważności (opcjonalnie)</label>
                <Input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Widoczność</label>
                <select
                  value={form.visibleTo}
                  onChange={(e) => setForm({ ...form, visibleTo: e.target.value as "all" | "contractor_only" | "investor_only" })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="all">Wszyscy (wykonawca + inwestor)</option>
                  <option value="contractor_only">Tylko wykonawca</option>
                  <option value="investor_only">Tylko inwestor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Uwagi</label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Krótki opis dokumentu..."
                className="mt-1"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="conf"
                checked={form.isConfidential}
                onChange={(e) => setForm({ ...form, isConfidential: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor="conf" className="text-sm flex items-center gap-1">
                <Lock className="h-3 w-3" /> Poufny — widoczny tylko dla Ciebie
              </label>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={pending || uploading}>
                {pending ? "Zapisywanie..." : "Zapisz dokument"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>
                Anuluj
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FILTERS */}
      <div className="flex gap-2 flex-wrap items-center">
        <Input
          placeholder="Szukaj dokumentów..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${filter === "all" ? "bg-primary text-white border-primary" : "border-muted-foreground/30 hover:bg-muted"}`}
        >
          Wszystkie ({docs.length})
        </button>
        {(Object.keys(CATEGORY_CONFIG) as DocCategory[])
          .filter((cat) => counts[cat] > 0)
          .map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${filter === cat ? "bg-primary text-white border-primary" : "border-muted-foreground/30 hover:bg-muted"}`}
            >
              {CATEGORY_CONFIG[cat].label} ({counts[cat]})
            </button>
          ))}
      </div>

      {/* DOCUMENT LIST */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <FolderOpen className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Brak dokumentów</p>
            <p className="text-sm mt-1">Dodaj pierwszy dokument klikając &quot;Dodaj dokument&quot;</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => {
            const cfg = CATEGORY_CONFIG[doc.category];
            const daysToExpiry = doc.expiry_date
              ? Math.ceil((new Date(doc.expiry_date).getTime() - Date.now()) / 86400000)
              : null;
            return (
              <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 border">
                      <FileIcon name={doc.name} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate max-w-[300px]">{doc.name}</span>
                        {doc.is_confidential && <Lock className="h-3.5 w-3.5 text-orange-500 shrink-0" />}
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {doc.version > 1 && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">v{doc.version}</span>
                        )}
                        {daysToExpiry !== null && daysToExpiry <= 30 && daysToExpiry >= 0 && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Wygasa za {daysToExpiry}d
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        {doc.file_size > 0 && <span>{formatBytes(doc.file_size)}</span>}
                        <span>{new Date(doc.created_at).toLocaleDateString("pl-PL")}</span>
                        {doc.uploader_name && <span>{doc.uploader_name}</span>}
                        {doc.expiry_date && <span>Ważny do: {doc.expiry_date}</span>}
                        {doc.notes && <span className="italic truncate max-w-[200px]">„{doc.notes}"</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {doc.file_url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                        disabled={pending}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
