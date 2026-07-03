"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Upload, Save, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  updateProfile,
  uploadLogo,
  type ProfileInput,
} from "@/lib/actions/profile";

export function CompanyProfileForm({
  initial,
  logoUrl,
  email,
}: {
  initial: Required<ProfileInput>;
  logoUrl: string | null;
  email: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Required<ProfileInput>>(initial);
  const [logo, setLogo] = useState<string | null>(logoUrl);
  const [saving, startSave] = useTransition();
  const [uploading, startUpload] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function patch(p: Partial<ProfileInput>) {
    setForm((prev) => ({ ...prev, ...p }));
    setSaved(false);
  }

  function save() {
    setError(null);
    startSave(async () => {
      const res = await updateProfile(form);
      if (!res.ok) {
        setError(res.error ?? "Nie udało się zapisać");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const data = new FormData();
    data.set("logo", file);
    startUpload(async () => {
      const res = await uploadLogo(data);
      if (!res.ok) {
        setError(res.error ?? "Upload failed");
        return;
      }
      setLogo(res.logoUrl ?? null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle>Logo firmy</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {logo ? (
              <Image
                src={logo}
                alt="Company logo"
                width={96}
                height={96}
                className="h-full w-full object-contain"
                unoptimized
              />
            ) : (
              <Building2 className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={onPickLogo}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Wgrywanie..." : "Wgraj logo"}
            </Button>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP lub SVG. Maks. 2 MB.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Company details */}
      <Card>
        <CardHeader>
          <CardTitle>Dane firmy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nazwa firmy">
              <Input
                value={form.company_name}
                onChange={(e) => patch({ company_name: e.target.value })}
                placeholder="Kowalski Budowlane Sp. z o.o."
              />
            </Field>
            <Field label="Osoba kontaktowa">
              <Input
                value={form.full_name}
                onChange={(e) => patch({ full_name: e.target.value })}
                placeholder="Jan Kowalski"
              />
            </Field>
            <Field label="NIP">
              <Input
                value={form.nip}
                onChange={(e) => patch({ nip: e.target.value })}
                placeholder="123-456-78-90"
              />
            </Field>
            <Field label="Telefon">
              <Input
                value={form.phone}
                onChange={(e) => patch({ phone: e.target.value })}
                placeholder="+48 600 000 000"
              />
            </Field>
            <Field label="Miasto">
              <Input
                value={form.city}
                onChange={(e) => patch({ city: e.target.value })}
                placeholder="Warszawa"
              />
            </Field>
            <Field label="Strona WWW">
              <Input
                value={form.website}
                onChange={(e) => patch({ website: e.target.value })}
                placeholder="https://acme.pl"
              />
            </Field>
            <Field label="Adres firmy" full>
              <Input
                value={form.company_address}
                onChange={(e) => patch({ company_address: e.target.value })}
                placeholder="ul. Budowlana 1, 00-001 Warszawa"
              />
            </Field>
            <Field label="Opis firmy" full>
              <Textarea
                rows={4}
                value={form.bio}
                onChange={(e) => patch({ bio: e.target.value })}
                placeholder="Krótki opis widoczny na profilu publicznym i w kosztorysach."
              />
            </Field>
          </div>

          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={email} disabled />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center gap-3">
            <Button type="button" onClick={save} disabled={saving}>
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saving ? "Zapisywanie..." : saved ? "Zapisano" : "Zapisz zmiany"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1 ${full ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
