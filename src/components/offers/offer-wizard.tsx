"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building,
  Layers,
  Calculator,
  Package,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatPLN } from "@/lib/utils";
import {
  DEFAULT_STAGES,
  VAT_RATES,
  computeOfferTotals,
  type StageInput,
} from "@/lib/offer-calc";
import { createOffer } from "@/lib/actions/offers";
import type { StockStatus } from "@/types/database";

const STEPS = [
  { id: 1, title: "Project", icon: Building },
  { id: 2, title: "Stages", icon: Layers },
  { id: 3, title: "Materials", icon: Package },
  { id: 4, title: "Review", icon: Calculator },
];

export interface CatalogMaterial {
  id: string;
  product_name: string;
  sku: string | null;
  price_net: number;
  unit: string;
  stock_status: StockStatus;
}

export function OfferWizard({ materials }: { materials: CatalogMaterial[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — project details
  const [projectTitle, setProjectTitle] = useState("");
  const [offerTitle, setOfferTitle] = useState("");
  const [address, setAddress] = useState("");
  const [surfaceArea, setSurfaceArea] = useState<number>(0);
  const [investorEmail, setInvestorEmail] = useState("");

  // Step 2 — stages
  const [stages, setStages] = useState<StageInput[]>(DEFAULT_STAGES);
  const [vatRate, setVatRate] = useState<number>(23);

  // Step 3 — materials (materialId -> quantity)
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem("matadora_kosztorys_draft");
      if (!raw) return;
      localStorage.removeItem("matadora_kosztorys_draft");
      const draft = JSON.parse(raw) as {
        projectTitle?: string;
        vatRate?: number;
        stages?: StageInput[];
      };
      if (draft.projectTitle) setProjectTitle(draft.projectTitle);
      if (draft.vatRate) setVatRate(draft.vatRate);
      if (draft.stages?.length) setStages(draft.stages);
    } catch {
      // ignore malformed data
    }
  }, []);

  const totals = useMemo(
    () => computeOfferTotals(stages, vatRate),
    [stages, vatRate]
  );

  const selectedMaterials = useMemo(
    () =>
      materials
        .map((m) => ({ material: m, quantity: quantities[m.id] ?? 0 }))
        .filter((x) => x.quantity > 0),
    [materials, quantities]
  );

  const materialsTotal = useMemo(
    () =>
      selectedMaterials.reduce(
        (sum, x) => sum + Number(x.material.price_net) * x.quantity,
        0
      ),
    [selectedMaterials]
  );

  function setQuantity(id: string, qty: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, qty) }));
  }

  function updateStage(index: number, patch: Partial<StageInput>) {
    setStages((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  }

  function addStage() {
    setStages((prev) => [
      ...prev,
      { stage_name: "", description: "", cost: 0, order_index: prev.length },
    ]);
  }

  function removeStage(index: number) {
    setStages((prev) => prev.filter((_, i) => i !== index));
  }

  function next() {
    setError(null);
    if (step === 1 && (!projectTitle || !offerTitle)) {
      setError("Project title and offer title are required.");
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createOffer({
        projectTitle,
        offerTitle,
        address,
        surfaceArea: Number(surfaceArea) || 0,
        vatRate,
        investorEmail: investorEmail || undefined,
        stages: stages.filter((s) => s.stage_name.trim().length > 0),
        materialItems: selectedMaterials.map((x) => ({
          materialId: x.material.id,
          quantity: x.quantity,
        })),
      });
      if (!res.ok) {
        setError(res.error ?? "Something went wrong");
        return;
      }
      router.push(`/dashboard/contractor/offers/${res.offerId}`);
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                step >= s.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted text-muted-foreground"
              )}
            >
              {step > s.id ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
            </div>
            <span
              className={cn(
                "ml-2 text-sm font-medium",
                step >= s.id ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {s.title}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-3 h-0.5 flex-1",
                  step > s.id ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Project details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="projectTitle">Project title</Label>
                  <Input
                    id="projectTitle"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="Apartment renovation — Mokotów"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offerTitle">Offer title</Label>
                  <Input
                    id="offerTitle"
                    value={offerTitle}
                    onChange={(e) => setOfferTitle(e.target.value)}
                    placeholder="Full renovation estimate"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="ul. Przykładowa 1, Warszawa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surface">Surface area (m²)</Label>
                  <Input
                    id="surface"
                    type="number"
                    min={0}
                    value={surfaceArea || ""}
                    onChange={(e) => setSurfaceArea(Number(e.target.value))}
                    placeholder="68"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="investor">Investor email (optional)</Label>
                  <Input
                    id="investor"
                    type="email"
                    value={investorEmail}
                    onChange={(e) => setInvestorEmail(e.target.value)}
                    placeholder="investor@example.com"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Estimate stages</h2>
                <Button variant="outline" size="sm" onClick={addStage}>
                  <Plus className="h-4 w-4" /> Add stage
                </Button>
              </div>

              <div className="space-y-3">
                {stages.map((stage, i) => (
                  <div
                    key={i}
                    className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_140px_auto]"
                  >
                    <div className="space-y-2">
                      <Input
                        value={stage.stage_name}
                        onChange={(e) =>
                          updateStage(i, { stage_name: e.target.value })
                        }
                        placeholder="Stage name (e.g. Demolition)"
                      />
                      <Textarea
                        value={stage.description ?? ""}
                        onChange={(e) =>
                          updateStage(i, { description: e.target.value })
                        }
                        placeholder="Short description"
                        className="min-h-[60px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Net cost (PLN)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={stage.cost || ""}
                        onChange={(e) =>
                          updateStage(i, { cost: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="flex items-start">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStage(i)}
                        aria-label="Remove stage"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>VAT rate</Label>
                <div className="flex gap-3">
                  {VAT_RATES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setVatRate(r.value)}
                      className={cn(
                        "rounded-md border px-4 py-2 text-sm transition-colors",
                        vatRate === r.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "hover:bg-accent"
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Attach materials</h2>
                <p className="text-sm text-muted-foreground">
                  Set a quantity for catalog products used in this project.
                  Accepting the offer auto-creates orders for each wholesaler.
                </p>
              </div>

              {materials.length === 0 ? (
                <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                  No catalog materials available yet. You can still create the
                  offer and attach materials later.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="p-3 font-medium">Product</th>
                        <th className="p-3 text-right font-medium">Net price</th>
                        <th className="p-3 text-center font-medium">Quantity</th>
                        <th className="p-3 text-right font-medium">Line net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {materials.map((m) => {
                        const qty = quantities[m.id] ?? 0;
                        return (
                          <tr key={m.id}>
                            <td className="p-3">
                              <p className="font-medium">{m.product_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {m.sku ? `${m.sku} · ` : ""}
                                {m.unit}
                              </p>
                            </td>
                            <td className="p-3 text-right">
                              {formatPLN(Number(m.price_net))}
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                min={0}
                                value={qty || ""}
                                onChange={(e) =>
                                  setQuantity(m.id, Number(e.target.value))
                                }
                                className="mx-auto h-9 w-24 text-center"
                              />
                            </td>
                            <td className="p-3 text-right">
                              {qty > 0
                                ? formatPLN(Number(m.price_net) * qty)
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedMaterials.length > 0 && (
                <div className="ml-auto flex w-full max-w-xs justify-between text-sm font-semibold">
                  <span>Materials net total</span>
                  <span>{formatPLN(materialsTotal)}</span>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Review &amp; create</h2>
              <div className="rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="p-3 font-medium">Stage</th>
                      <th className="p-3 text-right font-medium">Net cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stages
                      .filter((s) => s.stage_name)
                      .map((s, i) => (
                        <tr key={i}>
                          <td className="p-3">
                            <p className="font-medium">{s.stage_name}</p>
                            {s.description && (
                              <p className="text-xs text-muted-foreground">
                                {s.description}
                              </p>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {formatPLN(Number(s.cost))}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="ml-auto w-full max-w-xs space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Net total</span>
                  <span>{formatPLN(totals.totalNet)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT ({vatRate}%)</span>
                  <span>{formatPLN(totals.vatAmount)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-bold">
                  <span>Gross total</span>
                  <span>{formatPLN(totals.totalGross)}</span>
                </div>
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1 || pending}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < 4 ? (
          <Button onClick={next}>
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={pending}>
            {pending ? "Creating..." : "Create offer"}
            <Check className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
