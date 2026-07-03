"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { HardHat, Building2, Truck } from "lucide-react";

import { register, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ROLE_OPTIONS: { value: UserRole; label: string; icon: typeof HardHat }[] =
  [
    { value: "investor", label: "Inwestor", icon: Building2 },
    { value: "contractor", label: "Wykonawca", icon: HardHat },
    { value: "wholesaler", label: "Hurtownia", icon: Truck },
  ];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Tworzenie konta..." : "Załóż konto"}
    </Button>
  );
}

export default function RegisterPage() {
  const [state, formAction] = useFormState<AuthState, FormData>(
    register,
    undefined
  );
  const [role, setRole] = useState<UserRole>("investor");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex items-center gap-2 font-bold text-lg">
            <HardHat className="h-6 w-6 text-primary" /> matadora.business
          </div>
          <CardTitle>Załóż konto bezpłatnie</CardTitle>
          <CardDescription>Wybierz swoją rolę, aby zacząć</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="role" value={role} />
            <div className="grid grid-cols-3 gap-3">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors",
                    role === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "hover:bg-accent"
                  )}
                >
                  <opt.icon className="h-6 w-6" />
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Imię i nazwisko</Label>
                <Input id="full_name" name="full_name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_name">Nazwa firmy</Label>
                <Input id="company_name" name="company_name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Miasto</Label>
                <Input id="city" name="city" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" name="phone" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Adres e-mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Hasło (min. 6 znaków)</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={6}
                required
              />
            </div>

            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <SubmitButton />
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Masz już konto?{" "}
            <Link href="/login" className="font-medium text-primary">
              Zaloguj się
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
