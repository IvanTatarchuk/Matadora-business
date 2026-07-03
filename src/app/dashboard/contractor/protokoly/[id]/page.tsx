"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, FileSignature, Send, CheckCircle2, XCircle, Clock,
  Receipt, Copy, Download, AlertTriangle, Building2, User, Phone,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPLN } from "@/lib/utils";
import { generateKsefXml, generateInvoiceNumber, type KsefInvoiceData } from "@/lib/ksef/generate-xml";

type Protokol = {
  id: string;
  title: string;
  description: string | null;
  work_scope: string | null;
  status: string;
  amount_net: number;
  amount_gross: number;
  vat_rate: number;
  created_at: string;
  signed_by_client_at: string | null;
  signing_token: string;
  ksef_invoice_number: string | null;
  invoice_issued_at: string | null;
};

const STATUS_CONFIG = {
  draft:    { label: "Szkic",         icon: Clock,         color: "bg-gray-100 text-gray-700" },
  sent:     { label: "Oczekuje",      icon: Send,          color: "bg-blue-100 text-blue-700" },
  signed:   { label: "Podpisany",     icon: CheckCircle2,  color: "bg-green-100 text-green-700" },
  invoiced: { label: "Zafakturowany", icon: Receipt,        color: "bg-purple-100 text-purple-700" },
  rejected: { label: "Odrzucony",     icon: XCircle,        color: "bg-red-100 text-red-700" },
};

export default function ProtokolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [protokol, setProtokol] = useState<Protokol | null>(null);
  const [profile, setProfile] = useState<{ company_name: string; nip?: string; address?: string; city?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [ksefSending, setKsefSending] = useState(false);
  const [ksefXmlPreview, setKsefXmlPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [signingLink, setSigningLink] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [pRes, prRes] = await Promise.all([
        (supabase as unknown as { from: (t: string) => any })
          .from("protokoly_odbioru")
          .select("*")
          .eq("id", id)
          .eq("contractor_id", user.id)
          .single(),
        supabase.from("profiles").select("company_name, nip, address, city").eq("id", user.id).single(),
      ]);

      if (pRes.data) setProtokol(pRes.data as Protokol);
      if (prRes.data) setProfile(prRes.data);
      setLoading(false);
    }
    load();
  }, [id]);

  async function sendToClient() {
    if (!protokol) return;
    setSending(true);
    const link = `${window.location.origin}/sign/${protokol.signing_token}`;
    setSigningLink(link);

    await (supabase as unknown as { from: (t: string) => any })
      .from("protokoly_odbioru")
      .update({ status: "sent" })
      .eq("id", protokol.id);

    setProtokol({ ...protokol, status: "sent" });
    setSending(false);
  }

  async function generateKsef() {
    if (!protokol || !profile) return;
    setKsefSending(true);

    const invoiceNum = generateInvoiceNumber(
      "FV",
      new Date().getMonth() + 1,
      new Date().getFullYear(),
      Math.floor(Math.random() * 900) + 100
    );

    const ksefData: KsefInvoiceData = {
      seller: {
        nip: profile.nip ?? "0000000000",
        name: profile.company_name,
        address: profile.address ?? "",
        city: profile.city ?? "",
        postalCode: "",
      },
      buyer: {
        name: "Zamawiający",
        address: "",
        city: "",
        postalCode: "",
      },
      invoice: {
        number: invoiceNum,
        issueDate: new Date().toISOString().split("T")[0]!,
        saleDate: protokol.signed_by_client_at
          ? new Date(protokol.signed_by_client_at).toISOString().split("T")[0]!
          : new Date().toISOString().split("T")[0]!,
        paymentDue: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]!,
        paymentMethod: "przelew",
      },
      lines: [
        {
          ordinal: 1,
          name: protokol.title,
          unit: "usł.",
          qty: 1,
          netUnitPrice: Number(protokol.amount_net),
          vatRate: Number(protokol.vat_rate) as 8 | 23 | 0,
          netTotal: Number(protokol.amount_net),
          vatTotal: Number(protokol.amount_gross) - Number(protokol.amount_net),
          grossTotal: Number(protokol.amount_gross),
        },
      ],
      totals: {
        netTotal: Number(protokol.amount_net),
        vatTotal: Number(protokol.amount_gross) - Number(protokol.amount_net),
        grossTotal: Number(protokol.amount_gross),
      },
      protokolRef: protokol.id,
    };

    const xml = generateKsefXml(ksefData);
    setKsefXmlPreview(xml);

    await (supabase as unknown as { from: (t: string) => any })
      .from("protokoly_odbioru")
      .update({
        status: "invoiced",
        ksef_invoice_number: invoiceNum,
        invoice_issued_at: new Date().toISOString(),
      })
      .eq("id", protokol.id);

    setProtokol({ ...protokol, status: "invoiced", ksef_invoice_number: invoiceNum });
    setKsefSending(false);
  }

  function downloadXml() {
    if (!ksefXmlPreview) return;
    const blob = new Blob([ksefXmlPreview], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faktura-${protokol?.ksef_invoice_number ?? "ksef"}.xml`;
    a.click();
  }

  function copyLink() {
    if (!signingLink) return;
    navigator.clipboard.writeText(signingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="py-20 text-center text-muted-foreground">Ładowanie...</div>;
  if (!protokol) return <div className="py-20 text-center text-muted-foreground">Nie znaleziono protokołu.</div>;

  const cfg = STATUS_CONFIG[protokol.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;
  const StatusIcon = cfg.icon;
  const vat = Number(protokol.amount_gross) - Number(protokol.amount_net);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/contractor/protokoly"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{protokol.title}</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.color}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {cfg.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Utworzono {new Date(protokol.created_at).toLocaleDateString("pl-PL")}
          </p>
        </div>
      </div>

      {/* MAIN INFO */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Kwota protokołu</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold text-primary">{formatPLN(Number(protokol.amount_gross))}</p>
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>Netto</span><span>{formatPLN(Number(protokol.amount_net))}</span></div>
              <div className="flex justify-between"><span>VAT {protokol.vat_rate}%</span><span>{formatPLN(vat)}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Zakres robót</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {protokol.work_scope || protokol.description || <span className="text-muted-foreground italic">Brak opisu</span>}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TIMELINE */}
      <Card>
        <CardHeader><CardTitle className="text-base">Status przepływu</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { key: "draft", label: "Szkic" },
              { key: "sent", label: "Wysłany" },
              { key: "signed", label: "Podpisany" },
              { key: "invoiced", label: "Zafakturowany" },
            ].map((step, i, arr) => {
              const statuses = ["draft", "sent", "signed", "invoiced"];
              const currentIdx = statuses.indexOf(protokol.status);
              const stepIdx = statuses.indexOf(step.key);
              const done = stepIdx <= currentIdx;
              return (
                <div key={step.key} className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                    {stepIdx < currentIdx ? "✓" : i + 1}
                  </div>
                  <span className={`text-sm ${done ? "font-semibold" : "text-muted-foreground"}`}>{step.label}</span>
                  {i < arr.length - 1 && <div className={`h-0.5 w-6 ${done && stepIdx < currentIdx ? "bg-primary" : "bg-muted"}`} />}
                </div>
              );
            })}
          </div>
          {protokol.signed_by_client_at && (
            <p className="mt-3 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              ✓ Podpisano przez klienta: {new Date(protokol.signed_by_client_at).toLocaleString("pl-PL")}
            </p>
          )}
          {protokol.ksef_invoice_number && (
            <p className="mt-2 text-sm text-purple-700 bg-purple-50 rounded-lg px-3 py-2">
              ✓ Faktura KSeF: <strong className="font-mono">{protokol.ksef_invoice_number}</strong>
            </p>
          )}
        </CardContent>
      </Card>

      {/* ACTIONS */}
      {protokol.status === "draft" && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Send className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-blue-900">Wyślij do klienta do podpisu</p>
                <p className="mt-1 text-sm text-blue-700">
                  Klient otrzyma link SMS/email. Podpisuje na telefonie — bez instalacji aplikacji.
                </p>
                <Button className="mt-3" onClick={sendToClient} disabled={sending}>
                  {sending ? "Wysyłanie..." : "Wyślij link do podpisu"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {protokol.status === "sent" && signingLink && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-5">
            <p className="font-semibold text-orange-900 mb-2">Link do podpisu — wyślij klientowi</p>
            <div className="flex gap-2">
              <code className="flex-1 rounded bg-white border px-3 py-2 text-xs break-all">{signingLink}</code>
              <Button size="sm" variant="outline" onClick={copyLink}>
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {protokol.status === "sent" && !signingLink && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-orange-600 shrink-0" />
            <p className="text-sm text-orange-800">
              Protokół wysłany — oczekuje na podpis klienta.
            </p>
          </CardContent>
        </Card>
      )}

      {protokol.status === "signed" && !ksefXmlPreview && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Receipt className="h-5 w-5 text-green-700 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-green-900">Protokół podpisany — wystaw fakturę KSeF</p>
                <p className="mt-1 text-sm text-green-700">
                  System wygeneruje fakturę FA(2) zgodną z KSeF i pobierze do wysyłki do systemu Ministerstwa Finansów.
                </p>
                <div className="mt-3 rounded bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                  <strong>Wymagane do wysyłki KSeF:</strong> NIP firmy + token sesji KSeF (token uzyskasz w ustawieniach).
                  Na razie możesz pobrać XML i wysłać ręcznie przez ksef.podatki.gov.pl.
                </div>
                <Button className="mt-3" onClick={generateKsef} disabled={ksefSending}>
                  {ksefSending ? "Generowanie XML..." : "Generuj fakturę KSeF (FA/2)"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {ksefXmlPreview && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Faktura KSeF FA(2) — XML</CardTitle>
              <Button size="sm" onClick={downloadXml}>
                <Download className="mr-1 h-4 w-4" /> Pobierz XML
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="max-h-64 overflow-y-auto rounded-lg bg-slate-950 text-green-400 text-xs p-4 font-mono">
              {ksefXmlPreview}
            </pre>
            <p className="mt-3 text-xs text-muted-foreground">
              Prześlij pobrany plik XML do{" "}
              <a href="https://ksef.podatki.gov.pl" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                ksef.podatki.gov.pl
              </a>{" "}
              lub skonfiguruj automatyczne wysyłanie w Ustawieniach → KSeF.
            </p>
          </CardContent>
        </Card>
      )}

      {protokol.status === "rejected" && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Protokół odrzucony przez klienta</p>
              <p className="text-sm text-red-700 mt-1">Skontaktuj się z klientem i wyjaśnij uwagi.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
