"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { FileText, PenTool, Send, X, CheckCircle2, Clock, AlertCircle, Download } from "lucide-react";
import {
  createSignature, createSignatureRequest, declineSignatureRequest, cancelSignatureRequest,
  type DocumentSignature, type SignatureRequest,
} from "@/lib/actions/esignatures";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  initialSignatures: DocumentSignature[];
  initialRequests: SignatureRequest[];
};

export function EsignaturesClient({ initialSignatures, initialRequests }: Props) {
  const [signatures, setSignatures] = useState<DocumentSignature[]>(initialSignatures);
  const [requests, setRequests] = useState<SignatureRequest[]>(initialRequests);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [showSignForm, setShowSignForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  const [signForm, setSignForm] = useState<{
    documentId: string; documentType: string; signerName: string; signerRole: string;
    signatureData: string; signatureMethod: "click_to_sign" | "draw" | "type" | "upload";
  }>({
    documentId: "", documentType: "offer", signerName: "", signerRole: "contractor",
    signatureData: "", signatureMethod: "click_to_sign",
  });

  const [requestForm, setRequestForm] = useState({
    documentId: "", documentType: "offer", requestedToEmail: "", message: "",
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    const startDrawing = (e: MouseEvent) => {
      setIsDrawing(true);
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    };

    const draw = (e: MouseEvent) => {
      if (!isDrawing) return;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
    };

    const stopDrawing = () => {
      setIsDrawing(false);
      ctx.closePath();
    };

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseleave", stopDrawing);

    return () => {
      canvas.removeEventListener("mousedown", startDrawing);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDrawing);
      canvas.removeEventListener("mouseleave", stopDrawing);
    };
  }, [isDrawing]);

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function getSignatureData() {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    return canvas.toDataURL();
  }

  function handleSign() {
    if (!signForm.signerName.trim()) { setError("Imię podpisującego jest wymagane"); return; }
    const signatureData = signForm.signatureMethod === "draw" ? getSignatureData() : signForm.signatureData;
    if (!signatureData && signForm.signatureMethod === "draw") { setError("Podpis jest wymagany"); return; }
    if (!signatureData && signForm.signatureMethod === "click_to_sign") {
      signForm.signatureData = `${signForm.signerName} - ${new Date().toLocaleDateString("pl-PL")} - Podpis elektroniczny`;
    }

    setError(null);
    startTransition(async () => {
      const res = await createSignature({
        documentId: signForm.documentId,
        documentType: signForm.documentType,
        signerName: signForm.signerName,
        signerRole: signForm.signerRole,
        signatureData: signatureData || signForm.signatureData,
        signatureMethod: signForm.signatureMethod as "click_to_sign" | "draw" | "type" | "upload",
      });
      if (!res.ok) { setError(res.error ?? "Błąd podpisu"); return; }
      setShowSignForm(false);
      setSignForm({ documentId: "", documentType: "offer", signerName: "", signerRole: "contractor", signatureData: "", signatureMethod: "click_to_sign" });
      clearCanvas();
    });
  }

  function handleRequest() {
    if (!requestForm.documentId || !requestForm.requestedToEmail) {
      setError("ID dokumentu i email są wymagane");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createSignatureRequest(requestForm);
      if (!res.ok) { setError(res.error ?? "Błąd wysyłania"); return; }
      setShowRequestForm(false);
      setRequestForm({ documentId: "", documentType: "offer", requestedToEmail: "", message: "" });
    });
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const signedRequests = requests.filter((r) => r.status === "signed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PenTool className="h-6 w-6" />
          Podpisy elektroniczne
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Zarządzanie podpisami dokumentów i żądania podpisów
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Oczekujące podpisy</p>
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold">{pendingRequests.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Podpisane dokumenty</p>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{signedRequests.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Wszystkie podpisy</p>
              <FileText className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{signatures.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => setShowSignForm(true)}>
          <PenTool className="h-4 w-4 mr-2" />
          Podpisz dokument
        </Button>
        <Button variant="outline" onClick={() => setShowRequestForm(true)}>
          <Send className="h-4 w-4 mr-2" />
          Zażądaj podpisu
        </Button>
      </div>

      {/* Sign Form */}
      {showSignForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Podpisz dokument</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowSignForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">ID dokumentu</label>
                <Input value={signForm.documentId} onChange={(e) => setSignForm({ ...signForm, documentId: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Typ dokumentu</label>
                <select
                  value={signForm.documentType}
                  onChange={(e) => setSignForm({ ...signForm, documentType: e.target.value })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="offer">Oferta</option>
                  <option value="contract">Umowa</option>
                  <option value="change_order">Aneks</option>
                  <option value="invoice">Faktura</option>
                  <option value="other">Inne</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Rola</label>
                <select
                  value={signForm.signerRole}
                  onChange={(e) => setSignForm({ ...signForm, signerRole: e.target.value })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="contractor">Wykonawca</option>
                  <option value="investor">Inwestor</option>
                  <option value="witness">Świadek</option>
                  <option value="other">Inne</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Imię i nazwisko *</label>
                <Input value={signForm.signerName} onChange={(e) => setSignForm({ ...signForm, signerName: e.target.value })} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Metoda podpisu</label>
                <select
                  value={signForm.signatureMethod}
                  onChange={(e) => setSignForm({ ...signForm, signatureMethod: e.target.value as any })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="click_to_sign">Kliknij, aby podpisać</option>
                  <option value="draw">Rysuj podpis</option>
                  <option value="type">Wpisz podpis</option>
                </select>
              </div>
              {signForm.signatureMethod === "draw" && (
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Podpis</label>
                  <div className="mt-1 border rounded-lg overflow-hidden">
                    <canvas ref={canvasRef} width={400} height={100} className="bg-white cursor-crosshair" />
                  </div>
                  <Button variant="outline" size="sm" onClick={clearCanvas} className="mt-2">
                        Wyczyść
                  </Button>
                </div>
              )}
              {signForm.signatureMethod === "type" && (
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Podpis</label>
                  <Input value={signForm.signatureData} onChange={(e) => setSignForm({ ...signForm, signatureData: e.target.value })} className="mt-1" />
                </div>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleSign} disabled={pending}>{pending ? "Podpisywanie..." : "Podpisz"}</Button>
              <Button variant="outline" onClick={() => { setShowSignForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Form */}
      {showRequestForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Zażądaj podpisu</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowRequestForm(false); setError(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">ID dokumentu</label>
                <Input value={requestForm.documentId} onChange={(e) => setRequestForm({ ...requestForm, documentId: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Typ dokumentu</label>
                <select
                  value={requestForm.documentType}
                  onChange={(e) => setRequestForm({ ...requestForm, documentType: e.target.value })}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="offer">Oferta</option>
                  <option value="contract">Umowa</option>
                  <option value="change_order">Aneks</option>
                  <option value="invoice">Faktura</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Email odbiorcy *</label>
                <Input type="email" value={requestForm.requestedToEmail} onChange={(e) => setRequestForm({ ...requestForm, requestedToEmail: e.target.value })} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Wiadomość</label>
                <Input value={requestForm.message} onChange={(e) => setRequestForm({ ...requestForm, message: e.target.value })} className="mt-1" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleRequest} disabled={pending}>{pending ? "Wysyłanie..." : "Wyślij żądanie"}</Button>
              <Button variant="outline" onClick={() => { setShowRequestForm(false); setError(null); }}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signature Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Żądania podpisów</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak żądań podpisów
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{req.document_type}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        req.status === "pending" ? "bg-orange-100 text-orange-700" :
                        req.status === "signed" ? "bg-green-100 text-green-700" :
                        req.status === "declined" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{req.requested_to_email}</p>
                    {req.message && <p className="text-xs text-muted-foreground mt-1">{req.message}</p>}
                  </div>
                  <div className="flex gap-2">
                    {req.status === "pending" && (
                      <Button variant="outline" size="sm" onClick={() => cancelSignatureRequest(req.id)}>
                        Anuluj
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signatures */}
      <Card>
        <CardHeader>
          <CardTitle>Podpisy dokumentów</CardTitle>
        </CardHeader>
        <CardContent>
          {signatures.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak podpisanych dokumentów
            </div>
          ) : (
            <div className="space-y-2">
              {signatures.map((sig) => (
                <div key={sig.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{sig.signer_name}</p>
                      <span className="text-xs text-muted-foreground">{sig.signer_role}</span>
                      {sig.is_valid && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{sig.document_type} • {new Date(sig.signed_at).toLocaleDateString("pl-PL")}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
