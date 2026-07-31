import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { AnalizaZdjeciaClient } from "./analiza-zdjecia-client";

export default async function AnalizaZdjeciaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title")
    .eq("contractor_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/contractor/bhp"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Wróć do dokumentacji BHP
      </Link>

      <AnalizaZdjeciaClient projects={projects ?? []} />
    </div>
  );
}
