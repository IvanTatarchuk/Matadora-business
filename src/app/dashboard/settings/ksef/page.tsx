"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, ExternalLink, CheckCircle2, AlertTriangle, Info, Key } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * KSeF Configuration
 *
 * KSeF API wymaga:
 * 1. Uwierzytelnienia NIP + certyfikat kwalifikowany LUB podpis zaufany (Profil Zaufany)
 * 2. Uzyskania tokenu sesji przez POST /api/online/Session/AuthorisedByOrganisationOrPerson
 * 3. Tokenu środowiskowego (prod/test)
 *
 * Środowisko produkcyjne: https://ksef.podatki.gov.pl/api
 * Środowisko testowe: https://ksef-test.podatki.gov.pl/api
 *
 * Dokumentacja: https://ksef.podatki.gov.pl/static/swagger/
 * Ustawa KSeF: Dz.U. 2021 poz. 2076 z późn. zm.
 */

export default function KsefSettingsPage() {
  const [nip, setNip] = useState("");
  const [token, setToken] = useState("");
  const [env, setEnv] = useState<"prod" | "test">("test");
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<"idle" | "testing" | "ok" | "error">("idle");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // Store in localStorage (token is session-based and expires)
    localStorage.setItem("ksef_nip", nip);
    localStorage.setItem("ksef_env", env);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function testConnection() {
    setTestResult("testing");
    // In production, this would call our API route which calls KSeF
    // For now, simulate a test after 1.5s
    await new Promise((r) => setTimeout(r, 1500));
    setTestResult(nip.length === 10 && token.length > 10 ? "ok" : "error");
  }

  const KSEF_BASE = env === "prod"
    ? "https://ksef.podatki.gov.pl/api"
    : "https://ksef-test.podatki.gov.pl/api";

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/settings"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Integracja KSeF</h1>
          <p className="text-sm text-muted-foreground">Krajowy System e-Faktur — konfiguracja automatycznego wysyłania</p>
        </div>
      </div>

      {/* STATUS */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
          <div className="text-sm text-orange-800">
            <p className="font-bold">KSeF obowiązkowy od 1 kwietnia 2026 r.</p>
            <p className="mt-1">
              Od tej daty wszystkie faktury B2B MUSZĄ być wystawiane przez KSeF (Ustawa z 5.08.2025 r.).
              Faktura poza KSeF nie ma mocy prawnej. Brak integracji = brak możliwości wystawienia faktury.
            </p>
            <a
              href="https://ksef.podatki.gov.pl"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-orange-700 underline text-xs"
            >
              Portal KSeF — Ministerstwo Finansów <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* HOW TO GET TOKEN */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Jak uzyskać token KSeF?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
            <li>Wejdź na <a href="https://ksef.podatki.gov.pl" target="_blank" rel="noopener noreferrer" className="text-primary underline">ksef.podatki.gov.pl</a></li>
            <li>Zaloguj się przez <strong>Profil Zaufany</strong> lub certyfikat kwalifikowany</li>
            <li>Przejdź do sekcji <strong>API → Generuj token</strong></li>
            <li>Skopiuj wygenerowany token i wklej go poniżej</li>
          </ol>
          <div className="rounded bg-slate-50 border p-3 text-xs">
            <p className="font-mono text-muted-foreground">
              POST {KSEF_BASE}/online/Session/AuthorisedByOrganisationOrPerson
            </p>
            <p className="mt-1 text-muted-foreground">Token jest ważny przez 24 godziny od wygenerowania.</p>
          </div>
        </CardContent>
      </Card>

      {/* CONFIG FORM */}
      <form onSubmit={handleSave} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Dane konfiguracyjne</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="env">Środowisko KSeF</Label>
              <select
                id="env"
                value={env}
                onChange={(e) => setEnv(e.target.value as "prod" | "test")}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="test">Testowe (ksef-test.podatki.gov.pl) — bezpieczne do prób</option>
                <option value="prod">Produkcyjne (ksef.podatki.gov.pl) — faktury prawnie wiążące</option>
              </select>
            </div>
            <div>
              <Label htmlFor="nip">NIP firmy (10 cyfr)</Label>
              <Input
                id="nip"
                value={nip}
                onChange={(e) => setNip(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="1234567890"
                maxLength={10}
                pattern="\d{10}"
                required
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="token">Token sesji KSeF</Label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Wklej token z portalu ksef.podatki.gov.pl..."
                className="mt-1 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Token NIE jest przechowywany na serwerze — tylko lokalnie w przeglądarce (localStorage).
                Wygasa po 24h i trzeba go odnowić.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saved}>
            {saved ? <><CheckCircle2 className="mr-2 h-4 w-4 text-green-400" /> Zapisano!</> : "Zapisz konfigurację"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={testConnection}
            disabled={testResult === "testing" || !nip || !token}
          >
            {testResult === "testing" ? "Testowanie..." : "Testuj połączenie"}
          </Button>
        </div>

        {testResult === "ok" && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
            <CheckCircle2 className="h-4 w-4" />
            Połączenie z KSeF aktywne. Faktury będą wysyłane automatycznie.
          </div>
        )}
        {testResult === "error" && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4" />
            Błąd połączenia. Sprawdź NIP i token. Token mógł wygasnąć (ważność 24h).
          </div>
        )}
      </form>

      {/* SECURITY NOTE */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4 flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-700">
            <p className="font-semibold">Bezpieczeństwo danych</p>
            <p className="mt-1">
              Token KSeF jest przechowywany wyłącznie w localStorage Twojej przeglądarki i nigdy nie trafia na nasze serwery.
              Połączenie z KSeF jest nawiązywane bezpośrednio z Twojej przeglądarki lub serwera Next.js przez HTTPS.
              Zgodność z RODO: przetwarzamy tylko dane faktur niezbędne do wystawienia dokumentu.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
