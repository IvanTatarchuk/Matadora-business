"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface SubscribeResult {
  ok: boolean;
  error?: string;
}

export async function subscribePrzetargi(
  email: string,
  categories: string[],
  voivodeship: string
): Promise<SubscribeResult> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Podaj poprawny adres e-mail." };
  }
  if (categories.length === 0) {
    return { ok: false, error: "Wybierz co najmniej jedną kategorię robót." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (s: any) => s as any;
  const supabase = createAdminClient();
  const normalizedEmail = email.toLowerCase().trim();

  // Check for existing subscription and update, otherwise insert
  const { data: existing } = await db(supabase)
    .from("przetargi_subscriptions")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existing) {
    const { error } = await db(supabase)
      .from("przetargi_subscriptions")
      .update({ categories, voivodeship: voivodeship || null, is_active: true })
      .eq("id", existing.id);
    if (error) {
      console.error("przetargi update error:", error.message);
      return { ok: false, error: "Błąd zapisu. Spróbuj ponownie." };
    }
  } else {
    const { error } = await db(supabase)
      .from("przetargi_subscriptions")
      .insert({ email: normalizedEmail, categories, voivodeship: voivodeship || null });
    if (error) {
      console.error("przetargi insert error:", error.message);
      return { ok: false, error: "Błąd zapisu. Spróbuj ponownie." };
    }
  }

  return { ok: true };
}
