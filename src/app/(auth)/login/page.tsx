"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { HardHat } from "lucide-react";

import { login, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Logowanie..." : "Zaloguj się"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState<AuthState, FormData>(
    login,
    undefined
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex items-center gap-2 font-bold text-lg">
            <HardHat className="h-6 w-6 text-primary" /> matadora.business
          </div>
          <CardTitle>Witaj z powrotem</CardTitle>
          <CardDescription>Zaloguj się do swojego konta</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adres e-mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <SubmitButton />
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Nie masz konta?{" "}
            <Link href="/register" className="font-medium text-primary">
              Zarejestruj się
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
