"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ShieldCheck, Bell, User, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard/settings", label: "Profil firmy", icon: Building2 },
  { href: "/dashboard/settings/ksef", label: "KSeF", icon: ShieldCheck },
  { href: "/dashboard/email-settings", label: "Email", icon: Bell },
  { href: "/dashboard/security", label: "Bezpieczeństwo", icon: User },
  { href: "/dashboard/geolocation", label: "Geolokalizacja", icon: Globe },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="w-64 shrink-0 space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
