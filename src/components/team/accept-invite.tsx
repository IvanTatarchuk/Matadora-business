"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { acceptInvitation } from "@/lib/actions/organizations";

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function accept() {
    setError(null);
    startTransition(async () => {
      const res = await acceptInvitation(token);
      if (!res.ok) {
        setError(res.error ?? "Could not accept");
        return;
      }
      router.push("/dashboard/team");
    });
  }

  return (
    <div className="space-y-2">
      <Button onClick={accept} disabled={pending} className="w-full">
        {pending ? "Joining…" : "Accept invitation"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
