// There is no 4th "admin" role in the schema (only investor/contractor/
// wholesaler) — deliberately, to avoid a migration just for this. Support
// staff/owner access is gated by an email allowlist instead, checked in the
// app layer wherever it matters (never in RLS — admin routes use the
// service-role client directly).

const DEFAULT_ADMIN_EMAILS = ["itatarchuk1202@gmail.com", "vanbud.felix@gmail.com"];

function adminEmails(): string[] {
  const fromEnv = process.env.SUPPORT_ADMIN_EMAILS;
  if (!fromEnv) return DEFAULT_ADMIN_EMAILS;
  return fromEnv.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isSupportAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}
