"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type PublicAd = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  property_type: "apartment" | "house" | "office" | "commercial";
  area_size: number | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  budget_min: number | null;
  budget_max: number | null;
  photos: string[];
  phone: string | null;
  preferred_contact: "phone" | "email" | "chat";
  work_type: string[];
  start_date: string | null;
  status: "active" | "closed" | "pending" | "suspended";
  views_count: number;
  responses_count: number;
  created_at: string;
  updated_at: string;
};

export type AdResponse = {
  id: string;
  ad_id: string;
  contractor_id: string;
  message: string | null;
  estimated_price: number | null;
  estimated_days: number | null;
  status: "pending" | "accepted" | "rejected" | "completed";
  created_at: string;
  updated_at: string;
};

export type ContractorReview = {
  id: string;
  ad_id: string | null;
  contractor_id: string;
  author_id: string;
  rating: number;
  review: string | null;
  created_at: string;
};

export type CreateAdInput = {
  title: string;
  description?: string;
  property_type: "apartment" | "house" | "office" | "commercial";
  area_size?: number;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  budget_min?: number;
  budget_max?: number;
  photos?: string[];
  phone?: string;
  preferred_contact?: "phone" | "email" | "chat";
  work_type?: string[];
  start_date?: string;
};

export type CreateResponseInput = {
  ad_id: string;
  message?: string;
  estimated_price?: number;
  estimated_days?: number;
};

export type CreateReviewInput = {
  ad_id?: string;
  contractor_id: string;
  rating: number;
  review?: string;
};

// Wgrywanie zdjęcia do ogłoszenia
export async function uploadAdPhoto(file: File, adId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie zalogowano" };
  }

  // Sprawdzenie rozmiaru pliku (maks. 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "Plik jest zbyt duży (maks. 5MB)" };
  }

  // Sprawdzenie typu pliku
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { ok: false, error: "Nieobsługiwany format pliku (tylko JPG, PNG, WEBP)" };
  }

  // Generowanie unikalnej nazwy pliku
  const fileExt = file.name.split('.').pop();
  const fileName = `${adId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('public-ads-photos')
    .upload(fileName, file);

  if (error) {
    return { ok: false, error: error.message };
  }

  // Pobranie publicznego URL
  const { data: { publicUrl } } = supabase.storage
    .from('public-ads-photos')
    .getPublicUrl(fileName);

  return { ok: true, url: publicUrl };
}

// Usuwanie zdjęcia
export async function deleteAdPhoto(url: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie zalogowano" };
  }

  // Wyodrębnienie ścieżki z URL
  const urlParts = url.split('/');
  const fileName = urlParts[urlParts.length - 1];
  const path = urlParts[urlParts.length - 2] + '/' + fileName;

  const { error } = await supabase.storage
    .from('public-ads-photos')
    .remove([path]);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

// Pobranie listy aktywnych ogłoszeń z filtrami
export async function listPublicAds(filters: {
  city?: string;
  property_type?: string;
  work_type?: string;
  budget_min?: number;
  budget_max?: number;
  limit?: number;
  offset?: number;
} = {}) {
  const supabase = createClient();
  
  let query = supabase
    .from("public_ads")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (filters.city) {
    query = query.ilike("city", `%${filters.city}%`);
  }
  if (filters.property_type) {
    query = query.eq("property_type", filters.property_type);
  }
  if (filters.work_type) {
    query = query.contains("work_type", [filters.work_type]);
  }
  if (filters.budget_min !== undefined) {
    query = query.gte("budget_min", filters.budget_min);
  }
  if (filters.budget_max !== undefined) {
    query = query.lte("budget_max", filters.budget_max);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: data as PublicAd[] };
}

// Pobranie ogłoszenia po ID
export async function getPublicAd(id: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("public_ads")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  // Don't fail the page load if the view-count bump errors — best effort only.
  await supabase.rpc("increment_views_count", { ad_id: id });

  return { ok: true, data: data as PublicAd };
}

// Pobranie ogłoszeń użytkownika
export async function getUserAds(userId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("public_ads")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: data as PublicAd[] };
}

// Utworzenie nowego ogłoszenia
export async function createPublicAd(input: CreateAdInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie zalogowano" };
  }

  // @ts-ignore - Supabase types need to be regenerated after migration
  const { data, error } = await supabase
    .from("public_ads")
    .insert({
      user_id: user.id,
      title: input.title,
      description: input.description || null,
      property_type: input.property_type,
      area_size: input.area_size || null,
      address: input.address || null,
      city: input.city || null,
      latitude: input.latitude || null,
      longitude: input.longitude || null,
      budget_min: input.budget_min || null,
      budget_max: input.budget_max || null,
      photos: input.photos || [],
      phone: input.phone || null,
      preferred_contact: input.preferred_contact || "phone",
      work_type: input.work_type || [],
      start_date: input.start_date || null,
      status: "active",
    } as any)
    .select()
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/public-ads");
  revalidatePath("/my-ads");

  // @ts-ignore
  return { ok: true, data: data as PublicAd, id: data.id };
}

// Aktualizacja ogłoszenia
// @ts-ignore - Supabase types need to be regenerated after migration
export async function updatePublicAd(id: string, input: Partial<CreateAdInput>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie zalogowano" };
  }

  const { data, error } = await supabase
    .from("public_ads")
    // @ts-ignore
    .update({
      title: input.title,
      description: input.description,
      property_type: input.property_type,
      area_size: input.area_size,
      address: input.address,
      city: input.city,
      latitude: input.latitude,
      longitude: input.longitude,
      budget_min: input.budget_min,
      budget_max: input.budget_max,
      photos: input.photos,
      phone: input.phone,
      preferred_contact: input.preferred_contact,
      work_type: input.work_type,
      start_date: input.start_date,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single() as any;

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/public-ads");
  revalidatePath("/my-ads");
  revalidatePath(`/public-ads/${id}`);

  return { ok: true, data: data as PublicAd };
}

// Usunięcie ogłoszenia
export async function deletePublicAd(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie zalogowano" };
  }

  const { error } = await supabase
    .from("public_ads")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/public-ads");
  revalidatePath("/my-ads");

  return { ok: true };
}

// Zamknięcie ogłoszenia
export async function closePublicAd(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie zalogowano" };
  }

  const { error } = await supabase
    .from("public_ads")
    // @ts-ignore
    .update({ status: "closed" })
    .eq("id", id)
    .eq("user_id", user.id) as any;

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/public-ads");
  revalidatePath("/my-ads");
  revalidatePath(`/public-ads/${id}`);

  return { ok: true };
}

// Odpowiedź na ogłoszenie
export async function respondToAd(input: CreateResponseInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie zalogowano" };
  }

  // @ts-ignore - Supabase types need to be regenerated after migration
  const { data, error } = await supabase
    .from("ad_responses")
    .insert({
      ad_id: input.ad_id,
      contractor_id: user.id,
      message: input.message || null,
      estimated_price: input.estimated_price || null,
      estimated_days: input.estimated_days || null,
      status: "pending",
    } as any)
    .select()
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/public-ads/${input.ad_id}`);
  revalidatePath("/my-responses");

  // @ts-ignore
  return { ok: true, data: data as AdResponse, id: data.id };
}

// Pobranie odpowiedzi na ogłoszenie
export async function getAdResponses(adId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie zalogowano" };
  }

  const { data, error } = await supabase
    .from("ad_responses")
    .select(`
      *,
      contractor:auth.users(id, email, raw_user_meta_data->>'full_name' as full_name)
    `)
    .eq("ad_id", adId)
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: data as any[] };
}

// Aktualizacja statusu odpowiedzi
export async function updateResponseStatus(responseId: string, status: "accepted" | "rejected" | "completed") {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie zalogowano" };
  }

  const { error } = await supabase
    .from("ad_responses")
    // @ts-ignore
    .update({ status })
    .eq("id", responseId) as any;

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/my-responses");

  return { ok: true };
}

// Dodanie opinii o wykonawcy
export async function createContractorReview(input: CreateReviewInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie zalogowano" };
  }

  // @ts-ignore - Supabase types need to be regenerated after migration
  const { data, error } = await supabase
    .from("contractor_reviews")
    .insert({
      ad_id: input.ad_id || null,
      contractor_id: input.contractor_id,
      author_id: user.id,
      rating: input.rating,
      review: input.review || null,
    } as any)
    .select()
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/public-ads");
  revalidatePath(`/public-ads/${input.ad_id}`);

  // @ts-ignore
  return { ok: true, data: data as ContractorReview, id: data.id };
}

// Pobranie opinii o wykonawcy
export async function getContractorReviews(contractorId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("contractor_reviews")
    .select(`
      *,
      author:auth.users(id, email, raw_user_meta_data->>'full_name' as full_name)
    `)
    .eq("contractor_id", contractorId)
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: data as any[] };
}

// Pobranie średniej oceny wykonawcy
export async function getContractorRating(contractorId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("contractor_reviews")
    .select("rating")
    .eq("contractor_id", contractorId);

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return { ok: true, rating: 0, count: 0 };
  }

  const avgRating = data.reduce((sum: number, r: any) => sum + r.rating, 0) / data.length;

  return { ok: true, rating: Math.round(avgRating * 10) / 10, count: data.length };
}
