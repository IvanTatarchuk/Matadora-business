"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, AlertTriangle, CheckCircle2, Clock, ArrowRight, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WarrantyRecord, WarrantyStatus, WarrantyCategory } from "@/lib/actions/warranty";
import React from "react";

const CATEGORY_LABELS: Record<WarrantyCategory, string> = {
  workmanship: "Wykonawstwo", materials: "Materiały", equipment: "Urządzenia",
  structural: "Konstrukcja", waterproofing: "Hydroizolacja", electrical: "Elektryka",
  plumbing: "Wod-kan", hvac: "HVAC", other: "Inne",
};

const STATUS_CONFIG: Record<WarrantyStatus, { label: string; color: string; icon: React.ElementType }> = {
  active:   { label: "Aktywna",    color: "bg-green-100 text-green-700",   icon: ShieldCheck },
  claimed:  { label: "Roszczenie", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  resolved: { label: "Rozwiązana", color: "bg-teal-100 text-teal-700",     icon: CheckCircle2 },
  expired:  { label: "Wygasła",    color: "bg-slate-100 text-slate-500",   icon: Clock },
  void:     { label: "Anulowana",  color: "bg-slate-100 text-slate-400",   icon: Clock },
};

export function GlobalGwarancjeClient({ initialWarranties }: { initialWarranties: WarrantyRecord[] }) {
  const [warranties] = useState<WarrantyRecord[]>(initialWarranties);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "claimed" | "expired">("all");
  const now = new Date();

  const expiringSoon = warranties.filter((w) => {
    if (w.status !== "active") return false;
    const days = Math.floor((new Date(w.end_date).getTime() - now.getTime()) / 86400000);
    return days >= 0 && days <= 90;
  });

  const claimed = warranties.filter((w) => w.status === "claimed");

  const filteredWarranties = warranties.filter((w) => {
    const matchesSearch = !searchQuery || w.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || w.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    active: warranties.filter((w) => w.status === "active").length,
    claimed: claimed.length,
    expiring30: warranties.filter((w) => {
      if (w.status !== "active") return false;
      const d = Math.floor((new Date(w.end_date).getTime() - now.getTime()) / 86400000);
      return d >= 0 && d <= 30;
    }).length,
    total: warranties.length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gwarancje — wszystkie projekty</h1>
        <p className="text-sm text-muted-foreground">Aktywne gwarancje i roszczenia na roboty budowlane i materiały</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Aktywne</p><p className="text-2xl font-bold text-green-600">{stats.active}</p></CardContent></Card>
        <Card className={stats.claimed > 0 ? "border-orange-200" : ""}><CardContent className="p-4"><p className="text-xs text-muted-foreground">Roszczenia</p><p className="text-2xl font-bold text-orange-600">{stats.claimed}</p></CardContent></Card>
        <Card className={stats.expiring30 > 0 ? "border-yellow-200" : ""}><CardContent className="p-4"><p className="text-xs text-muted-foreground">Wygasają w 30 dni</p><p className="text-2xl font-bold text-yellow-600">{stats.expiring30}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Łącznie aktywnych</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj gwarancji..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "claimed" | "expired")}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Wszystkie statusy</option>
          <option value="active">Aktywne</option>
          <option value="claimed">W trakcie rozpatrywania</option>
          <option value="expired">Zakończone</option>
        </select>
      </div>

      {claimed.length > 0 && (
        <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
          <p className="font-semibold text-orange-800 mb-2 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" />Otwarte roszczenia ({claimed.length})</p>
          {claimed.map((w) => (
            <div key={w.id} className="flex items-center justify-between py-1.5 border-b border-orange-100 last:border-0 text-sm">
              <div>
                <p className="font-medium text-orange-900">{w.title}</p>
                {w.claim_description && <p className="text-xs text-orange-700">{w.claim_description}</p>}
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/dashboard/contractor/projects/${w.project_id}/gwarancje`}>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}

      {expiringSoon.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Wygasające w ciągu 90 dni ({expiringSoon.length})</h2>
          <div className="space-y-2">
            {expiringSoon.filter(w => filteredWarranties.includes(w)).map((w) => {
              const cfg = STATUS_CONFIG[w.status];
              const Icon = cfg.icon;
              const daysLeft = Math.floor((new Date(w.end_date).getTime() - now.getTime()) / 86400000);
              return (
                <Card key={w.id} className={daysLeft <= 30 ? "border-yellow-200" : ""}>
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold shrink-0 ${cfg.color}`}>
                        <Icon className="h-3 w-3" />{cfg.label}
                      </span>
                      <p className="text-sm font-medium truncate">{w.title}</p>
                      <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[w.category]}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-semibold ${daysLeft <= 30 ? "text-yellow-700" : "text-muted-foreground"}`}>
                        {daysLeft <= 30 ? `⚠ za ${daysLeft} dni` : `za ${daysLeft} dni`}
                      </span>
                      <span className="text-xs text-muted-foreground">{new Date(w.end_date).toLocaleDateString("pl-PL")}</span>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/dashboard/contractor/projects/${w.project_id}/gwarancje`}><ArrowRight className="h-3.5 w-3.5" /></Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {warranties.length === 0 && (
        <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground">
          <ShieldCheck className="mx-auto h-12 w-12 opacity-20 mb-3" />
          <p className="font-medium">Brak aktywnych gwarancji</p>
          <p className="text-sm mt-1">Dodaj gwarancje w widoku projektu</p>
        </CardContent></Card>
      )}
    </div>
  );
}
