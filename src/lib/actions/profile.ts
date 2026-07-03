"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
  logoUrl?: string;
}

export interface ProfileInput {
  full_name?: string;
  company_name?: string;
  phone?: string;
  city?: string;
  nip?: string;
  company_address?: string;
  website?: string;
  bio?: string;
}

const BUCKET = "company-assets";
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/** Updates the current user's company/profile text fields. */
export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const clean = (v?: string) => {
    const t = (v ?? "").trim();
    return t.length > 0 ? t : null;
  };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: clean(input.full_name),
      company_name: clean(input.company_name),
      phone: clean(input.phone),
      city: clean(input.city),
      nip: clean(input.nip),
      company_address: clean(input.company_address),
      website: clean(input.website),
      bio: clean(input.bio),
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

/**
 * Uploads a company logo to the `company-assets` bucket under the user's own
 * folder and saves its public URL on the profile. Expects FormData field "logo".
 */
export async function uploadLogo(formData: FormData): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided" };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, error: "Logo must be 2 MB or smaller" };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: "Use PNG, JPG, WEBP or SVG" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${user.id}/logo-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { ok: false, error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ logo_url: publicUrl })
    .eq("id", user.id);

  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath("/dashboard/settings");
  return { ok: true, logoUrl: publicUrl };
}
