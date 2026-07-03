"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Reply,
  ArrowLeft,
} from "lucide-react";

import {
  sendInvestorMessage,
  updateApprovalStatus,
  type InvestorMessage,
  type InvestorApproval,
  type ApprovalStatus,
  type ApprovalDocType,
} from "@/lib/actions/investor-portal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const DOC_TYPE_LABELS: Record<ApprovalDocType, string> = {
  drawing: "Rysunek",
  submittal: "Submittal",
  invoice: "Faktura",
  change_order: "Zmiana zakresu",
  schedule: "Harmonogram",
  contract: "Umowa",
  report: "Raport",
  other: "Inny",
};

const APPROVAL_STATUS_CONFIG: Record<
  ApprovalStatus,
  { label: string; className: string; Icon: React.ElementType }
> = {
  pending: {
    label: "Oczekuje",
    className: "bg-yellow-100 text-yellow-700",
    Icon: Clock,
  },
  approved: {
    label: "Zatwierdzone",
    className: "bg-green-100 text-green-700",
    Icon: CheckCircle2,
  },
  rejected: {
    label: "Odrzucone",
    className: "bg-red-100 text-red-700",
    Icon: XCircle,
  },
  revision_requested: {
    label: "Poprawki",
    className: "bg-orange-100 text-orange-700",
    Icon: RotateCcw,
  },
};

export function InvestorPortalClient({
  projectId,
  initialMessages,
  initialApprovals,
}: {
  projectId: string;
  initialMessages: InvestorMessage[];
  initialApprovals: InvestorApproval[];
}) {
  const [activeTab, setActiveTab] = useState<"approvals" | "messages">("approvals");
  const [messages, setMessages] = useState<InvestorMessage[]>(initialMessages);
  const [approvals, setApprovals] = useState<InvestorApproval[]>(initialApprovals);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reply form state
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | undefined>(undefined);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  function handleApprovalAction(id: string, status: ApprovalStatus) {
    startTransition(async () => {
      const res = await updateApprovalStatus(id, projectId, status, "Inwestor", undefined);
      if (res.ok) {
        setApprovals((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status,
                  reviewer_name: "Inwestor",
                  reviewed_at: new Date().toISOString(),
                }
              : a
          )
        );
        const labels: Record<ApprovalStatus, string> = {
          approved: "Zatwierdzone.",
          rejected: "Odrzucone.",
          revision_requested: "Zgłoszono prośbę o poprawki.",
          pending: "Status zmieniony.",
        };
        showToast(labels[status]);
      } else {
        showError(res.error ?? "Błąd zmiany statusu.");
      }
    });
  }

  function openReply(msg?: InvestorMessage) {
    setReplyTo(msg?.id);
    setReplySubject(msg ? `Re: ${msg.subject}` : "");
    setReplyBody("");
    setShowReplyForm(true);
  }

  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!replySubject.trim() || !replyBody.trim()) {
      showError("Wypełnij temat i treść wiadomości.");
      return;
    }
    startTransition(async () => {
      const res = await sendInvestorMessage({
        projectId,
        subject: replySubject.trim(),
        body: replyBody.trim(),
        direction: "investor_to_contractor",
        replyTo,
      });
      if (res.ok) {
        const newMsg: InvestorMessage = {
          id: res.id!,
          project_id: projectId,
          org_id: "",
          sender_id: null,
          direction: "investor_to_contractor",
          subject: replySubject.trim(),
          body: replyBody.trim(),
          is_read: false,
          read_at: null,
          reply_to: replyTo ?? null,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [newMsg, ...prev]);
        setShowReplyForm(false);
        setReplySubject("");
        setReplyBody("");
        setReplyTo(undefined);
        showToast("Wiadomość wysłana.");
      } else {
        showError(res.error ?? "Błąd wysyłania wiadomości.");
      }
    });
  }

  const pendingApprovals = approvals.filter((a) => a.status === "pending");

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/dashboard/investor/projects/${projectId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Powrót do projektu
      </Link>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Portal inwestora</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Zatwierdzenia i komunikacja z wykonawcą
        </p>
      </div>

      {/* Toast / Error */}
      {toast && (
        <div className="rounded-lg bg-green-50 border border-green-200 text-green-800 px-4 py-3 text-sm font-medium">
          {toast}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          type="button"
          onClick={() => setActiveTab("approvals")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "approvals"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Zatwierdzenia
          {pendingApprovals.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold px-1.5 py-0.5 min-w-[20px]">
              {pendingApprovals.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("messages")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "messages"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Wiadomości
          {messages.filter((m) => m.direction === "contractor_to_investor" && !m.is_read).length >
            0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold px-1.5 py-0.5 min-w-[20px]">
              {messages.filter((m) => m.direction === "contractor_to_investor" && !m.is_read).length}
            </span>
          )}
        </button>
      </div>

      {/* Approvals tab */}
      {activeTab === "approvals" && (
        <div className="space-y-4">
          {approvals.length === 0 ? (
            <Card>
              <CardContent className="pt-6 py-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Brak wniosków o zatwierdzenie</p>
                <p className="text-sm mt-1">
                  Wykonawca nie przesłał jeszcze żadnych dokumentów do akceptacji.
                </p>
              </CardContent>
            </Card>
          ) : (
            approvals.map((a) => {
              const cfg = APPROVAL_STATUS_CONFIG[a.status];
              const StatusIcon = cfg.Icon;
              return (
                <Card key={a.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold">{a.title}</h3>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.className}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {DOC_TYPE_LABELS[a.document_type]}
                          </span>
                        </div>
                        {a.description && (
                          <p className="text-sm text-muted-foreground mb-2">{a.description}</p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            Zgłoszono:{" "}
                            {new Date(a.created_at).toLocaleDateString("pl-PL")}
                          </span>
                          {a.deadline && (
                            <span>
                              Termin:{" "}
                              <strong className="text-foreground">
                                {new Date(a.deadline).toLocaleDateString("pl-PL")}
                              </strong>
                            </span>
                          )}
                          {a.reviewed_at && (
                            <span>
                              Rozpatrzono:{" "}
                              {new Date(a.reviewed_at).toLocaleDateString("pl-PL")}
                            </span>
                          )}
                          {a.reviewer_name && <span>Przez: {a.reviewer_name}</span>}
                        </div>
                        {a.review_notes && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            Uwagi: {a.review_notes}
                          </p>
                        )}
                        {a.file_url && (
                          <a
                            href={a.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                          >
                            Otwórz dokument
                          </a>
                        )}
                      </div>

                      {/* Actions — only for pending */}
                      {a.status === "pending" && (
                        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                            disabled={isPending}
                            onClick={() => handleApprovalAction(a.id, "approved")}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Zatwierdź
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                            disabled={isPending}
                            onClick={() => handleApprovalAction(a.id, "revision_requested")}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Poprawki
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-red-600 border-red-300 hover:bg-red-50"
                            disabled={isPending}
                            onClick={() => handleApprovalAction(a.id, "rejected")}
                          >
                            <XCircle className="h-3 w-3" />
                            Odrzuć
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Messages tab */}
      {activeTab === "messages" && (
        <div className="space-y-4">
          {/* Compose button */}
          <div className="flex justify-end">
            <Button
              onClick={() => openReply(undefined)}
              className="gap-2"
              disabled={isPending}
            >
              <Reply className="h-4 w-4" />
              Nowa wiadomość
            </Button>
          </div>

          {/* Reply / Compose form */}
          {showReplyForm && (
            <Card className="border-blue-200 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {replyTo ? "Odpowiedz" : "Nowa wiadomość do wykonawcy"}
                  </CardTitle>
                  <button
                    type="button"
                    onClick={() => setShowReplyForm(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <span className="text-sm">✕</span>
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendMessage} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Temat <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={replySubject}
                      onChange={(e) => setReplySubject(e.target.value)}
                      placeholder="Temat wiadomości"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Treść <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Treść wiadomości..."
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={isPending} className="gap-1">
                      <Reply className="h-3 w-3" />
                      Wyślij
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => setShowReplyForm(false)}
                    >
                      Anuluj
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Messages list */}
          {messages.length === 0 ? (
            <Card>
              <CardContent className="pt-6 py-12 text-center text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Brak wiadomości</p>
                <p className="text-sm mt-1">
                  Wyślij wiadomość do wykonawcy, aby rozpocząć komunikację.
                </p>
              </CardContent>
            </Card>
          ) : (
            messages.map((msg) => {
              const isFromContractor = msg.direction === "contractor_to_investor";
              return (
                <Card
                  key={msg.id}
                  className={isFromContractor && !msg.is_read ? "border-blue-200" : ""}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-sm">{msg.subject}</h3>
                          {isFromContractor ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                              <MessageSquare className="h-3 w-3" />
                              Od wykonawcy
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                              Wysłane
                            </span>
                          )}
                          {isFromContractor && !msg.is_read && (
                            <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                              Nowa
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-2">
                          {msg.body}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleString("pl-PL")}
                        </p>
                      </div>
                      {isFromContractor && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1"
                          disabled={isPending}
                          onClick={() => openReply(msg)}
                        >
                          <Reply className="h-3 w-3" />
                          Odpowiedz
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
