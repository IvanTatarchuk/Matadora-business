"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, FileText, CheckCircle2, Clock, XCircle, TrendingUp,
  TrendingDown, Minus, ChevronDown, ChevronUp,
} from "lucide-react";
import { type GeneratedOffer } from "@/lib/actions/offer-generator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_CONFIG: Record<GeneratedOffer["status"], { label: string; color: string }> = {
  draft: { label: "Szkic", color: "bg-slate-100 text-slate-600" },
  sent: { label: "Wysłana", color: "bg-blue-100 text-blue-700" },
  accepted: { label: "Zaakceptowana", color: "bg-green-100 text-green-700" },
  rejected: { label: "Odrzucona", color: "bg-red-100 text-red-700" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

type Props = {
  projectId: string;
  initialOffers: GeneratedOffer[];
};

export function PorownanieClient({ projectId, initialOffers }: Props) {
  const [offers, setOffers] = useState<GeneratedOffer[]>(initialOffers);
  const [expandedOffer, setExpandedOffer] = useState<string | null>(null);

  const sortedOffers = [...offers].sort((a, b) => (a as any).total_gross - (b as any).total_gross);
  const cheapest = sortedOffers[0];
  const mostExpensive = sortedOffers[sortedOffers.length - 1];
  const avgPrice = sortedOffers.length > 0 
    ? sortedOffers.reduce((sum, o) => sum + (o as any).total_gross, 0) / sortedOffers.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/investor/projects/${projectId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Porównanie ofert</h1>
          <p className="text-sm text-muted-foreground mt-1">Porównaj oferty od różnych wykonawców</p>
        </div>
      </div>

      {/* Summary Cards */}
      {offers.length > 0 && cheapest && mostExpensive && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Najtańsza oferta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{fmt((cheapest as any).total_gross)} PLN</div>
              <p className="text-xs text-muted-foreground mt-1">{(cheapest as any).client_name}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Najdroższa oferta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{fmt((mostExpensive as any).total_gross)} PLN</div>
              <p className="text-xs text-muted-foreground mt-1">{(mostExpensive as any).client_name}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Średnia cena</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmt(avgPrice)} PLN</div>
              <p className="text-xs text-muted-foreground mt-1">{offers.length} ofert</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Różnica</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {fmt((mostExpensive as any).total_gross - (cheapest as any).total_gross)} PLN
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {((1 - (cheapest as any).total_gross / (mostExpensive as any).total_gross) * 100).toFixed(1)}% oszczędności
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Offers Comparison */}
      {offers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium">Brak ofert do porównania</p>
            <p className="text-sm mt-1">Czekaj na oferty od wykonawców</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedOffers.map((offer, idx) => {
            const isCheapest = cheapest && offer.id === cheapest.id;
            const isMostExpensive = mostExpensive && offer.id === mostExpensive.id;
            const isExpanded = expandedOffer === offer.id;
            const StatusConfig = STATUS_CONFIG[offer.status];
            
            return (
              <Card key={offer.id} className={isCheapest ? "border-green-500 bg-green-50/30" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">#{idx + 1}</span>
                        {isCheapest && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">Najtańsza</span>}
                        {isMostExpensive && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Najdroższa</span>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${StatusConfig.color}`}>
                        {StatusConfig.label}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedOffer(isExpanded ? null : offer.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-semibold">{(offer as any).client_name}</p>
                      <p className="text-sm text-muted-foreground">{(offer as any).offer_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{fmt((offer as any).total_gross)} PLN</p>
                      <p className="text-sm text-muted-foreground">Brutto</p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t pt-4 space-y-3">
                      {/* Sections breakdown */}
                      {(offer as any).sections && (offer as any).sections.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Podział kosztów:</p>
                          {(offer as any).sections.map((section: any, sIdx: number) => (
                            <div key={sIdx} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{section.title}</span>
                              <span className="font-medium">{fmt(section.subtotal)} PLN</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Comparison with average */}
                      <div className="flex items-center gap-2 text-sm">
                        {isCheapest ? (
                          <TrendingDown className="h-4 w-4 text-green-600" />
                        ) : isMostExpensive ? (
                          <TrendingUp className="h-4 w-4 text-red-600" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-muted-foreground">
                          {isCheapest
                            ? `${fmt(avgPrice - (offer as any).total_gross)} PLN poniżej średniej`
                            : isMostExpensive
                            ? `${fmt((offer as any).total_gross - avgPrice)} PLN powyżej średniej`
                            : `${fmt(Math.abs((offer as any).total_gross - avgPrice))} PLN od średniej`}
                        </span>
                      </div>

                      {/* Terms */}
                      {(offer as any).terms && (
                        <div className="bg-muted/50 p-3 rounded text-sm">
                          <p className="font-medium mb-1">Warunki:</p>
                          <p className="text-muted-foreground">{(offer as any).terms}</p>
                        </div>
                      )}

                      {/* Payment terms */}
                      {(offer as any).payment_terms && (
                        <div className="bg-muted/50 p-3 rounded text-sm">
                          <p className="font-medium mb-1">Płatność:</p>
                          <p className="text-muted-foreground">{(offer as any).payment_terms}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="flex-1">
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Wybierz
                        </Button>
                        <Button size="sm" variant="outline">
                          Szczegóły
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
