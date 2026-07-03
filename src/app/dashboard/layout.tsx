import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { I18nProvider } from "@/lib/i18n/context";
import type { UserRole } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, company_name")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as UserRole) ?? "investor";

  return (
    <I18nProvider>
      <div className="flex min-h-screen bg-muted/30">
        <Sidebar role={role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            name={profile?.full_name || user.email || "User"}
            subtitle={profile?.company_name ?? undefined}
          />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </I18nProvider>
  );
}
