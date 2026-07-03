import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Service-role client. SERVER-ONLY — never import into a Client Component.
 * Bypasses RLS, so use it narrowly (e.g. resolving a public offer by token).
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
