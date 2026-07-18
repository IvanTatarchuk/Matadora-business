"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, Check, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPLN } from "@/lib/utils";
import { parseCsv, parseNumber } from "@/lib/csv";
import { commitImport, type ImportResult } from "@/lib/actions/import";
import type { StockStatus } from "@/types/database";

type FieldKey =
  | "product_name"
  | "sku"
  | "external_id"
  | "price_net"
  | "unit"
  | "stock_status";

const FIELDS: { key: FieldKey; label: string; required?: boolean }[] = [
  { key: "product_name", label: "Product name", required: true },
  { key: "price_net", label: "Net price", required: true },
  { key: "sku", label: "SKU" },
  { key: "external_id", label: "Supplier code" },
  { key: "unit", label: "Unit" },
  { key: "stock_status", label: "Stock status" },
];

const GUESS: Record<FieldKey, string[]> = {
  product_name: ["product", "name", "nazwa", "produkt"],
  price_net: ["price", "net", "cena", "netto"],
  sku: ["sku", "index", "indeks", "kod", "artykuł"],
  external_id: ["ean", "code", "id", "symbol"],
  unit: ["unit", "jm", "j.m", "jednostka"],
  stock_status: ["stock", "stan", "dostęp"],
};

const STOCK_VALUES: StockStatus[] = [
  "in_stock",
  "low_stock",
  "out_of_stock",
  "on_order",
];

function normalizeStock(raw: string): StockStatus {
  const s = raw.toLowerCase().trim();
  if (!s) return "in_stock";
  if (STOCK_VALUES.includes(s as StockStatus)) return s as StockStatus;
  if (/(out|brak)/.test(s)) return "out_of_stock";
  if (/(low|mało|low_stock)/.test(s)) return "low_stock";
  if (/(order|zamów)/.test(s)) return "on_order";
  return "in_stock";
}

export function ImportWizard({
  suppliers,
}: {
  suppliers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const [filename, setFilename] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, number>>({
    product_name: -1,
    price_net: -1,
    sku: -1,
    external_id: -1,
    unit: -1,
    stock_status: -1,
  });
  const [supplierId, setSupplierId] = useState<string>("");
  const [supplierName, setSupplierName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  function autoMap(hs: string[]) {
    const next: Record<FieldKey, number> = {
      product_name: -1,
      price_net: -1,
      sku: -1,
      external_id: -1,
      unit: -1,
      stock_status: -1,
    };
    (Object.keys(GUESS) as FieldKey[]).forEach((key) => {
      const idx = hs.findIndex((h) =>
        GUESS[key].some((kw) => h.toLowerCase().includes(kw))
      );
      next[key] = idx;
    });
    setMapping(next);
  }

  function handleFile(file: File) {
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseCsv(text);
      if (parsed.headers.length === 0) {
        setError("Could not read any columns from this file.");
        return;
      }
      setFilename(file.name);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      autoMap(parsed.headers);
    };
    reader.onerror = () => setError("Failed to read the file.");
    reader.readAsText(file);
  }

  const previewItems = useMemo(() => {
    if (mapping.product_name < 0 || mapping.price_net < 0) return [];
    const cell = (r: string[], i: number) => (i >= 0 ? r[i] ?? "" : "");
    return rows.slice(0, 8).map((r) => ({
      product_name: cell(r, mapping.product_name).trim(),
      sku: cell(r, mapping.sku).trim(),
      external_id: cell(r, mapping.external_id).trim(),
      price_net: parseNumber(cell(r, mapping.price_net)),
      unit: cell(r, mapping.unit).trim() || "szt",
      stock_status: normalizeStock(cell(r, mapping.stock_status)),
    }));
  }, [rows, mapping]);

  const canImport =
    rows.length > 0 &&
    mapping.product_name >= 0 &&
    mapping.price_net >= 0 &&
    (supplierId || supplierName.trim().length > 0 || true);

  function runImport() {
    setError(null);
    setResult(null);
    const cell = (r: string[], i: number) => (i >= 0 ? r[i] ?? "" : "");
    const items = rows.map((r) => ({
      product_name: cell(r, mapping.product_name).trim(),
      sku: cell(r, mapping.sku).trim() || null,
      external_id: cell(r, mapping.external_id).trim() || null,
      price_net: parseNumber(cell(r, mapping.price_net)),
      unit: cell(r, mapping.unit).trim() || null,
      stock_status: normalizeStock(cell(r, mapping.stock_status)),
    }));

    startTransition(async () => {
      const res = await commitImport({
        supplierId: supplierId || undefined,
        supplierName: supplierId ? undefined : supplierName.trim() || undefined,
        filename,
        items,
      });
      if (!res.ok) {
        setError(res.error ?? "Import failed");
        return;
      }
      setResult(res);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Step 1 — upload */}
      <Card>
        <CardHeader>
          <CardTitle>1. Upload price list (CSV)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" /> Choose CSV file
            </Button>
            {filename && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" /> {filename} —{" "}
                {rows.length} rows
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Comma or semicolon separated. The first row must be column headers.
          </p>
        </CardContent>
      </Card>

      {headers.length > 0 && (
        <>
          {/* Step 2 — map columns */}
          <Card>
            <CardHeader>
              <CardTitle>2. Map columns</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label>
                    {f.label}
                    {f.required && <span className="text-destructive"> *</span>}
                  </Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={mapping[f.key]}
                    onChange={(e) =>
                      setMapping((m) => ({
                        ...m,
                        [f.key]: Number(e.target.value),
                      }))
                    }
                  >
                    <option value={-1}>— not mapped —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Step 3 — supplier */}
          <Card>
            <CardHeader>
              <CardTitle>3. Supplier</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Existing supplier</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  <option value="">— none / new —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              {!supplierId && (
                <div className="space-y-1">
                  <Label>New supplier name</Label>
                  <Input
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="e.g. PSB Mrówka"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 4 — preview */}
          {previewItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>4. Preview (first {previewItems.length})</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-left">
                    <tr>
                      <th className="p-2 font-medium">Product</th>
                      <th className="p-2 font-medium">SKU</th>
                      <th className="p-2 text-right font-medium">Net price</th>
                      <th className="p-2 font-medium">Unit</th>
                      <th className="p-2 font-medium">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewItems.map((p, i) => (
                      <tr key={i}>
                        <td className="p-2">{p.product_name || "—"}</td>
                        <td className="p-2 text-muted-foreground">
                          {p.sku || "—"}
                        </td>
                        <td className="p-2 text-right">
                          {formatPLN(p.price_net)}
                        </td>
                        <td className="p-2">{p.unit}</td>
                        <td className="p-2">{p.stock_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {result?.ok && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <Check className="h-4 w-4" />
              Imported: {result.created} new, {result.updated} updated.
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button type="button" onClick={runImport} disabled={!canImport || pending}>
              {pending ? "Importing…" : "Import to catalog"}
              {!pending && <ArrowRight className="h-4 w-4" />}
            </Button>
            {(mapping.product_name < 0 || mapping.price_net < 0) && (
              <span className="text-xs text-muted-foreground">
                Map Product name and Net price to continue.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
