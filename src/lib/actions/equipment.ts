"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type EquipmentCategory =
  | "excavator" | "crane" | "concrete_mixer" | "forklift" | "scaffold"
  | "compressor" | "generator" | "pump" | "vehicle" | "hand_tool"
  | "measurement" | "safety" | "other";

export type EquipmentStatus = "available" | "in_use" | "maintenance" | "retired";

export type Equipment = {
  id: string;
  org_id: string;
  name: string;
  category: EquipmentCategory;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  year: number | null;
  purchase_price: number | null;
  daily_rate: number | null;
  status: EquipmentStatus;
  location: string | null;
  next_service_date: string | null;
  insurance_expiry: string | null;
  notes: string | null;
  created_at: string;
  current_project?: string | null;
};

export type EquipmentAssignment = {
  id: string;
  equipment_id: string;
  project_id: string;
  org_id: string;
  assigned_date: string;
  returned_date: string | null;
  days_used: number;
  cost: number | null;
  notes: string | null;
  created_at: string;
  equipment_name?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function listEquipment(): Promise<Equipment[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];

  const { data, error } = await db(supabase)
    .from("equipment").select("*").eq("org_id", member.org_id).order("name");
  if (error) return [];
  return (data ?? []) as Equipment[];
}

export async function listProjectEquipment(projectId: string): Promise<EquipmentAssignment[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("equipment_assignments")
    .select("*, equipment:equipment_id(name)")
    .eq("project_id", projectId)
    .order("assigned_date", { ascending: false });
  if (error) return [];
  return (data ?? []).map((a: Record<string, unknown>) => ({
    ...a,
    equipment_name: (a.equipment as { name: string } | null)?.name ?? null,
  })) as EquipmentAssignment[];
}

export async function createEquipment(input: {
  name: string; category?: EquipmentCategory;
  brand?: string; model?: string; serialNumber?: string;
  year?: number; purchasePrice?: number; dailyRate?: number;
  location?: string; nextServiceDate?: string; insuranceExpiry?: string; notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  const { data, error } = await db(supabase).from("equipment").insert({
    org_id: member.org_id, name: input.name, category: input.category ?? "other",
    brand: input.brand ?? null, model: input.model ?? null,
    serial_number: input.serialNumber ?? null, year: input.year ?? null,
    purchase_price: input.purchasePrice ?? null, daily_rate: input.dailyRate ?? null,
    location: input.location ?? null, next_service_date: input.nextServiceDate ?? null,
    insurance_expiry: input.insuranceExpiry ?? null, notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/sprzet");
  return { ok: true, id: data.id };
}

export async function assignEquipmentToProject(input: {
  equipmentId: string; projectId: string; assignedDate?: string; notes?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nie zalogowano" };
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return { ok: false, error: "Brak organizacji" };

  // Update status to in_use
  await db(supabase).from("equipment").update({ status: "in_use" }).eq("id", input.equipmentId);

  const { data, error } = await db(supabase).from("equipment_assignments").insert({
    equipment_id: input.equipmentId, project_id: input.projectId, org_id: member.org_id,
    assigned_date: input.assignedDate ?? new Date().toISOString().slice(0, 10),
    notes: input.notes ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/contractor/projects/${input.projectId}/sprzet`);
  return { ok: true, id: data.id };
}

export async function returnEquipment(
  assignmentId: string, projectId: string, equipmentId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const returnDate = new Date().toISOString().slice(0, 10);
  const { error } = await db(supabase)
    .from("equipment_assignments")
    .update({ returned_date: returnDate })
    .eq("id", assignmentId);
  if (error) return { ok: false, error: error.message };
  // Set equipment back to available
  await db(supabase).from("equipment").update({ status: "available" }).eq("id", equipmentId);
  revalidatePath(`/dashboard/contractor/projects/${projectId}/sprzet`);
  return { ok: true };
}

export async function updateEquipmentStatus(
  id: string, status: EquipmentStatus
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await db(supabase).from("equipment").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/sprzet");
  return { ok: true };
}

export async function getEquipmentById(id: string): Promise<Equipment | null> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("equipment")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Equipment;
}

export async function getEquipmentHistory(equipmentId: string): Promise<EquipmentAssignment[]> {
  const supabase = createClient();
  const { data, error } = await db(supabase)
    .from("equipment_assignments")
    .select("*")
    .eq("equipment_id", equipmentId)
    .order("assigned_date", { ascending: false });
  if (error) return [];
  return (data ?? []) as EquipmentAssignment[];
}
