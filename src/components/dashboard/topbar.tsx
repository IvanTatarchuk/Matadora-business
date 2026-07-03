import { LogOut } from "lucide-react";

import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export function Topbar({
  name,
  subtitle,
}: {
  name: string;
  subtitle?: string;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div>
        <p className="font-semibold">{name}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <form action={logout}>
        <Button variant="ghost" size="sm" type="submit">
          <LogOut className="h-4 w-4" /> Wyloguj
        </Button>
      </form>
    </header>
  );
}
