"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  updateOrganization,
  inviteMember,
  revokeInvitation,
  removeMember,
  type MemberRow,
} from "@/lib/actions/organizations";
import type {
  Organization,
  OrgMemberRole,
} from "@/types/database";

const selectClass =
  "h-10 rounded-md border border-input bg-background px-3 text-sm";

type Invite = {
  id: string;
  email: string;
  role: OrgMemberRole;
  status: string;
  token: string;
  created_at: string;
};

export function TeamManager({
  org,
  myRole,
  members,
  invites,
}: {
  org: Organization;
  myRole: OrgMemberRole;
  members: MemberRow[];
  invites: Invite[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const canManage = myRole === "owner" || myRole === "admin";

  const [profile, setProfile] = useState({
    name: org.name ?? "",
    nip: org.nip ?? "",
    address: org.address ?? "",
    website: org.website ?? "",
    bio: org.bio ?? "",
  });
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgMemberRole>("member");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const inviteLink = (token: string) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${token}`
      : `/invite/${token}`;

  function saveProfile() {
    setSavedMsg(null);
    startTransition(async () => {
      const res = await updateOrganization(org.id, {
        name: profile.name,
        nip: profile.nip || null,
        address: profile.address || null,
        website: profile.website || null,
        bio: profile.bio || null,
      });
      setSavedMsg(res.ok ? "Saved" : res.error ?? "Failed");
      if (res.ok) router.refresh();
    });
  }

  function invite() {
    setInviteError(null);
    startTransition(async () => {
      const res = await inviteMember(org.id, email, role);
      if (!res.ok) {
        setInviteError(res.error ?? "Failed");
        return;
      }
      setEmail("");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Organization profile */}
      <Card>
        <CardHeader>
          <CardTitle>Company details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={profile.name}
              disabled={!canManage}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>NIP</Label>
              <Input
                value={profile.nip}
                disabled={!canManage}
                onChange={(e) => setProfile({ ...profile, nip: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Website</Label>
              <Input
                value={profile.website}
                disabled={!canManage}
                onChange={(e) =>
                  setProfile({ ...profile, website: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Address</Label>
            <Input
              value={profile.address}
              disabled={!canManage}
              onChange={(e) =>
                setProfile({ ...profile, address: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>About</Label>
            <Textarea
              rows={3}
              value={profile.bio}
              disabled={!canManage}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            />
          </div>
          {canManage && (
            <div className="flex items-center gap-3">
              <Button onClick={saveProfile} disabled={pending}>
                Save
              </Button>
              {savedMsg && (
                <span className="text-sm text-muted-foreground">{savedMsg}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members + invitations */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Members ({members.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.map((m) => (
              <div
                key={m.userId}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  {m.name}{" "}
                  <span className="text-muted-foreground">· {m.role}</span>
                </span>
                {canManage && m.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await removeMember(org.id, m.userId);
                        router.refresh();
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle>Invite a member</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="person@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <select
                  className={selectClass}
                  value={role}
                  onChange={(e) => setRole(e.target.value as OrgMemberRole)}
                >
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
                <Button onClick={invite} disabled={pending}>
                  Invite
                </Button>
              </div>
              {inviteError && (
                <p className="text-sm text-destructive">{inviteError}</p>
              )}

              {invites.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-sm font-medium">Pending invitations</p>
                  {invites.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate">
                        {inv.email}{" "}
                        <span className="text-muted-foreground">
                          · {inv.role}
                        </span>
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard?.writeText(
                              inviteLink(inv.token)
                            );
                            setCopied(inv.id);
                            setTimeout(() => setCopied(null), 1500);
                          }}
                        >
                          {copied === inv.id ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              await revokeInvitation(inv.id);
                              router.refresh();
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
