"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrgMemberRole, Organization } from "@/types/database";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface MyOrg {
  org: Organization;
  role: OrgMemberRole;
}

export interface MemberRow {
  userId: string;
  role: OrgMemberRole;
  name: string;
  email: string | null;
}

/** Resolves the current user's primary organization (owned first). */
export async function getMyOrganization(): Promise<MyOrg | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("role, org_id, organizations(*)")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) return null;

  // Prefer an org the user owns.
  const owned = memberships.find((m) => m.role === "owner") ?? memberships[0];
  if (!owned) return null;
  const org = owned.organizations as unknown as Organization;
  return { org, role: owned.role as OrgMemberRole };
}

export async function updateOrganization(
  orgId: string,
  patch: {
    name?: string;
    nip?: string | null;
    address?: string | null;
    website?: string | null;
    bio?: string | null;
  }
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("organizations")
    .update(patch)
    .eq("id", orgId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/team");
  return { ok: true };
}

export async function getMembers(orgId: string): Promise<MemberRow[]> {
  const supabase = createClient();
  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("org_id", orgId);
  if (!members || members.length === 0) return [];

  const ids = members.map((m) => m.user_id);
  const { data: people } = await supabase
    .from("profiles")
    .select("id, full_name, company_name")
    .in("id", ids);
  const nameById = new Map(
    (people ?? []).map((p) => [p.id, p.full_name || p.company_name || "Member"])
  );

  return members.map((m) => ({
    userId: m.user_id,
    role: m.role as OrgMemberRole,
    name: nameById.get(m.user_id) ?? "Member",
    email: null,
  }));
}

export async function inviteMember(
  orgId: string,
  email: string,
  role: OrgMemberRole = "member"
): Promise<ActionResult & { token?: string }> {
  const supabase = createClient();
  const clean = email.trim().toLowerCase();
  if (!clean || !clean.includes("@")) {
    return { ok: false, error: "Enter a valid email" };
  }
  const { data, error } = await supabase
    .from("organization_invitations")
    .upsert(
      { org_id: orgId, email: clean, role, status: "pending" },
      { onConflict: "org_id,email" }
    )
    .select("token")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/team");
  return { ok: true, token: data.token };
}

export async function revokeInvitation(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("organization_invitations")
    .update({ status: "revoked" })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/team");
  return { ok: true };
}

export async function removeMember(
  orgId: string,
  userId: string
): Promise<ActionResult> {
  const supabase = createClient();
  // Never remove the owner.
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_id")
    .eq("id", orgId)
    .single();
  if (org?.owner_id === userId) {
    return { ok: false, error: "Cannot remove the organization owner" };
  }
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/team");
  return { ok: true };
}

/**
 * Accepts an invitation by token for the signed-in user. Uses the service-role
 * client because the accepting user is not yet a member (RLS would block the
 * insert), but we validate the invite email matches the user's email first.
 */
export async function acceptInvitation(token: string): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Not authenticated" };

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("organization_invitations")
    .select("id, org_id, email, role, status")
    .eq("token", token)
    .single();

  if (!invite || invite.status !== "pending") {
    return { ok: false, error: "Invitation is not valid" };
  }
  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false, error: "This invitation is for a different email" };
  }

  const { error: memberError } = await admin
    .from("organization_members")
    .upsert(
      { org_id: invite.org_id, user_id: user.id, role: invite.role },
      { onConflict: "org_id,user_id" }
    );
  if (memberError) return { ok: false, error: memberError.message };

  await admin
    .from("organization_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  revalidatePath("/dashboard");
  return { ok: true };
}
