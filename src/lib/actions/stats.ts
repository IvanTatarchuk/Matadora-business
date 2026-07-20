"use server";

import { createClient } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function getUserStats() {
  const supabase = createClient();
  
  const { data: profiles, error } = await db(supabase)
    .from("profiles")
    .select("role, created_at");
  
  if (error) {
    return {
      total: 0,
      byRole: {},
      error: error.message
    };
  }
  
  const byRole: Record<string, number> = {
    investor: 0,
    contractor: 0,
    wholesaler: 0
  };
  
  profiles.forEach((profile: { role: string }) => {
    const role = profile.role as keyof typeof byRole;
    if (role && byRole[role] !== undefined) {
      byRole[role]++;
    }
  });
  
  return {
    total: profiles.length,
    byRole,
    error: null
  };
}

export async function getProjectStats() {
  const supabase = createClient();
  
  const { data: projects, error } = await db(supabase)
    .from("projects")
    .select("status, created_at");
  
  if (error) {
    return {
      total: 0,
      byStatus: {},
      error: error.message
    };
  }
  
  const byStatus: Record<string, number> = {
    draft: 0,
    open: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0
  };
  
  projects.forEach((project: { status: string }) => {
    const status = project.status as keyof typeof byStatus;
    if (status && byStatus[status] !== undefined) {
      byStatus[status]++;
    }
  });
  
  return {
    total: projects.length,
    byStatus,
    error: null
  };
}
