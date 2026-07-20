"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Tab = { href: string; label: string };

export function ProjectSubnav({
  projectId,
  role,
}: {
  projectId: string;
  role: "contractor" | "investor";
}) {
  const pathname = usePathname();

  const tabs: Tab[] =
    role === "contractor"
      ? [
          { href: `/dashboard/contractor/projects/${projectId}`, label: "Realizacja" },
          { href: `/dashboard/contractor/projects/${projectId}/gantt`, label: "Harmonogram" },
          { href: `/dashboard/contractor/projects/${projectId}/finance`, label: "Finanse" },
          { href: `/dashboard/contractor/projects/${projectId}/punch`, label: "Usterki" },
          { href: `/dashboard/contractor/projects/${projectId}/dokumenty`, label: "Dokumenty" },
          { href: `/dashboard/contractor/projects/${projectId}/aneksy`, label: "Aneksy" },
          { href: `/dashboard/contractor/projects/${projectId}/obecnosc`, label: "Obecność" },
          { href: `/dashboard/contractor/projects/${projectId}/rfi`, label: "RFI" },
          { href: `/dashboard/contractor/projects/${projectId}/spotkania`, label: "Spotkania" },
          { href: `/dashboard/contractor/projects/${projectId}/ryzyka`, label: "Ryzyka" },
          { href: `/dashboard/contractor/projects/${projectId}/zamowienia`, label: "Zamówienia" },
          { href: `/dashboard/contractor/projects/${projectId}/podwykonawcy`, label: "Podwykonawcy" },
          { href: `/dashboard/contractor/projects/${projectId}/inspekcje`, label: "Inspekcje" },
          { href: `/dashboard/contractor/projects/${projectId}/obserwacje`, label: "Obserwacje" },
          { href: `/dashboard/contractor/projects/${projectId}/sprzet`, label: "Sprzęt" },
          { href: `/dashboard/contractor/projects/${projectId}/raporty`, label: "Raporty" },
          { href: `/dashboard/contractor/projects/${projectId}/submittals`, label: "Submittals" },
          { href: `/dashboard/contractor/projects/${projectId}/korespondencja`, label: "Korespondencja" },
          { href: `/dashboard/contractor/projects/${projectId}/galeria`, label: "Galeria" },
          { href: `/dashboard/contractor/projects/${projectId}/bhp`, label: "BHP" },
          { href: `/dashboard/contractor/projects/${projectId}/gwarancje`, label: "Gwarancje" },
          { href: `/dashboard/contractor/projects/${projectId}/zadania`, label: "Zadania" },
          { href: `/dashboard/contractor/projects/${projectId}/rfq`, label: "ZO/RFQ" },
          { href: `/dashboard/contractor/projects/${projectId}/kaucja`, label: "Kaucja" },
          { href: `/dashboard/contractor/projects/${projectId}/wypadki`, label: "Wypadki" },
          { href: `/dashboard/contractor/projects/${projectId}/koszty`, label: "Koszty zadań" },
          { href: `/dashboard/contractor/projects/${projectId}/kalendarz`, label: "Kalendarz" },
          { href: `/dashboard/contractor/projects/${projectId}/milestones`, label: "Kamienie milowe" },
          { href: `/dashboard/contractor/projects/${projectId}/portal-inwestora`, label: "Portal inwestora" },
          { href: `/dashboard/contractor/projects/${projectId}/evm`, label: "EVM" },
          { href: `/dashboard/contractor/projects/${projectId}/rysunki`, label: "Rysunki" },
          { href: `/dashboard/contractor/projects/${projectId}/przedmiar`, label: "Przedmiar" },
        ]
      : [
          { href: `/dashboard/investor/projects/${projectId}`, label: "Postęp" },
          { href: `/dashboard/investor/projects/${projectId}/punch`, label: "Usterki" },
          { href: `/dashboard/investor/projects/${projectId}/wiadomosci`, label: "Wiadomości" },
        ];

  return (
    <div className="flex gap-1 border-b pb-0">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "rounded-t px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border border-b-0 border-border bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
