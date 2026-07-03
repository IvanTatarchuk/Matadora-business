// Read or update the project's Auth config via the Supabase Management API.
// Usage:
//   node scripts/auth-config.mjs                 # show current (subset)
//   node scripts/auth-config.mjs --autoconfirm   # enable signup auto-confirm
import { loadEnv, getEnv } from "./load-env.mjs";

const env = loadEnv();
const token = getEnv("SUPABASE_ACCESS_TOKEN", env);
const ref = (getEnv("NEXT_PUBLIC_SUPABASE_URL", env) ?? "").match(
  /https:\/\/([a-z0-9]+)\.supabase\.co/
)?.[1];

if (!token || !ref) {
  console.error("Need SUPABASE_ACCESS_TOKEN and NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

const api = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

if (process.argv.includes("--autoconfirm")) {
  const res = await fetch(api, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ mailer_autoconfirm: true }),
  });
  console.log("PATCH", res.status);
}

const cur = await fetch(api, { headers });
const j = await cur.json();
console.log({
  mailer_autoconfirm: j.mailer_autoconfirm,
  external_email_enabled: j.external_email_enabled,
  disable_signup: j.disable_signup,
});
