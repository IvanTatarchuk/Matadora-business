import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { CompanyProfileForm } from "@/components/settings/company-profile-form";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, company_name, phone, city, nip, company_address, website, bio, logo_url, role"
    )
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ustawienia firmy</h1>
        <p className="text-sm text-muted-foreground">
          Logo i dane firmy są widoczne w kosztorysach i ofertach wysyłanych do zamawiających.
        </p>
      </div>

      <CompanyProfileForm
        initial={{
          full_name: profile?.full_name ?? "",
          company_name: profile?.company_name ?? "",
          phone: profile?.phone ?? "",
          city: profile?.city ?? "",
          nip: profile?.nip ?? "",
          company_address: profile?.company_address ?? "",
          website: profile?.website ?? "",
          bio: profile?.bio ?? "",
        }}
        logoUrl={profile?.logo_url ?? null}
        email={user.email ?? ""}
      />
    </div>
  );
}
