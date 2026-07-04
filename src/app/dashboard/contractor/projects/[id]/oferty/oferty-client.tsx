"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, FileText, Trash2, Send, Download, Eye,
  CheckCircle2, Clock, XCircle, Building2, User, Briefcase,
} from "lucide-react";
import {
  generateOfferFromBoq, updateOfferStatus, deleteGeneratedOffer, signOffer,
  type GeneratedOffer, type OfferTemplate,
} from "@/lib/actions/offer-generator";
import { type BoqDocument } from "@/lib/actions/boq";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const TEMPLATE_CONFIG: Record<OfferTemplate, { label: string; icon: React.ElementType; color: string }> = {
  investor: { label: "Inwestor prywatny", icon: User, color: "bg-blue-100 text-blue-700" },
  contractor: { label: "Generalny wykonawca", icon: Briefcase, color: "bg-purple-100 text-purple-700" },
  developer: { label: "Deweloper", icon: Building2, color: "bg-green-100 text-green-700" },
};

const STATUS_CONFIG: Record<GeneratedOffer["status"], { label: string; icon: React.ElementType; color: string }> = {
  draft: { label: "Szkic", icon: Clock, color: "bg-slate-100 text-slate-600" },
  sent: { label: "Wysłana", icon: Send, color: "bg-blue-100 text-blue-700" },
  accepted: { label: "Zaakceptowana", icon: CheckCircle2, color: "bg-green-100 text-green-700" },
  rejected: { label: "Odrzucona", icon: XCircle, color: "bg-red-100 text-red-700" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

type Props = {
  projectId: string;
  initialBoqDocuments: BoqDocument[];
  initialOffers: GeneratedOffer[];
};

export function OfertyClient({ projectId, initialBoqDocuments, initialOffers }: Props) {
  const [offers, setOffers] = useState<GeneratedOffer[]>(initialOffers);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    boqDocumentId: "",
    template: "investor" as OfferTemplate,
    clientName: "",
    clientEmail: "",
    clientAddress: "",
    validDays: "30",
    notes: "",
  });

  function handleCreate() {
    if (!form.boqDocumentId || !form.clientName.trim()) {
      setError("Wybierz dokument przedmiaru i podaj nazwę klienta");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await generateOfferFromBoq({
        projectId,
        boqDocumentId: form.boqDocumentId,
        template: form.template,
        clientName: form.clientName,
        clientEmail: form.clientEmail || undefined,
        clientAddress: form.clientAddress || undefined,
        validDays: Number(form.validDays),
        notes: form.notes || undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "Błąd tworzenia oferty");
        return;
      }
      // Refresh offers
      const updated = await fetch(`/api/offers?projectId=${projectId}`).then(r => r.json());
      setOffers(updated.offers ?? []);
      setShowCreateForm(false);
      setForm({ boqDocumentId: "", template: "investor", clientName: "", clientEmail: "", clientAddress: "", validDays: "30", notes: "" });
    });
  }

  function handleSend(offerId: string) {
    startTransition(async () => {
      const res = await updateOfferStatus(offerId, projectId, "sent");
      if (!res.ok) {
        setError(res.error ?? "Błąd wysyłania");
        return;
      }
      setOffers((prev) => prev.map((o) => o.id === offerId ? { ...o, status: "sent" } : o));
    });
  }

  async function handleDownloadPDF(offerId: string) {
    try {
      const res = await fetch(`/api/offers/${offerId}/pdf`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd generowania PDF");
      
      // Create a blob from the HTML and download
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `oferta-${offerId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd pobierania PDF");
    }
  }

  function handleDelete(offerId: string) {
    if (!confirm("Czy na pewno usunąć tę ofertę?")) return;
    startTransition(async () => {
      const res = await deleteGeneratedOffer(offerId, projectId);
      if (!res.ok) {
        setError(res.error ?? "Błąd usuwania");
        return;
      }
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
    });
  }

  function handleSignOffer(offerId: string) {
    setShowSignatureModal(offerId);
  }

  async function handleSignatureSubmit(offerId: string, signatureData: string) {
    startTransition(async () => {
      const res = await signOffer(offerId, projectId, signatureData);
      if (!res.ok) {
        setError(res.error ?? "Błąd podpisywania");
        return;
      }
      setOffers((prev) => prev.map((o) => o.id === offerId ? { ...o, status: "accepted" as const } : o));
      setShowSignatureModal(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/contractor/projects/${projectId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Oferty</h1>
          <p className="text-sm text-muted-foreground mt-1">Generuj profesjonalne oferty z przedmiarów</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Nowa oferta
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Utwórz ofertę z przedmiaru</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}><XCircle className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Dokument przedmiaru *</label>
              <select
                value={form.boqDocumentId}
                onChange={(e) => setForm({ ...form, boqDocumentId: e.target.value })}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">— Wybierz dokument —</option>
                {initialBoqDocuments.map((doc) => (
                  <option key={doc.id} value={doc.id}>{doc.title} (v{doc.version})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Szablon oferty</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(Object.keys(TEMPLATE_CONFIG) as OfferTemplate[]).map((t) => {
                  const config = TEMPLATE_CONFIG[t];
                  const Icon = config.icon;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, template: t })}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-center transition-colors ${
                        form.template === t ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${form.template === t ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-xs font-medium">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Nazwa klienta *</label>
              <Input
                value={form.clientName}
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                placeholder="np. Jan Kowalski"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Email klienta</label>
                <Input
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
                  placeholder="email@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Adres</label>
                <Input
                  value={form.clientAddress}
                  onChange={(e) => setForm({ ...form, clientAddress: e.target.value })}
                  placeholder="ul. Przykładowa 1, Warszawa"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Ważność oferty (dni)</label>
              <Input
                type="number"
                value={form.validDays}
                onChange={(e) => setForm({ ...form, validDays: e.target.value })}
                className="mt-1 w-24"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Uwagi (opcjonalne)</label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Dodatkowe informacje dla klienta"
                className="mt-1"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={pending}>{pending ? "Tworzenie..." : "Utwórz ofertę"}</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offers List */}
      {offers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Brak ofert</p>
            <p className="text-sm mt-1">Utwórz pierwszą ofertę z przedmiaru robót</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => {
            const StatusConfig = STATUS_CONFIG[offer.status];
            const StatusIcon = StatusConfig.icon;
            return (
              <Card key={offer.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-semibold">{(offer as any).offer_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${StatusConfig.color}`}>
                          <StatusIcon className="inline h-3 w-3 mr-1" />
                          {StatusConfig.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date((offer as any).offer_date).toLocaleDateString("pl-PL")}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{(offer as any).client_name}</p>
                      {(offer as any).client_address && <p className="text-xs text-muted-foreground">{(offer as any).client_address}</p>}
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">Netto: <span className="font-medium">{fmt((offer as any).total_net)} PLN</span></span>
                        <span className="text-muted-foreground">Brutto: <span className="font-semibold text-primary">{fmt((offer as any).total_gross)} PLN</span></span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {offer.status === "draft" && (
                        <Button size="sm" onClick={() => handleSend(offer.id)} className="gap-1">
                          <Send className="h-3.5 w-3.5" /> Wyślij
                        </Button>
                      )}
                      {offer.status === "sent" && (
                        <Button size="sm" onClick={() => handleSignOffer(offer.id)} className="gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Podpisz
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="gap-1">
                        <Eye className="h-3.5 w-3.5" /> Podgląd
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => handleDownloadPDF(offer.id)}>
                        <Download className="h-3.5 w-3.5" /> PDF
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(offer.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="text-base">Podpisz ofertę</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Wpisz swoje imię i nazwisko jako podpis elektroniczny oferty.
              </p>
              <Input
                placeholder="Imię i nazwisko"
                id="signature-input"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    handleSignatureSubmit(showSignatureModal, input.value);
                  }
                }}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowSignatureModal(null)}>
                  Anuluj
                </Button>
                <Button onClick={() => {
                  const input = document.getElementById('signature-input') as HTMLInputElement;
                  handleSignatureSubmit(showSignatureModal, input.value);
                }}>
                  Podpisz
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
