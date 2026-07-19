"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Camera,
  Upload,
  Loader2,
  X,
  ShieldAlert,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PRICE_PLN = 99;
const MAX_IMAGE_MB = 4;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const STORAGE_KEY = "matadora_bhp_photo_pending";

type Finding = {
  issue: string;
  severity: string;
  legal_basis: string;
  recommendation: string;
};

type AnalysisResult = {
  summary: string;
  overall_risk: string;
  findings: Finding[];
};

const RISK_LABEL: Record<string, string> = {
  niskie: "Niskie",
  umiarkowane: "Umiarkowane",
  wysokie: "Wysokie",
  krytyczne: "Krytyczne",
};

const RISK_BADGE_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  niskie: "success",
  umiarkowane: "warning",
  wysokie: "destructive",
  krytyczne: "destructive",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function base64ToFile(base64: string, name: string, mime: string): File {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], name, { type: mime });
}

export function AnalizaZdjeciaClient({
  projects,
}: {
  projects: { id: string; title: string }[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const [paying, setPaying] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [paidSessionId, setPaidSessionId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      try {
        const { name, base64, mime, projectId: storedProjectId } = JSON.parse(stored) as {
          name: string;
          base64: string;
          mime: string;
          projectId: string;
        };
        setFileName(name);
        setPreviewUrl(`data:${mime};base64,${base64}`);
        setProjectId(storedProjectId ?? "");
        setAwaitingPayment(true);
        if (sessionId) {
          void runAnalysis(base64ToFile(base64, name, mime), sessionId, storedProjectId ?? "");
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    } else if (sessionId) {
      setError(
        "Płatność została potwierdzona, ale nie znaleziono zapisanego zdjęcia w tej przeglądarce. Napisz do nas: vanbud.felix@gmail.com"
      );
    }

    if (sessionId) window.history.replaceState(null, "", "/dashboard/contractor/bhp/analiza-zdjecia");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function stageFile(file: File) {
    setError(null);
    setResult(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Wgraj zdjęcie w formacie JPG, PNG lub WEBP.");
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Plik jest za duży — limit to ${MAX_IMAGE_MB} MB.`);
      return;
    }

    const base64 = await fileToBase64(file);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: file.name, base64, mime: file.type, projectId }));
    setFileName(file.name);
    setPreviewUrl(`data:${file.type};base64,${base64}`);
    setAwaitingPayment(true);
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void stageFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void stageFile(file);
  }

  function cancelStaged() {
    localStorage.removeItem(STORAGE_KEY);
    setAwaitingPayment(false);
    setFileName(null);
    setPreviewUrl(null);
    setError(null);
  }

  async function payAndAnalyze() {
    setError(null);
    setPaying(true);
    try {
      // Keep the staged project selection in sync before leaving for Stripe.
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, projectId }));
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: "bhp_photo" }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setError("Zaloguj się, aby skorzystać z analizy BHP.");
        return;
      }
      if (res.status === 503 || data.error === "payments_not_configured") {
        setError("Płatności online są chwilowo niedostępne. Napisz do nas: vanbud.felix@gmail.com");
        return;
      }
      if (!data.url) throw new Error(data.error ?? "Nie udało się rozpocząć płatności.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się rozpocząć płatności.");
    } finally {
      setPaying(false);
    }
  }

  async function runAnalysis(file: File, sessionId: string, projectIdForRequest: string) {
    setAnalyzing(true);
    setError(null);
    setPaidSessionId(sessionId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("session_id", sessionId);
      if (projectIdForRequest) formData.append("project_id", projectIdForRequest);

      const res = await fetch("/api/bhp/analyze-photo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Analiza nie powiodła się.");
      }

      setResult({ summary: data.summary, overall_risk: data.overall_risk, findings: data.findings ?? [] });
      localStorage.removeItem(STORAGE_KEY);
      setAwaitingPayment(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analiza nie powiodła się.");
    } finally {
      setAnalyzing(false);
    }
  }

  function startOver() {
    setResult(null);
    setFileName(null);
    setPreviewUrl(null);
    setError(null);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Analiza BHP zdjęcia (AI)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wgraj zdjęcie placu budowy — AI sprawdzi je pod kątem zgodności z polskimi przepisami BHP i
          wskaże konkretne naruszenia wraz z podstawą prawną i zaleceniami naprawczymi.
        </p>
      </div>

      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            Analiza zdjęcia budowy
            <Badge className="bg-primary/15 text-primary hover:bg-primary/15">AI</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Jednorazowa płatność {PRICE_PLN} zł za analizę. Wynik zapisujemy automatycznie w dokumentacji
            BHP tego kontraktora.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelected}
          />

          {!analyzing && !awaitingPayment && !result && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 text-center transition-colors ${
                dragging
                  ? "border-primary bg-primary/10"
                  : "border-primary/30 bg-white/60 hover:border-primary hover:bg-primary/5"
              }`}
            >
              <Camera className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">
                Wgraj zdjęcie budowy — kliknij lub przeciągnij plik tutaj{" "}
                <span className="text-muted-foreground">(max {MAX_IMAGE_MB} MB)</span>
              </span>
            </div>
          )}

          {!analyzing && awaitingPayment && (
            <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-primary/30 bg-white/60 p-4 text-center">
              {previewUrl && (
                <div className="relative h-40 w-full overflow-hidden rounded-lg border">
                  <Image src={previewUrl} alt={fileName ?? "Podgląd"} fill className="object-cover" unoptimized />
                </div>
              )}
              <span className="text-sm font-medium">{fileName}</span>

              {projects.length > 0 && (
                <div className="w-full text-left">
                  <label className="text-xs font-medium text-muted-foreground">
                    Powiąż z projektem (opcjonalnie)
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">— Bez przypisania —</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <span className="text-xs text-muted-foreground">
                Zdjęcie gotowe do analizy — zapłać {PRICE_PLN} zł, aby uruchomić AI
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={payAndAnalyze} disabled={paying}>
                  {paying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `Zapłać ${PRICE_PLN} zł i przeanalizuj`}
                </Button>
                <Button size="sm" variant="outline" onClick={cancelStaged} disabled={paying}>
                  Anuluj
                </Button>
              </div>
            </div>
          )}

          {analyzing && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary/30 bg-white/60 py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm font-medium">Analizuję zdjęcie…</span>
              <span className="text-xs text-muted-foreground">To może potrwać do minuty</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-white p-3">
                <div>
                  <p className="text-sm text-muted-foreground">{result.summary}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Ogólny poziom ryzyka:</span>
                    <Badge variant={RISK_BADGE_VARIANT[result.overall_risk] ?? "secondary"}>
                      {RISK_LABEL[result.overall_risk] ?? result.overall_risk}
                    </Badge>
                  </div>
                </div>
              </div>

              {result.findings.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Znalezione naruszenia ({result.findings.length})
                  </p>
                  {result.findings.map((f, i) => (
                    <div key={i} className="rounded-lg border bg-white p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{f.issue}</p>
                        <Badge variant={RISK_BADGE_VARIANT[f.severity] ?? "secondary"} className="shrink-0">
                          {RISK_LABEL[f.severity] ?? f.severity}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Podstawa prawna:</span> {f.legal_basis}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Zalecenie:</span> {f.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  Nie znaleziono naruszeń przepisów BHP na tym zdjęciu.
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" /> Wynik zapisano w dokumentacji BHP.
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={startOver}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Przeanalizuj kolejne zdjęcie
                </Button>
                {paidSessionId && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/faktura/${paidSessionId}`}>Pobierz fakturę VAT</a>
                  </Button>
                )}
                <Button size="sm" variant="ghost" asChild>
                  <a href="/dashboard/contractor/bhp">
                    <X className="mr-1.5 h-3.5 w-3.5" /> Zamknij
                  </a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
