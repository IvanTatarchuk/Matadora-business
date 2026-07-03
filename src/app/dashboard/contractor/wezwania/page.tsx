"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Download, AlertCircle, Copy, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPLN } from "@/lib/utils";

/**
 * Wezwanie do zapłaty — generator zgodny z:
 * - Art. 455 Kodeks cywilny (wymagalność roszczenia)
 * - Art. 481 KC (odsetki za opóźnienie)
 * - Ustawa z dnia 8 marca 2013 r. o terminach zapłaty
 *   w transakcjach handlowych (Dz.U. 2013 poz. 403)
 * - Art. 10 ustawy: ryczałt za koszty odzyskiwania należności
 *   (40 EUR, 70 EUR lub 100 EUR zależnie od wartości)
 */

const TODAY = new Date().toISOString().split("T")[0]!;

function getDueDateWarning(dueDate: string): string {
  const due = new Date(dueDate);
  const now = new Date();
  const days = Math.floor((now.getTime() - due.getTime()) / 86400000);
  if (days < 0) return `Termin jeszcze nie upłynął (za ${Math.abs(days)} dni)`;
  if (days === 0) return "Termin mija dzisiaj";
  return `Termin upłynął ${days} dni temu`;
}

function getRyczalt(amount: number): number {
  const EUR_PLN = 4.28; // Kurs NBP orientacyjny
  if (amount <= 5000 * EUR_PLN) return 40 * EUR_PLN;
  if (amount <= 50000 * EUR_PLN) return 70 * EUR_PLN;
  return 100 * EUR_PLN;
}

function getOdsetkiUstawowe(amount: number, dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  const days = Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000));
  const RATE = 0.1025; // Odsetki ustawowe za opóźnienie w transakcjach handlowych 2026
  return Math.round(amount * RATE * (days / 365) * 100) / 100;
}

export default function WezwaniaPage() {
  const [form, setForm] = useState({
    creditorName: "",
    creditorAddress: "",
    creditorNip: "",
    debtorName: "",
    debtorAddress: "",
    invoiceNumber: "",
    invoiceDate: TODAY,
    dueDate: TODAY,
    amount: "",
    description: "",
    finalDeadline: "",
  });

  const [generated, setGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const amount = parseFloat(form.amount) || 0;
  const odsetki = getOdsetkiUstawowe(amount, form.dueDate);
  const ryczalt = getRyczalt(amount);
  const totalDemand = amount + odsetki + ryczalt;

  function generateLetter() {
    const today = new Date().toLocaleDateString("pl-PL");
    const deadlineDate = form.finalDeadline
      ? new Date(form.finalDeadline).toLocaleDateString("pl-PL")
      : new Date(Date.now() + 7 * 86400000).toLocaleDateString("pl-PL");

    const text = `${form.creditorName}
${form.creditorAddress}
NIP: ${form.creditorNip}

${form.debtorName}
${form.debtorAddress}

                                    ${today}


                    WEZWANIE DO ZAPŁATY

Działając na podstawie art. 455 i art. 481 Kodeksu cywilnego (Dz.U. 1964 nr 16 poz. 93 ze zm.) oraz art. 10 ustawy z dnia 8 marca 2013 r. o terminach zapłaty w transakcjach handlowych (Dz.U. 2013 poz. 403 ze zm.), wzywamy ${form.debtorName} do zapłaty:

1. TYTUŁ DŁUGU:
   Faktura/Rachunek nr ${form.invoiceNumber} z dnia ${new Date(form.invoiceDate).toLocaleDateString("pl-PL")}
   Tytuł: ${form.description || "Wykonanie robót budowlanych zgodnie z umową"}
   Termin płatności: ${new Date(form.dueDate).toLocaleDateString("pl-PL")}

2. ZESTAWIENIE NALEŻNOŚCI:

   Należność główna:                    ${formatPLN(amount)}
   Odsetki ustawowe za opóźnienie       ${formatPLN(odsetki)}
   (art. 481 §2¹ KC; stopa 10,25% p.a.)
   Ryczałt za koszty odzysk. należności ${formatPLN(ryczalt)}
   (art. 10 ustawy o terminach zapłaty)
   ─────────────────────────────────────
   RAZEM DO ZAPŁATY:                    ${formatPLN(totalDemand)}

3. TERMIN ZAPŁATY:
   Wymagamy uregulowania powyższej kwoty w terminie do dnia ${deadlineDate}
   na rachunek bankowy wierzyciela.

W przypadku nieuregulowania należności w wyznaczonym terminie, skierujemy sprawę do sądu i będziemy dochodzić zwrotu kosztów procesu, w tym kosztów zastępstwa procesowego.

Mamy nadzieję, że powyższe wezwanie okaże się zbędne i kwestia zostanie rozwiązana polubownie.

Z poważaniem,
${form.creditorName}


─────────────────────────────────────
Podstawa prawna:
• Art. 455 KC — wymagalność roszczenia przy braku terminu zapłaty
• Art. 481 § 2¹ KC — odsetki za opóźnienie w transakcjach handlowych
• Art. 10 ustawy o terminach zapłaty — ryczałt 40/70/100 EUR
• Wyrok SN z dnia 9 maja 2019 r. (V CSK 153/18) — możliwość dochodzenia
  odsetek bez wezwania po upływie terminu z faktury
`;
    setGenerated(text);
  }

  function copyText() {
    if (!generated) return;
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadTxt() {
    if (!generated) return;
    const blob = new Blob([generated], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wezwanie-${form.invoiceNumber || "zapłaty"}.txt`;
    a.click();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/contractor">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Wezwanie do zapłaty</h1>
          <p className="text-sm text-muted-foreground">
            Generator zgodny z Kodeksem cywilnym i ustawą o terminach zapłaty
          </p>
        </div>
      </div>

      {/* LEGAL INFO */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-700">
            <p className="font-semibold">Podstawa prawna wezwania</p>
            <p className="mt-1">
              Art. 481 KC: odsetki za opóźnienie w transakcjach handlowych wynoszą <strong>10,25% rocznie</strong> (obowiązuje od 1 lipca 2025 r.).
              Art. 10 ustawy: ryczałt za koszty odzyskiwania: <strong>40 EUR</strong> (do 5 000 PLN),
              <strong> 70 EUR</strong> (do 50 000 PLN), <strong>100 EUR</strong> (powyżej 50 000 PLN).
              Kurs EUR/PLN: 4,28 PLN (orientacyjny — sprawdź aktualny kurs NBP).
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* FORM */}
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-base">Wierzyciel (Twoja firma)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Nazwa firmy</Label>
                <Input value={form.creditorName} onChange={(e) => setForm({ ...form, creditorName: e.target.value })} placeholder="Wykonawstwo Budowlane Jan Kowalski" className="mt-1" />
              </div>
              <div>
                <Label>Adres</Label>
                <Input value={form.creditorAddress} onChange={(e) => setForm({ ...form, creditorAddress: e.target.value })} placeholder="ul. Budowlana 1, 00-001 Warszawa" className="mt-1" />
              </div>
              <div>
                <Label>NIP</Label>
                <Input value={form.creditorNip} onChange={(e) => setForm({ ...form, creditorNip: e.target.value })} placeholder="0000000000" className="mt-1" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Dłużnik (zamawiający)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Nazwa firmy / Imię i nazwisko</Label>
                <Input value={form.debtorName} onChange={(e) => setForm({ ...form, debtorName: e.target.value })} placeholder="Inwestor Sp. z o.o." className="mt-1" />
              </div>
              <div>
                <Label>Adres</Label>
                <Input value={form.debtorAddress} onChange={(e) => setForm({ ...form, debtorAddress: e.target.value })} placeholder="ul. Przykładowa 2, 00-001 Warszawa" className="mt-1" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Dane faktury</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Numer faktury</Label>
                <Input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="FV/06/2026/001" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data wystawienia</Label>
                  <Input type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Termin płatności</Label>
                  <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-1" />
                </div>
              </div>
              {form.dueDate && (
                <p className={`text-xs font-medium ${new Date(form.dueDate) < new Date() ? "text-red-600" : "text-green-600"}`}>
                  {getDueDateWarning(form.dueDate)}
                </p>
              )}
              <div>
                <Label>Kwota należności (PLN brutto)</Label>
                <Input type="number" min={0} step={0.01} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="mt-1" />
              </div>
              <div>
                <Label>Opis usługi</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Wykonanie robót tynkarskich — etap II" className="mt-1" />
              </div>
              <div>
                <Label>Ostateczny termin zapłaty w wezwaniu</Label>
                <Input type="date" value={form.finalDeadline} onChange={(e) => setForm({ ...form, finalDeadline: e.target.value })} className="mt-1" min={TODAY} />
              </div>
            </CardContent>
          </Card>

          {/* SUMMARY */}
          {amount > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4 space-y-1.5 text-sm">
                <p className="font-semibold text-orange-900 mb-2">Podsumowanie roszczenia</p>
                <div className="flex justify-between"><span>Należność główna</span><span className="font-medium">{formatPLN(amount)}</span></div>
                <div className="flex justify-between"><span>Odsetki (10,25%/rok)</span><span>{formatPLN(odsetki)}</span></div>
                <div className="flex justify-between"><span>Ryczałt Art. 10</span><span>{formatPLN(ryczalt)}</span></div>
                <div className="flex justify-between border-t pt-1.5 font-bold text-orange-900">
                  <span>RAZEM</span><span>{formatPLN(totalDemand)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Button className="w-full" size="lg" onClick={generateLetter}>
            <FileText className="mr-2 h-4 w-4" /> Generuj wezwanie do zapłaty
          </Button>
        </div>

        {/* PREVIEW */}
        <div>
          {generated ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Wezwanie — podgląd</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={copyText}>
                      {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" onClick={downloadTxt}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-xs font-mono bg-slate-50 rounded-lg p-4 max-h-[600px] overflow-y-auto border">
                  {generated}
                </pre>
                <p className="mt-3 text-xs text-muted-foreground">
                  ⚠️ Szablon poglądowy. Przed wysyłką skonsultuj treść z radcą prawnym.
                  Stawka odsetek 10,25% — sprawdź aktualną stopę NBP.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center border-dashed">
              <CardContent className="text-center text-muted-foreground p-10">
                <FileText className="mx-auto h-12 w-12 opacity-20 mb-3" />
                <p className="text-sm">Wypełnij formularz i kliknij „Generuj"</p>
                <p className="text-xs mt-1">Wezwanie pojawi się tutaj</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
