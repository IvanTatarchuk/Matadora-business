"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileSignature, Send } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserClient } from "@supabase/ssr";
import { formatPLN } from "@/lib/utils";

type Project = { id: string; title: string };

export default function NewProtokolPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    project_id: "",
    client_phone: "",
    client_email: "",
    title: "",
    description: "",
    work_scope: "",
    amount_net: "",
    vat_rate: "8",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("projects")
        .select("id, title")
        .eq("contractor_id", user.id)
        .eq("status", "active")
        .then(({ data }) => setProjects(data ?? []));
    });
  }, []);

  const net = parseFloat(form.amount_net) || 0;
  const vat = net * (parseFloat(form.vat_rate) / 100);
  const gross = net + vat;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("protokoly_odbioru")
      .insert({
        contractor_id: user.id,
        project_id: form.project_id || null,
        title: form.title,
        description: form.description,
        work_scope: form.work_scope,
        amount_net: net,
        vat_rate: parseFloat(form.vat_rate),
        status: "draft",
      })
      .select("id")
      .single();

    setLoading(false);
    if (!error && data) {
      router.push(`/dashboard/contractor/protokoly/${data.id}`);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/contractor/protokoly">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nowy protokół odbioru</h1>
          <p className="text-sm text-muted-foreground">Klient podpisze na telefonie — faktura KSeF automatycznie</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-base">Dane protokołu</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Projekt (opcjonalnie)</Label>
              <select
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">— brak powiązania —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="title">Tytuł protokołu *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="np. Odbiór robót tynkarskich — etap II"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="work_scope">Zakres robót</Label>
              <textarea
                id="work_scope"
                value={form.work_scope}
                onChange={(e) => setForm({ ...form, work_scope: e.target.value })}
                placeholder="Opisz wykonane prace..."
                rows={4}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <Label htmlFor="description">Uwagi / notatki</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Kwota i VAT</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount_net">Wartość netto (zł) *</Label>
                <Input
                  id="amount_net"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.amount_net}
                  onChange={(e) => setForm({ ...form, amount_net: e.target.value })}
                  placeholder="0.00"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="vat_rate">Stawka VAT (%)</Label>
                <select
                  id="vat_rate"
                  value={form.vat_rate}
                  onChange={(e) => setForm({ ...form, vat_rate: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="8">8% (budownictwo mieszkaniowe)</option>
                  <option value="23">23% (komercyjne)</option>
                  <option value="0">0% (zwolnione)</option>
                </select>
              </div>
            </div>
            {net > 0 && (
              <div className="rounded-lg bg-slate-50 border p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Netto</span>
                  <span>{formatPLN(net)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT {form.vat_rate}%</span>
                  <span>{formatPLN(vat)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 font-bold">
                  <span>BRUTTO</span>
                  <span className="text-primary">{formatPLN(gross)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1">
            <FileSignature className="mr-2 h-4 w-4" />
            {loading ? "Tworzenie..." : "Utwórz protokół"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/contractor/protokoly">Anuluj</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
