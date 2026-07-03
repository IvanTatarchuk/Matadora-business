"use server";

import { createClient } from "@/lib/supabase/server";
import type { Worker } from "@/types/database";

export async function listWorkersForCurrentOrg(): Promise<Worker[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: member } = await supabase
    .from("organization_members").select("org_id").eq("user_id", user.id).single();
  if (!member) return [];
  const { data } = await supabase
    .from("workers").select("*").eq("org_id", member.org_id).order("full_name");
  return (data ?? []) as Worker[];
}
