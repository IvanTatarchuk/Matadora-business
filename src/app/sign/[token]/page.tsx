"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, XCircle, FileSignature, HardHat, AlertTriangle } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPLN } from "@/lib/utils";

type Protokol = {
  id: string;
  title: string;
  work_scope: string | null;
  description: string | null;
  amount_net: number;
  amount_gross: number;
  vat_rate: number;
  status: string;
  created_at: string;
};

export default function SignPage() {
  const { token } = useParams<{ token: string }>();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [protokol, setProtokol] = useState<Protokol | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"idle" | "signing" | "signed" | "rejecting" | "rejected" | "already_done">("idle");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await (supabase as unknown as { from: (t: string) => any })
        .from("protokoly_odbioru")
        .select("id, title, work_scope, description, amount_net, amount_gross, vat_rate, status, created_at")
        .eq("signing_token", token)
        .maybeSingle();

      if (data) {
        setProtokol(data as Protokol);
        if (data.status === "signed" || data.status === "invoiced") {
          setAction("already_done");
        }
      }
      setLoading(false);
    }
    load();
  }, [token]);

  async function signProtokol() {
    if (!protokol) return;
    setAction("signing");
    await (supabase as unknown as { from: (t: string) => any })
      .from("protokoly_odbioru")
      .update({
        status: "signed",
        signed_by_client_at: new Date().toISOString(),
      })
      .eq("signing_token", token);
    setAction("signed");
  }

  async function rejectProtokol() {
    if (!protokol) return;
    setAction("rejecting");
    await (supabase as unknown as { from: (t: string) => any })
      .from("protokoly_odbioru")
      .update({
        status: "rejected",
        description: rejectReason ? `[Odrzucony przez klienta]: ${rejectReason}` : "[Odrzucony przez klienta]",
      })
      .eq("signing_token", token);
    setAction("rejected");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-muted-foreground text-sm">Ładowanie protokołu...</div>
      </div>
    );
  }

  if (!protokol) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-orange-400 mb-4" />
            <h1 className="text-xl font-bold">Link nieważny</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ten link do podpisu wygasł lub jest nieprawidłowy. Skontaktuj się z wykonawcą.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const vat = Number(protokol.amount_gross) - Number(protokol.amount_net);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-lg space-y-5">
        {/* HEADER */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <HardHat className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold">matadora.business</span>
          <span className="ml-auto text-xs text-muted-foreground">Podpis elektroniczny</span>
        </div>

        {/* PROTOCOL CARD */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileSignature className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">Protokół odbioru robót</h1>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Tytuł</p>
                <p className="font-semibold mt-0.5">{protokol.title}</p>
              </div>

              {protokol.work_scope && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Zakres robót</p>
                  <p className="text-sm mt-0.5 whitespace-pre-wrap">{protokol.work_scope}</p>
                </div>
              )}

              <div className="rounded-lg bg-slate-50 border p-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Netto</span>
                  <span>{formatPLN(Number(protokol.amount_net))}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">VAT {protokol.vat_rate}%</span>
                  <span>{formatPLN(vat)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Razem brutto</span>
                  <span className="text-primary text-lg">{formatPLN(Number(protokol.amount_gross))}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Data wystawienia: {new Date(protokol.created_at).toLocaleDateString("pl-PL")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ACTIONS */}
        {action === "idle" && protokol.status === "sent" && (
          <div className="space-y-3">
            <Card className="border-green-200">
              <CardContent className="p-4 text-sm text-muted-foreground">
                Podpisując ten protokół potwierdzasz, że roboty zostały wykonane zgodnie z umową
                i akceptujesz kwotę do zapłaty. Podpis ma skutek prawny (art. 455 KC).
              </CardContent>
            </Card>

            <Button className="w-full h-14 text-base font-bold" onClick={signProtokol}>
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Podpisuję i akceptuję protokół
            </Button>

            {!showRejectForm ? (
              <Button variant="outline" className="w-full" onClick={() => setShowRejectForm(true)}>
                <XCircle className="mr-2 h-4 w-4" />
                Mam uwagi / odrzucam
              </Button>
            ) : (
              <Card className="border-red-200">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-semibold text-red-700">Podaj powód odrzucenia</p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="np. Prace nie zostały zakończone, brak tynku w łazience..."
                    rows={3}
                    className="w-full rounded-md border px-3 py-2 text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <Button variant="destructive" className="flex-1" onClick={rejectProtokol}>
                      Odrzuć protokół
                    </Button>
                    <Button variant="outline" onClick={() => setShowRejectForm(false)}>
                      Wróć
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {action === "signing" && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Zapisywanie podpisu...
            </CardContent>
          </Card>
        )}

        {action === "signed" && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-xl font-bold text-green-900">Protokół podpisany!</h2>
              <p className="mt-2 text-sm text-green-700">
                Dziękujemy za podpis. Wykonawca zostanie powiadomiony i wystawi fakturę.
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                Data podpisu: {new Date().toLocaleString("pl-PL")}
              </p>
            </CardContent>
          </Card>
        )}

        {action === "rejecting" && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">Zapisywanie...</CardContent>
          </Card>
        )}

        {action === "rejected" && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-8 text-center">
              <XCircle className="mx-auto h-16 w-16 text-orange-500 mb-4" />
              <h2 className="text-xl font-bold text-orange-900">Protokół odrzucony</h2>
              <p className="mt-2 text-sm text-orange-700">
                Wykonawca zostanie powiadomiony o Twoich uwagach.
              </p>
            </CardContent>
          </Card>
        )}

        {action === "already_done" && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-xl font-bold text-green-900">Protokół już podpisany</h2>
              <p className="mt-2 text-sm text-green-700">
                Ten protokół został już wcześniej podpisany. Dziękujemy.
              </p>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground pb-6">
          Dokument wystawiony przez{" "}
          <a href="https://matadora.business" className="underline">matadora.business</a>
        </p>
      </div>
    </div>
  );
}
