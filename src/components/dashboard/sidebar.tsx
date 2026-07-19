"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HardHat,
  LayoutDashboard,
  FolderKanban,
  FileText,
  Package,
  ShoppingCart,
  Settings,
  Upload,
  Users,
  UsersRound,
  Building2,
  Search,
  FileSignature,
  ShieldCheck,
  AlertCircle,
  Lightbulb,
  TrendingUp,
  Wrench,
  BarChart3,
  Bell,
  Shield,
  CalendarDays,
  Receipt,
  BookOpen,
  Scale,
  LifeBuoy,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";
import type { UserRole } from "@/types/database";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV: Record<UserRole, NavItem[]> = {
  investor: [
    { href: "/dashboard/investor", label: "Przegląd", icon: LayoutDashboard },
    { href: "/dashboard/investor/projects", label: "Moje projekty", icon: FolderKanban },
    { href: "/dashboard/investor/offers", label: "Oferty", icon: FileText },
    { href: "/dashboard/prawnik-ai", label: "Adwokat AI", icon: Scale },
    { href: "/dashboard/team", label: "Zespół", icon: Building2 },
  ],
  contractor: [
    { href: "/dashboard/contractor", label: "Przegląd", icon: LayoutDashboard },
    { href: "/dashboard/analytics", label: "Analytics BI", icon: BarChart3 },
    { href: "/dashboard/contractor/insights", label: "Rekomendacje", icon: Lightbulb },
    { href: "/dashboard/prawnik-ai", label: "Adwokat AI", icon: Scale },
    { href: "/dashboard/contractor/projects", label: "Projekty", icon: FolderKanban },
    { href: "/dashboard/contractor/offers", label: "Kosztorysy", icon: FileText },
    { href: "/dashboard/contractor/protokoly", label: "Protokoły odbioru", icon: FileSignature },
    { href: "/dashboard/contractor/przetargi", label: "Przetargi AI", icon: Search },
    { href: "/dashboard/contractor/bhp", label: "BHP", icon: ShieldCheck },
    { href: "/dashboard/contractor/bhp/odprawy", label: "Odprawy BHP", icon: HardHat },
    { href: "/dashboard/brygady/planowanie", label: "Planowanie brygad", icon: CalendarDays },
    { href: "/dashboard/contractor/wezwania", label: "Wezwania do zapłaty", icon: AlertCircle },
    { href: "/dashboard/finanse/faktury", label: "Faktury", icon: Receipt },
    { href: "/dashboard/finanse/cashflow", label: "Cash Flow", icon: TrendingUp },
    { href: "/dashboard/cennik", label: "Cennik usług", icon: BookOpen },
    { href: "/dashboard/crm", label: "CRM — Leady", icon: TrendingUp },
    { href: "/dashboard/podwykonawcy", label: "Podwykonawcy", icon: Wrench },
    { href: "/dashboard/sprzet", label: "Sprzęt i maszyny", icon: Settings },
    { href: "/dashboard/kwalifikacje", label: "Kwalifikacje", icon: ShieldCheck },
    { href: "/dashboard/gwarancje", label: "Gwarancje", icon: Shield },
    { href: "/dashboard/powiadomienia", label: "Powiadomienia", icon: Bell },
    { href: "/dashboard/workers", label: "Pracownicy", icon: Users },
    { href: "/dashboard/crews", label: "Brygady", icon: UsersRound },
    { href: "/dashboard/team", label: "Firma", icon: Building2 },
  ],
  wholesaler: [
    { href: "/dashboard/wholesaler", label: "Przegląd", icon: LayoutDashboard },
    { href: "/dashboard/wholesaler/catalog", label: "Katalog", icon: Package },
    { href: "/dashboard/wholesaler/import", label: "Import", icon: Upload },
    { href: "/dashboard/wholesaler/orders", label: "Zamówienia", icon: ShoppingCart },
    { href: "/dashboard/prawnik-ai", label: "Adwokat AI", icon: Scale },
    { href: "/dashboard/team", label: "Firma", icon: Building2 },
  ],
};

export function Sidebar({ role, isAdmin = false }: { role: UserRole; isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = NAV[role];

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-secondary text-secondary-foreground md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-4 font-bold text-sm">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
          <HardHat className="h-4 w-4 text-white" />
        </div>
        <span>matadora<span className="text-primary">.business</span></span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== `/dashboard/${role}` &&
              pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-secondary-foreground/80 hover:bg-white/10"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/dashboard/settings")
              ? "bg-primary text-primary-foreground"
              : "text-secondary-foreground/80 hover:bg-white/10"
          )}
        >
          <Settings className="h-4 w-4" />
          Ustawienia
        </Link>
        {isAdmin && (
          <>
            <Link
              href="/dashboard/support-inbox"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/dashboard/support-inbox")
                  ? "bg-primary text-primary-foreground"
                  : "text-secondary-foreground/80 hover:bg-white/10"
              )}
            >
              <LifeBuoy className="h-4 w-4" />
              Skrzynka wsparcia
            </Link>
            <Link
              href="/dashboard/marketing"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/dashboard/marketing")
                  ? "bg-primary text-primary-foreground"
                  : "text-secondary-foreground/80 hover:bg-white/10"
              )}
            >
              <Megaphone className="h-4 w-4" />
              Marketing AI
            </Link>
          </>
        )}
      </nav>
      <div className="border-t border-white/10 p-4 text-xs text-secondary-foreground/60">
        <span className="capitalize">
          Panel {role === "contractor" ? "wykonawcy" : role === "investor" ? "inwestora" : "hurtowni"}
        </span>
        <Link href="/changelog" className="mt-1 block hover:text-secondary-foreground">
          matadora.business v{APP_VERSION}
        </Link>
      </div>
    </aside>
  );
}
