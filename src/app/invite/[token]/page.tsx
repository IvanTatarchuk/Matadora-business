import Link from "next/link";
import { HardHat } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AcceptInvite } from "@/components/team/accept-invite";

export default async function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("organization_invitations")
    .select("email, role, status, org_id, organizations(name)")
    .eq("token", params.token)
    .single();

  const orgName =
    (invite?.organizations as unknown as { name: string } | null)?.name ??
    "an organization";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex items-center gap-2 text-lg font-bold">
            <HardHat className="h-6 w-6 text-primary" /> matadora.business
          </div>
          <CardTitle>Team invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {!invite || invite.status !== "pending" ? (
            <p className="text-sm text-muted-foreground">
              This invitation is no longer valid.
            </p>
          ) : !user ? (
            <>
              <p className="text-sm text-muted-foreground">
                You&apos;ve been invited to join <strong>{orgName}</strong> as{" "}
                <strong>{invite.role}</strong>. Sign in with{" "}
                <strong>{invite.email}</strong> to accept.
              </p>
              <Button asChild className="w-full">
                <Link href={`/login?redirect=/invite/${params.token}`}>
                  Sign in to accept
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Join <strong>{orgName}</strong> as{" "}
                <strong>{invite.role}</strong>.
              </p>
              <AcceptInvite token={params.token} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
