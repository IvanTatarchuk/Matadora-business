"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Tier = "maly" | "standardowy" | "kompleksowy";

export function BuyButton({
  tier,
  variant = "outline",
  label,
}: {
  tier: Tier;
  variant?: "default" | "outline";
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [nip, setNip] = useState("");

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, nip: nip.trim() || undefined }),
      });
      const data = await res.json();

      if (res.status === 503 || data.error === "payments_not_configured") {
        setFallback(true);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setFallback(true);
    } finally {
      setLoading(false);
    }
  }

  if (fallback) {
    return (
      <div className="mt-6 space-y-2">
        <p className="text-xs text-center text-muted-foreground">
          Płatności online w przygotowaniu.
        </p>
        <Button className="w-full" size="sm" variant="outline" asChild>
          <a href="mailto:vanbud.felix@gmail.com?subject=Zamówienie kosztorysu">
            Zamów przez e-mail <ArrowRight className="ml-1 h-3 w-3" />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-2">
      <div>
        <label className="text-[11px] font-medium text-muted-foreground">
          NIP firmy <span className="text-muted-foreground/70">(opcjonalnie, do faktury)</span>
        </label>
        <Input
          value={nip}
          onChange={(e) => setNip(e.target.value)}
          placeholder="np. 955-235-98-44"
          className="mt-1 h-8 text-sm"
          maxLength={20}
          inputMode="numeric"
        />
      </div>
      <Button
        className="w-full"
        size="sm"
        variant={variant}
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <>
            {label} <ArrowRight className="ml-1 h-3 w-3" />
          </>
        )}
      </Button>
    </div>
  );
}
