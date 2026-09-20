"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Shield, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  removeMember, type MemberRow,
} from "@/lib/actions/organizations";
import type { Organization, OrgMemberRole } from "@/types/database";

type Props = {
  member: MemberRow;
  org: Organization;
  myRole: OrgMemberRole;
};

export function TeamMemberClient({ member, org, myRole }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const canManage = myRole === "owner" || myRole === "admin";
  const canRemove = canManage && member.role !== "owner";

  function handleRemove() {
    if (!confirm("Czy na pewno chcesz usunąć tego członka zespołu?")) return;
    setError(null);
    startTransition(async () => {
      const result = await removeMember(org.id, member.userId);
      if (!result.ok) {
        setError(result.error ?? "Nie udało się usunąć członka zespołu.");
        return;
      }
      router.push("/dashboard/team");
      router.refresh();
    });
  }

  const roleLabels: Record<OrgMemberRole, string> = {
    owner: "Właściciel",
    admin: "Administrator",
    manager: "Menedżer",
    member: "Członek zespołu",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{member.name}</h1>
            <p className="text-sm text-muted-foreground">
              {roleLabels[member.role]}
            </p>
          </div>
        </div>
        {canRemove && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            disabled={pending}
            onClick={handleRemove}
          >
            <Trash2 className="h-4 w-4" />
            Usuń z zespołu
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informacje o członku
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Imię i nazwisko</p>
                <p className="font-medium">{member.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Rola</p>
                <p className="font-medium">{roleLabels[member.role]}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Ustawienia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ustawienia członka zespołu będą wkrótce dostępne
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aktywność</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Historia aktywności członka zespołu będzie wkrótce dostępna
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
