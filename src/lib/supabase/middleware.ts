import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/database";
import type { UserRole } from "@/types/database";

const ROLE_HOME: Record<UserRole, string> = {
  investor: "/dashboard/investor",
  contractor: "/dashboard/contractor",
  wholesaler: "/dashboard/wholesaler",
};

const PUBLIC_PATHS = ["/", "/login", "/register", "/auth", "/offer"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

/**
 * Refreshes the Supabase session cookie and enforces role-based routing.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Unauthenticated users hitting protected routes -> login
  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated users: enforce role-scoped dashboards
  if (user && pathname.startsWith("/dashboard")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role as UserRole | undefined;

    if (role) {
      const home = ROLE_HOME[role];
      const allowedPrefix = home;

      // If a user visits a dashboard area that is not theirs, redirect home.
      const isOtherRoleArea =
        pathname.startsWith("/dashboard/") &&
        !pathname.startsWith(allowedPrefix);

      if (pathname === "/dashboard" || isOtherRoleArea) {
        const url = request.nextUrl.clone();
        url.pathname = home;
        return NextResponse.redirect(url);
      }
    }
  }

  // Logged-in users shouldn't see auth pages
  if (user && (pathname === "/login" || pathname === "/register")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = (profile?.role as UserRole | undefined) ?? "investor";
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[role];
    return NextResponse.redirect(url);
  }

  void isPublic; // exported helper reserved for future granular checks

  return response;
}
