"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2, Copy, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  generateMarketingDraft,
  updateDraftContent,
  setDraftStatus,
  type MarketingDraft,
  type MarketingDraftType,
  type MarketingDraftStatus,
} from "@/lib/actions/marketing";

const TYPE_LABEL: Record<MarketingDraftType, string> = {
  social_post: "Post w social media",
  blog_article: "Artykuł blogowy",
  ad_campaign: "Brief kampanii reklamowej",
};

const STATUS_LABEL: Record<MarketingDraftStatus, string> = {
  draft: "Szkic",
  approved: "Zaakceptowane",
  rejected: "Odrzucone",
  published: "Opublikowane",
};

const STATUS_VARIANT: Record<MarketingDraftStatus, "warning" | "success" | "destructive" | "secondary"> = {
  draft: "warning",
  approved: "success",
  rejected: "destructive",
  published: "secondary",
};

const PLATFORM_PLACEHOLDER: Record<MarketingDraftType, string> = {
  social_post: "np. Facebook, LinkedIn, Instagram",
  blog_article: "np. blog matadora.business",
  ad_campaign: "np. Google Ads, Meta Ads",
};

export function MarketingClient({ drafts }: { drafts: MarketingDraft[] }) {
  const [type, setType] = useState<MarketingDraftType>("social_post");
  const [platform, setPlatform] = useState("");
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    if (!topic.trim()) {
      setError("Podaj temat/brief.");
      return;
    }
    setGenerating(true);
    try {
      const res = await generateMarketingDraft({ type, platform, topic });
      if (!res.ok) {
        setError(res.error ?? "Generowanie nie powiodło się.");
        return;
      }
      setTopic("");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Generuj nową treść
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Typ</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MarketingDraftType)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                {(Object.keys(TYPE_LABEL) as MarketingDraftType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Platforma (opcjonalnie)</Label>
              <Input
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder={PLATFORM_PLACEHOLDER[type]}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Temat / brief</Label>
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
              placeholder="np. Promocja nowej funkcji Adwokat AI wśród wykonawców"
              className="mt-1"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generuj szkic"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {drafts.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Brak jeszcze żadnych szkiców.
            </CardContent>
          </Card>
        ) : (
          drafts.map((d) => <DraftRow key={d.id} draft={d} />)
        )}
      </div>
    </div>
  );
}

function DraftRow({ draft }: { draft: MarketingDraft }) {
  const [pending, startTransition] = useTransition();
  const [content, setContent] = useState(draft.content);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const meta = (draft.meta ?? {}) as {
    hashtags?: string[];
    headline_variants?: string[];
    targeting_notes?: string;
    budget_suggestion_pln?: string;
  };

  function saveContent() {
    startTransition(async () => {
      await updateDraftContent(draft.id, content);
      setEditing(false);
    });
  }

  function changeStatus(status: MarketingDraftStatus) {
    startTransition(async () => {
      await setDraftStatus(draft.id, status);
    });
  }

  async function copy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{TYPE_LABEL[draft.type]}</Badge>
            {draft.platform && <Badge variant="outline">{draft.platform}</Badge>}
            <Badge variant={STATUS_VARIANT[draft.status]}>{STATUS_LABEL[draft.status]}</Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(draft.created_at).toLocaleString("pl-PL")}
          </span>
        </div>

        {draft.title && <p className="font-semibold">{draft.title}</p>}
        <p className="text-xs text-muted-foreground">Temat: {draft.topic}</p>

        {editing ? (
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} />
        ) : (
          <p className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">{content}</p>
        )}

        {(meta.hashtags?.length ?? 0) > 0 && (
          <p className="text-xs text-primary">{meta.hashtags!.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}</p>
        )}
        {(meta.headline_variants?.length ?? 0) > 0 && (
          <div className="rounded-lg border bg-white p-2.5 text-xs">
            <p className="font-semibold text-muted-foreground">Warianty nagłówka</p>
            <ul className="mt-1 list-inside list-disc">
              {meta.headline_variants!.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        )}
        {meta.targeting_notes && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Targetowanie:</span> {meta.targeting_notes}
          </p>
        )}
        {meta.budget_suggestion_pln && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Sugerowany budżet:</span>{" "}
            {meta.budget_suggestion_pln}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <Button size="sm" onClick={saveContent} disabled={pending}>
                Zapisz
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                Anuluj
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edytuj
              </Button>
              <Button size="sm" variant="outline" onClick={copy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Skopiowano" : "Kopiuj tekst"}
              </Button>
              {draft.status === "draft" && (
                <>
                  <Button size="sm" onClick={() => changeStatus("approved")} disabled={pending}>
                    Akceptuj
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => changeStatus("rejected")} disabled={pending}>
                    <X className="mr-1 h-3.5 w-3.5" /> Odrzuć
                  </Button>
                </>
              )}
              {draft.status === "approved" && (
                <Button size="sm" onClick={() => changeStatus("published")} disabled={pending}>
                  Oznacz jako opublikowane
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
