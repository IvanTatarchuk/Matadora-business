"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

const ROLE_HOME: Record<UserRole, string> = {
  investor: "/dashboard/investor",
  contractor: "/dashboard/contractor",
  wholesaler: "/dashboard/wholesaler",
};

export type AuthState = { error?: string } | undefined;

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dest = "/dashboard";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    dest = ROLE_HOME[(profile?.role as UserRole) ?? "investor"];
  }

  revalidatePath("/", "layout");
  redirect(dest);
}

export async function register(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "investor") as UserRole;
  const full_name = String(formData.get("full_name") ?? "");
  const company_name = String(formData.get("company_name") ?? "");
  const city = String(formData.get("city") ?? "");
  const phone = String(formData.get("phone") ?? "");

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, full_name, company_name, city, phone },
    },
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(ROLE_HOME[role]);
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
