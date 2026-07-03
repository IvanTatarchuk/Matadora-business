"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, X, MessageSquare, CheckCircle2, XCircle,
  Clock, FileText, ArrowUpRight, RotateCcw,
} from "lucide-react";
import {
  sendInvestorMessage, createApprovalRequest, updateApprovalStatus,
  type InvestorMessage, type InvestorApproval, type ApprovalStatus,
  type ApprovalDocType,
} from "@/lib/actions/investor-portal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import React from "react";

const APPROVAL_STATUS_CONFIG: Record<ApprovalStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending:            { label: "Oczekuje",        color: "bg-yellow-100 text-yellow-700", icon: Clock },
  approved:           { label: "Zatwierdzone",    color: "bg-green-100 text-green-700",   icon: CheckCircle2 },
  rejected:           { label: "Odrzucone",       color: "bg-red-100 text-red-700",       icon: XCircle },
  revision_requested: { label: "Wymaga poprawek", color: "bg-orange-100 text-orange-700", icon: RotateCcw },
};

const DOC_TYPE_LABELS: Record<ApprovalDocType, string> = {
  drawing:      "Rysunek / Plan",
  submittal:    "Zatw. materiałów",
  invoice:      "Faktura",
  change_order: "Zmiana zakresu",
  schedule:     "Harmonogram",
  contract:     "Umowa",
  report:       "Raport",
  other:        "Inne",
};

export function PortalInwestoraClient({
  projectId, initialMessages, initialApprovals,
}: { projectId: string; initialMessages: InvestorMessage[]; initialApprovals: InvestorApproval[] }) {
  const [messages, setMessages] = useState<InvestorMessage[]>(initialMessages);
  const [approvals, setApprovals] = useState<InvestorApproval[]>(initialApprovals);
  const [tab, setTab] = useState<"messages" | "approvals">("approvals");
  const [showMsgForm, setShowMsgForm] = useState(false);
  const [showApprForm, setShowApprForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [msgForm, setMsgForm] = useState({ subject: "", body: "" });
  const [apprForm, setApprForm] = useState({
    title: "", description: "", documentType: "other" as ApprovalDocType,
    fileUrl: "", deadline: "",
  });

  const pendingApprovals = approvals.filter((a) => a.status === "pending").length;
  const unreadMessages = messages.filter((m) => !m.is_read && m.direction === "investor_to_contractor").length;

  function handleSendMessage() {
    if (!msgForm.subject.trim() || !msgForm.body.trim()) { setError("Temat i treść są wymagane"); return; }
    setError(null);
    startTransition(async () => {
      const res = await sendInvestorMessage({ projectId, subject: msgForm.subject, body: msgForm.body });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newMsg: InvestorMessage = {
        id: res.id!, project_id: projectId, org_id: "", sender_id: null,
        direction: "contractor_to_investor",
        subject: msgForm.subject, body: msgForm.body,
        is_read: false, read_at: null, reply_to: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [newMsg, ...prev]);
      setShowMsgForm(false);
      setMsgForm({ subject: "", body: "" });
    });
  }

  function handleCreateApproval() {
    if (!apprForm.title.trim()) { setError("Tytuł jest wymagany"); return; }
    setError(null);
    startTransition(async () => {
      const res = await createApprovalRequest({
        projectId, title: apprForm.title, description: apprForm.description || undefined,
        documentType: apprForm.documentType,
        fileUrl: apprForm.fileUrl || undefined, deadline: apprForm.deadline || undefined,
      });
      if (!res.ok) { setError(res.error ?? "Błąd"); return; }
      const newAppr: InvestorApproval = {
        id: res.id!, project_id: projectId, org_id: "", requested_by: null,
        title: apprForm.title, description: apprForm.description || null,
        document_type: apprForm.documentType,
        file_url: apprForm.fileUrl || null, deadline: apprForm.deadline || null,
        status: "pending", reviewer_name: null, review_notes: null, reviewed_at: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setApprovals((prev) => [newAppr, ...prev]);
      setShowApprForm(false);
      setApprForm({ title: "", description: "", documentType: "other", fileUrl: "", deadline: "" });
    });
  }

  function handleApprovalDecision(id: string, status: ApprovalStatus) {
    startTransition(async () => {
      await updateApprovalStatus(id, projectId, status);
      setApprovals((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/contractor/projects/${projectId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Portal Inwestora</h1>
          <p className="text-sm text-muted-foreground">Komunikacja, zatwierdzenia dokumentów i aktualizacje dla inwestora</p>
        </div>
      </div>

      {/* STATS */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className={pendingApprovals > 0 ? "border-yellow-200" : ""}>
          <CardContent className="p-4"><p className="text-xs text-muted-foreground">Oczekujące zatwierdzenia</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingApprovals}</p></CardContent></Card>
        <Card className={unreadMessages > 0 ? "border-blue-200" : ""}>
          <CardContent className="p-4"><p className="text-xs text-muted-foreground">Nieprzeczytane wiadomości</p>
            <p className="text-2xl font-bold text-blue-600">{unreadMessages}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Zatwierdzone</p>
          <p className="text-2xl font-bold text-green-600">{approvals.filter((a) => a.status === "approved").length}</p></CardContent></Card>
      </div>

      {/* TABS */}
      <div className="flex gap-1 border-b">
        <button onClick={() => setTab("approvals")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "approvals" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          Zatwierdzenia {pendingApprovals > 0 && <span className="ml-1 bg-yellow-100 text-yellow-700 text-xs rounded-full px-1.5">{pendingApprovals}</span>}
        </button>
        <button onClick={() => setTab("messages")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "messages" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          Wiadomości {unreadMessages > 0 && <span className="ml-1 bg-blue-100 text-blue-700 text-xs rounded-full px-1.5">{unreadMessages}</span>}
        </button>
      </div>

      {/* APPROVALS TAB */}
      {tab === "approvals" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowApprForm(true)}><Plus className="mr-1 h-4 w-4" />Wyślij do zatwierdzenia</Button>
          </div>

          {showApprForm && (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Nowy wniosek o zatwierdzenie</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => { setShowApprForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2"><label className="text-sm font-medium">Tytuł *</label>
                    <Input value={apprForm.title} onChange={(e) => setApprForm({ ...apprForm, title: e.target.value })} placeholder="np. Zatwierdzenie materiałów izolacji dachu" className="mt-1" /></div>
                  <div><label className="text-sm font-medium">Typ dokumentu</label>
                    <select value={apprForm.documentType} onChange={(e) => setApprForm({ ...apprForm, documentType: e.target.value as ApprovalDocType })}
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                      {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select></div>
                  <div><label className="text-sm font-medium">Termin odpowiedzi</label>
                    <Input type="date" value={apprForm.deadline} onChange={(e) => setApprForm({ ...apprForm, deadline: e.target.value })} className="mt-1" /></div>
                  <div className="sm:col-span-2"><label className="text-sm font-medium">Link do dokumentu</label>
                    <Input value={apprForm.fileUrl} onChange={(e) => setApprForm({ ...apprForm, fileUrl: e.target.value })} placeholder="https://..." className="mt-1" /></div>
                  <div className="sm:col-span-2"><label className="text-sm font-medium">Opis</label>
                    <textarea value={apprForm.description} onChange={(e) => setApprForm({ ...apprForm, description: e.target.value })} rows={2}
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" /></div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button onClick={handleCreateApproval} disabled={pending}>{pending ? "Wysyłanie..." : "Wyślij wniosek"}</Button>
                  <Button variant="outline" onClick={() => { setShowApprForm(false); setError(null); }}>Anuluj</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {approvals.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 opacity-20 mb-3" />
              <p className="font-medium">Brak wniosków o zatwierdzenie</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {approvals.map((apr) => {
                const cfg = APPROVAL_STATUS_CONFIG[apr.status];
                const Icn = cfg.icon;
                const isOverdue = apr.deadline && new Date(apr.deadline) < new Date() && apr.status === "pending";
                return (
                  <Card key={apr.id} className={isOverdue ? "border-red-200" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
                              <Icn className="h-3 w-3" />{cfg.label}
                            </span>
                            <span className="text-xs bg-muted rounded px-1.5 py-0.5">{DOC_TYPE_LABELS[apr.document_type]}</span>
                            {isOverdue && <span className="text-xs text-red-600 font-medium">⚠ Termin minął</span>}
                          </div>
                          <p className="font-semibold">{apr.title}</p>
                          {apr.description && <p className="text-xs text-muted-foreground mt-0.5">{apr.description}</p>}
                          <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            <span>{new Date(apr.created_at).toLocaleDateString("pl-PL")}</span>
                            {apr.deadline && <span>Termin: {new Date(apr.deadline).toLocaleDateString("pl-PL")}</span>}
                            {apr.file_url && (
                              <a href={apr.file_url} target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-0.5">
                                <ArrowUpRight className="h-3 w-3" />Dokument
                              </a>
                            )}
                          </div>
                          {apr.review_notes && <p className="text-xs bg-muted rounded p-2 mt-1">{apr.review_notes}</p>}
                        </div>
                        {apr.status === "pending" && (
                          <div className="flex gap-1.5 shrink-0">
                            <Button size="sm" onClick={() => handleApprovalDecision(apr.id, "approved")} disabled={pending} className="bg-green-600 hover:bg-green-700">
                              <CheckCircle2 className="mr-1 h-3 w-3" />Zatwierdź
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleApprovalDecision(apr.id, "revision_requested")} disabled={pending}>
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleApprovalDecision(apr.id, "rejected")} disabled={pending} className="text-red-600 hover:text-red-700">
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MESSAGES TAB */}
      {tab === "messages" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowMsgForm(true)}><Plus className="mr-1 h-4 w-4" />Wyślij wiadomość</Button>
          </div>

          {showMsgForm && (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Wiadomość do inwestora</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => { setShowMsgForm(false); setError(null); }}><X className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><label className="text-sm font-medium">Temat *</label>
                  <Input value={msgForm.subject} onChange={(e) => setMsgForm({ ...msgForm, subject: e.target.value })} className="mt-1" /></div>
                <div><label className="text-sm font-medium">Treść *</label>
                  <textarea value={msgForm.body} onChange={(e) => setMsgForm({ ...msgForm, body: e.target.value })} rows={4}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" /></div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button onClick={handleSendMessage} disabled={pending}>{pending ? "Wysyłanie..." : "Wyślij"}</Button>
                  <Button variant="outline" onClick={() => { setShowMsgForm(false); setError(null); }}>Anuluj</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {messages.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
              <MessageSquare className="mx-auto h-12 w-12 opacity-20 mb-3" />
              <p className="font-medium">Brak wiadomości</p>
              <p className="text-sm mt-1">Wysyłaj aktualizacje i komunikaty bezpośrednio do inwestora</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => {
                const isFromInvestor = msg.direction === "investor_to_contractor";
                return (
                  <Card key={msg.id} className={`${!msg.is_read && isFromInvestor ? "border-blue-200 bg-blue-50/20" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs rounded-full px-2 py-0.5 font-semibold ${isFromInvestor ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                              {isFromInvestor ? "Od inwestora" : "Do inwestora"}
                            </span>
                            {!msg.is_read && isFromInvestor && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                          </div>
                          <p className="font-semibold text-sm">{msg.subject}</p>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{msg.body}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(msg.created_at).toLocaleDateString("pl-PL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
