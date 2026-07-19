import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupportAdmin } from "@/lib/admin";
import { listSupportTickets } from "@/lib/actions/support";
import { SupportInboxClient } from "./support-inbox-client";

export default async function SupportInboxPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSupportAdmin(user.email)) {
    redirect("/dashboard");
  }

  const tickets = await listSupportTickets();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Skrzynka wsparcia</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Zgłoszenia od użytkowników platformy, najnowsze na górze.
        </p>
      </div>
      <SupportInboxClient tickets={tickets} />
    </div>
  );
}
