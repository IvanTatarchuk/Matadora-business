import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupportAdmin } from "@/lib/admin";
import { listMarketingDrafts } from "@/lib/actions/marketing";
import { MarketingClient } from "./marketing-client";

export default async function MarketingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSupportAdmin(user.email)) {
    redirect("/dashboard");
  }

  const drafts = await listMarketingDrafts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketing AI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generator treści i briefów kampanii — wyłącznie szkice. Nic nie jest publikowane ani
          uruchamiane automatycznie; każdy element wymaga Twojej akceptacji i ręcznej publikacji.
        </p>
      </div>
      <MarketingClient drafts={drafts} />
    </div>
  );
}
