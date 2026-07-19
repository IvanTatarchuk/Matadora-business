"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export type BhpDocType =
  | "szkolenie_bhp"
  | "instrukcja_stanowiskowa"
  | "ocena_ryzyka"
  | "lista_pracownikow"
  | "wypadek"
  | "protokol_bhp"
  | "other";

export type BhpDocument = {
  id: string;
  contractor_id: string;
  project_id: string | null;
  doc_type: BhpDocType;
  title: string;
  content: string | null;
  valid_from: string | null;
  valid_until: string | null;
  is_expired: boolean;
  status: "draft" | "active" | "expired" | "archived";
  created_at: string;
};

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function listBhpDocuments(): Promise<BhpDocument[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await db(supabase)
    .from("bhp_documents")
    .select("*")
    .eq("contractor_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getBhpDocument(id: string): Promise<BhpDocument | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await db(supabase)
    .from("bhp_documents")
    .select("*")
    .eq("id", id)
    .eq("contractor_id", user.id)
    .maybeSingle();

  return data ?? null;
}

export async function saveBhpDocument(input: {
  id?: string;
  doc_type: BhpDocType;
  title: string;
  content?: string;
  valid_from?: string;
  valid_until?: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  if (!input.title.trim()) {
    return { ok: false, error: "Tytuł jest wymagany" };
  }

  const isExpired = input.valid_until
    ? new Date(input.valid_until) < new Date()
    : false;

  const row = {
    contractor_id: user.id,
    doc_type: input.doc_type,
    title: input.title.trim(),
    content: input.content?.trim() || null,
    valid_from: input.valid_from || null,
    valid_until: input.valid_until || null,
    is_expired: isExpired,
    status: isExpired ? "expired" : "active",
  };

  if (input.id) {
    const { error } = await db(supabase)
      .from("bhp_documents")
      .update(row)
      .eq("id", input.id)
      .eq("contractor_id", user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/dashboard/contractor/bhp");
    return { ok: true, id: input.id };
  }

  const { data, error } = await db(supabase)
    .from("bhp_documents")
    .insert(row)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/contractor/bhp");
  revalidatePath("/dashboard/contractor");
  return { ok: true, id: data.id };
}

export async function deleteBhpDocument(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };

  const { error } = await db(supabase)
    .from("bhp_documents")
    .delete()
    .eq("id", id)
    .eq("contractor_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/contractor/bhp");
  revalidatePath("/dashboard/contractor");
  return { ok: true };
}
