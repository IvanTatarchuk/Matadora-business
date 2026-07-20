"use client";

import { useState, useTransition } from "react";
import { GitBranch, Send, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  updateTicketStatus,
  replyToTicket,
  type SupportTicket,
  type SupportTicketStatus,
} from "@/lib/actions/support";

const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: "Nowe",
  triaging: "W analizie",
  fix_drafted: "Fix gotowy do review",
  waiting_on_user: "Czeka na użytkownika",
  resolved: "Rozwiązane",
  wont_fix: "Nie będzie naprawione",
};

const STATUS_VARIANT: Record<SupportTicketStatus, "default" | "warning" | "success" | "secondary" | "destructive"> = {
  open: "destructive",
  triaging: "warning",
  fix_drafted: "warning",
  waiting_on_user: "secondary",
  resolved: "success",
  wont_fix: "secondary",
};

const STATUS_OPTIONS: SupportTicketStatus[] = [
  "open",
  "triaging",
  "fix_drafted",
  "waiting_on_user",
  "resolved",
  "wont_fix",
];

export function SupportInboxClient({ tickets }: { tickets: SupportTicket[] }) {
  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Brak zgłoszeń.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((t) => (
        <TicketRow key={t.id} ticket={t} />
      ))}
    </div>
  );
}

function TicketRow({ ticket }: { ticket: SupportTicket }) {
  const [pending, startTransition] = useTransition();
  const [reply, setReply] = useState(ticket.admin_reply ?? "");
  const [showReply, setShowReply] = useState(false);

  function changeStatus(status: SupportTicketStatus) {
    startTransition(async () => {
      await updateTicketStatus(ticket.id, status);
    });
  }

  function sendReply() {
    if (!reply.trim()) return;
    startTransition(async () => {
      const res = await replyToTicket(ticket.id, reply);
      if (res.ok) setShowReply(false);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{ticket.reporter_email ?? "nieznany"}</span>
              <Badge variant="outline" className="text-[10px] font-mono">{ticket.reporter_role ?? "?"}</Badge>
              <Badge variant={STATUS_VARIANT[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge>
            </div>
            {ticket.page_url && (
              <p className="mt-0.5 text-xs text-muted-foreground">Strona: {ticket.page_url}</p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {new Date(ticket.created_at).toLocaleString("pl-PL")}
            </p>
          </div>
          <select
            value={ticket.status}
            onChange={(e) => changeStatus(e.target.value as SupportTicketStatus)}
            disabled={pending}
            className="rounded-md border px-2 py-1 text-xs"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <p className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">{ticket.message}</p>

        {ticket.triage_notes && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
            <p className="font-semibold uppercase tracking-wide">Notatki triage</p>
            <p className="mt-1 whitespace-pre-wrap">{ticket.triage_notes}</p>
          </div>
        )}

        {ticket.fix_branch && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <GitBranch className="h-3.5 w-3.5 shrink-0" />
            <div>
              <p className="font-semibold">Gałąź z poprawką: {ticket.fix_branch}</p>
              {ticket.fix_summary && <p className="mt-0.5">{ticket.fix_summary}</p>}
            </div>
          </div>
        )}

        {ticket.admin_reply && !showReply && (
          <div className="rounded-lg border bg-white p-3 text-xs">
            <p className="font-semibold text-muted-foreground">Twoja odpowiedź</p>
            <p className="mt-1 whitespace-pre-wrap">{ticket.admin_reply}</p>
          </div>
        )}

        {showReply ? (
          <div className="space-y-2">
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} />
            <div className="flex gap-2">
              <Button size="sm" onClick={sendReply} disabled={pending}>
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Wyślij odpowiedź
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowReply(false)}>
                Anuluj
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setShowReply(true)}>
            {ticket.admin_reply ? "Edytuj odpowiedź" : "Odpowiedz"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
