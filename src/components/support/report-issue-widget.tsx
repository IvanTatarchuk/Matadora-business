"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LifeBuoy, X, Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupportTicket } from "@/lib/actions/support";

export function ReportIssueWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function close() {
    setOpen(false);
    setError(null);
    if (sent) {
      setSent(false);
      setMessage("");
    }
  }

  async function submit() {
    setError(null);
    if (!message.trim()) {
      setError("Opisz problem przed wysłaniem.");
      return;
    }
    setSending(true);
    try {
      const res = await createSupportTicket({ message, pageUrl: pathname });
      if (!res.ok) {
        setError(res.error ?? "Nie udało się wysłać zgłoszenia.");
        return;
      }
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105"
        aria-label="Zgłoś problem"
      >
        <LifeBuoy className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Zgłoś problem</CardTitle>
              <button onClick={close} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-3">
              {sent ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  <p className="text-sm font-medium">Dziękujemy — zgłoszenie zostało wysłane.</p>
                  <p className="text-xs text-muted-foreground">
                    Odpowiemy najszybciej jak to możliwe. Odpowiedź otrzymasz e-mailem.
                  </p>
                  <Button size="sm" variant="outline" onClick={close} className="mt-2">
                    Zamknij
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Opisz, co poszło nie tak — automatycznie dołączymy informację, na jakiej jesteś
                    stronie ({pathname}).
                  </p>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    placeholder="Np. Po kliknięciu 'Zapisz' na stronie kosztorysu nic się nie dzieje…"
                    autoFocus
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button onClick={submit} disabled={sending} className="w-full">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Wyślij zgłoszenie"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
