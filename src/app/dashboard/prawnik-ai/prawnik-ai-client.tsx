"use client";

import { useEffect, useRef, useState } from "react";
import {
  Scale,
  FileText,
  Upload,
  Loader2,
  Sparkles,
  Copy,
  Check,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PrintButton } from "@/components/offers/print-button";
import { cn } from "@/lib/utils";

const PRICE_PLN = 19.99;
const MAX_PDF_MB = 4;
const STORAGE_KEY = "matadora_prawnik_session";

const CONTRACT_TYPES = [
  "Umowa o roboty budowlane",
  "Umowa najmu",
  "Umowa dostawy materiałów",
  "Umowa o dzieło",
  "Umowa zlecenie",
  "Umowa o współpracy",
  "Inna umowa",
];

type ContractResult = {
  contract_title: string;
  contract_text: string;
  key_points: string[];
  legal_notes: string;
};

type AnalysisFinding = {
  clause: string;
  issue: string;
  severity: string;
  recommendation: string;
};

type AnalysisResult = {
  document_type: string;
  summary: string;
  overall_risk: string;
  findings: AnalysisFinding[];
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

type SessionState = {
  sessionId: string;
  contractUsed: boolean;
  documentUsed: boolean;
};

export function PrawnikAiClient() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [tab, setTab] = useState<"generate" | "analyze">("generate");

  // Contract generator state
  const [form, setForm] = useState({
    contractType: CONTRACT_TYPES[0],
    partyA: "",
    partyB: "",
    subject: "",
    value: "",
    dates: "",
    paymentTerms: "",
    specialTerms: "",
  });
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [contractResult, setContractResult] = useState<ContractResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Document analysis state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (sessionId) {
      const fresh: SessionState = { sessionId, contractUsed: false, documentUsed: false };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      setSession(fresh);
      window.history.replaceState(null, "", "/dashboard/prawnik-ai");
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSession(JSON.parse(stored) as SessionState);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistSession(next: SessionState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
  }

  async function payAndStart() {
    setPayError(null);
    setPaying(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: "adwokat" }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setPayError("Zaloguj się, aby skorzystać z Adwokata AI.");
        return;
      }
      if (res.status === 503 || data.error === "payments_not_configured") {
        setPayError("Płatności online są chwilowo niedostępne. Napisz do nas: vanbud.felix@gmail.com");
        return;
      }
      if (!data.url) throw new Error(data.error ?? "Nie udało się rozpocząć płatności.");
      window.location.href = data.url;
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Nie udało się rozpocząć płatności.");
    } finally {
      setPaying(false);
    }
  }

  function endSession() {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setContractResult(null);
    setAnalysisResult(null);
    setFile(null);
  }

  async function generateContract() {
    if (!session) return;
    setGenerateError(null);
    if (!form.partyA.trim() || !form.partyB.trim() || !form.subject.trim()) {
      setGenerateError("Podaj strony umowy oraz przedmiot umowy.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/prawnik/generate-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.sessionId, ...form }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Generowanie umowy nie powiodło się.");
      }
      setContractResult({
        contract_title: data.contract_title,
        contract_text: data.contract_text,
        key_points: data.key_points ?? [],
        legal_notes: data.legal_notes,
      });
      persistSession({ ...session, contractUsed: true });
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generowanie umowy nie powiodło się.");
    } finally {
      setGenerating(false);
    }
  }

  async function copyContract() {
    if (!contractResult) return;
    await navigator.clipboard.writeText(contractResult.contract_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) stageFile(f);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) stageFile(f);
  }

  function stageFile(f: File) {
    setAnalyzeError(null);
    setAnalysisResult(null);
    if (f.type !== "application/pdf") {
      setAnalyzeError("Wgraj plik w formacie PDF.");
      return;
    }
    if (f.size > MAX_PDF_MB * 1024 * 1024) {
      setAnalyzeError(`Plik jest za duży — limit to ${MAX_PDF_MB} MB.`);
      return;
    }
    setFile(f);
  }

  async function analyzeDocument() {
    if (!session || !file) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("session_id", session.sessionId);
      const res = await fetch("/api/prawnik/analyze-document", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Analiza dokumentu nie powiodła się.");
      }
      setAnalysisResult({
        document_type: data.document_type,
        summary: data.summary,
        overall_risk: data.overall_risk,
        findings: data.findings ?? [],
      });
      persistSession({ ...session, documentUsed: true });
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analiza dokumentu nie powiodła się.");
    } finally {
      setAnalyzing(false);
    }
  }

  // ── Paywall ────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            Rozpocznij sesję z Adwokatem AI
            <Badge className="bg-primary/15 text-primary hover:bg-primary/15">AI</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Jedna opłata {PRICE_PLN.toFixed(2)} zł odblokowuje sesję, w ramach której możesz:
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-primary" /> wygenerować jeden projekt umowy
              dopasowany do Twojej sytuacji,
            </li>
            <li className="flex items-center gap-2">
              <Upload className="h-4 w-4 shrink-0 text-primary" /> przesłać i przeanalizować jeden
              dokument PDF pod kątem ryzyk prawnych.
            </li>
          </ul>
          {payError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {payError}
            </div>
          )}
          <Button onClick={payAndStart} disabled={paying}>
            {paying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              `Rozpocznij sesję — ${PRICE_PLN.toFixed(2)} zł`
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Active session ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 print:hidden">
        <p className="text-xs text-muted-foreground">
          Sesja aktywna — opłacona {PRICE_PLN.toFixed(2)} zł.{" "}
          {session.contractUsed && session.documentUsed
            ? "Obie funkcje zostały już wykorzystane w tej sesji."
            : "Możesz skorzystać z generatora umów i analizy dokumentu."}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href={`/faktura/${session.sessionId}`}>Faktura VAT</a>
          </Button>
          <Button size="sm" variant="ghost" onClick={endSession}>
            Zakończ sesję
          </Button>
        </div>
      </div>

      <div className="flex gap-2 print:hidden">
        <button
          onClick={() => setTab("generate")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium",
            tab === "generate" ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
          )}
        >
          <FileText className="h-3.5 w-3.5" /> Generuj umowę
        </button>
        <button
          onClick={() => setTab("analyze")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium",
            tab === "analyze" ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
          )}
        >
          <Upload className="h-3.5 w-3.5" /> Analizuj dokument
        </button>
      </div>

      {tab === "generate" && (
        <Card className="print:border-0 print:shadow-none">
          <CardHeader className="print:hidden">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Generator umowy AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!contractResult && (
              <>
                <div className="print:hidden space-y-3">
                  <div>
                    <Label>Typ umowy</Label>
                    <select
                      value={form.contractType}
                      onChange={(e) => setForm({ ...form, contractType: e.target.value })}
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    >
                      {CONTRACT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Strona A</Label>
                      <Input
                        value={form.partyA}
                        onChange={(e) => setForm({ ...form, partyA: e.target.value })}
                        placeholder="np. Jan Kowalski, ul. Przykładowa 1, NIP ..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Strona B</Label>
                      <Input
                        value={form.partyB}
                        onChange={(e) => setForm({ ...form, partyB: e.target.value })}
                        placeholder="np. Firma XYZ Sp. z o.o., ..."
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Przedmiot umowy</Label>
                    <Textarea
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      rows={3}
                      placeholder="np. Wykonanie robót remontowych w lokalu przy ul. ..."
                      className="mt-1"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Wynagrodzenie / wartość (opcjonalnie)</Label>
                      <Input
                        value={form.value}
                        onChange={(e) => setForm({ ...form, value: e.target.value })}
                        placeholder="np. 25 000 zł netto"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Terminy realizacji (opcjonalnie)</Label>
                      <Input
                        value={form.dates}
                        onChange={(e) => setForm({ ...form, dates: e.target.value })}
                        placeholder="np. od 01.08.2026 do 30.09.2026"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Warunki płatności (opcjonalnie)</Label>
                    <Input
                      value={form.paymentTerms}
                      onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                      placeholder="np. zaliczka 30% + płatność końcowa po odbiorze"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Dodatkowe warunki / klauzule (opcjonalnie)</Label>
                    <Textarea
                      value={form.specialTerms}
                      onChange={(e) => setForm({ ...form, specialTerms: e.target.value })}
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                </div>

                {generateError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 print:hidden">
                    {generateError}
                  </div>
                )}

                <Button
                  onClick={generateContract}
                  disabled={generating || session.contractUsed}
                  className="print:hidden"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : session.contractUsed ? (
                    "Umowa została już wygenerowana w tej sesji"
                  ) : (
                    "Generuj umowę"
                  )}
                </Button>
              </>
            )}

            {contractResult && (
              <div className="space-y-3">
                <div className="flex items-center justify-between print:hidden">
                  <h2 className="text-lg font-bold">{contractResult.contract_title}</h2>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={copyContract}>
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Skopiowano" : "Kopiuj tekst"}
                    </Button>
                    <PrintButton label="Pobierz PDF" />
                  </div>
                </div>
                <h2 className="hidden text-lg font-bold print:block">{contractResult.contract_title}</h2>

                {contractResult.key_points.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm print:hidden">
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Najważniejsze ustalenia
                    </p>
                    <ul className="list-inside list-disc space-y-0.5">
                      {contractResult.key_points.map((k, i) => (
                        <li key={i}>{k}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="whitespace-pre-wrap rounded-lg border bg-white p-4 text-sm leading-relaxed print:border-0 print:p-0">
                  {contractResult.contract_text}
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 print:hidden">
                  {contractResult.legal_notes}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "analyze" && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" /> Analiza dokumentu prawnego
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileSelected}
            />

            {!analyzing && !analysisResult && (
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
                className={cn(
                  "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 text-center transition-colors",
                  dragging
                    ? "border-primary bg-primary/10"
                    : "border-primary/30 bg-white/60 hover:border-primary hover:bg-primary/5"
                )}
              >
                <Upload className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">
                  Wgraj dokument PDF — kliknij lub przeciągnij plik tutaj{" "}
                  <span className="text-muted-foreground">(max {MAX_PDF_MB} MB)</span>
                </span>
                {file && <span className="text-xs text-muted-foreground">Wybrano: {file.name}</span>}
              </div>
            )}

            {file && !analyzing && !analysisResult && (
              <div className="flex items-center gap-2">
                <Button onClick={analyzeDocument} disabled={session.documentUsed}>
                  {session.documentUsed
                    ? "Dokument został już przeanalizowany w tej sesji"
                    : "Analizuj dokument"}
                </Button>
                <Button variant="outline" onClick={() => setFile(null)}>
                  Anuluj
                </Button>
              </div>
            )}

            {analyzing && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary/30 bg-white/60 py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-sm font-medium">Analizuję dokument…</span>
                <span className="text-xs text-muted-foreground">To może potrwać do minuty</span>
              </div>
            )}

            {analyzeError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {analyzeError}
              </div>
            )}

            {analysisResult && (
              <div className="space-y-3">
                <div className="rounded-lg border border-primary/20 bg-white p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {analysisResult.document_type}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{analysisResult.summary}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Ogólny poziom ryzyka:</span>
                    <Badge variant={RISK_BADGE_VARIANT[analysisResult.overall_risk] ?? "secondary"}>
                      {RISK_LABEL[analysisResult.overall_risk] ?? analysisResult.overall_risk}
                    </Badge>
                  </div>
                </div>

                {analysisResult.findings.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Znalezione uwagi ({analysisResult.findings.length})
                    </p>
                    {analysisResult.findings.map((f, i) => (
                      <div key={i} className="rounded-lg border bg-white p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{f.issue}</p>
                          <Badge variant={RISK_BADGE_VARIANT[f.severity] ?? "secondary"} className="shrink-0">
                            {RISK_LABEL[f.severity] ?? f.severity}
                          </Badge>
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Fragment:</span> {f.clause}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Rekomendacja:</span>{" "}
                          {f.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                    Nie znaleziono istotnych zastrzeżeń w tym dokumencie.
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAnalysisResult(null);
                    setFile(null);
                  }}
                >
                  <X className="mr-1.5 h-3.5 w-3.5" /> Zamknij
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
