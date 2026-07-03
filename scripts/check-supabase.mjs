// Quick connectivity + schema check for the Supabase cloud project.
// Usage: node scripts/check-supabase.mjs
// Reads .env.local (no extra deps), then verifies the REST API + a known table.
import { readFileSync } from "node:fs";

function loadEnv(file) {
  const env = {};
  let raw = "";
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    console.error(`Cannot read ${file}. Create it from .env.example first.`);
    process.exit(1);
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2];
  }
  return env;
}

const env = loadEnv(".env.local");
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || url.includes("YOUR-PROJECT") || !anon || anon.includes("YOUR-")) {
  console.error("Fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local first.");
  process.exit(1);
}

const endpoint = `${url.replace(/\/$/, "")}/rest/v1/profiles?select=id&limit=1`;
try {
  const res = await fetch(endpoint, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  });
  if (res.status === 200) {
    console.log("OK: connected and `profiles` table is reachable (RLS may hide rows — that's fine).");
  } else if (res.status === 401 || res.status === 403) {
    console.log("Connected, but request was unauthorized/forbidden (expected with RLS for anon). Schema is reachable.");
  } else if (res.status === 404) {
    console.error("Connected, but `profiles` table not found (404). Run the migration SQL first.");
    process.exit(2);
  } else {
    console.error(`Unexpected status ${res.status}: ${await res.text()}`);
    process.exit(2);
  }
} catch (e) {
  console.error("Connection failed:", e.message);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Schema probe: confirm migration 0003 (marketplace) columns exist.
// PostgREST validates the `select` against its schema cache BEFORE applying
// RLS, so a missing column yields HTTP 400 regardless of row visibility.
// ---------------------------------------------------------------------------
const base = url.replace(/\/$/, "");
const headers = { apikey: anon, Authorization: `Bearer ${anon}` };

async function probeColumns(table, cols) {
  const ep = `${base}/rest/v1/${table}?select=${cols.join(",")}&limit=0`;
  const r = await fetch(ep, { headers });
  if (r.status === 200 || r.status === 206) return { ok: true };
  if (r.status === 400) {
    const body = await r.text();
    return { ok: false, reason: body };
  }
  if (r.status === 401 || r.status === 403) return { ok: true, note: "RLS" };
  return { ok: false, reason: `HTTP ${r.status}: ${await r.text()}` };
}

try {
  const marketplace = await probeColumns("projects", [
    "id",
    "description",
    "category",
    "budget_min",
    "budget_max",
    "deadline",
    "published_at",
  ]);
  if (marketplace.ok) {
    console.log("OK: migration 0003 (marketplace) columns present on `projects`.");
  } else {
    console.error(
      "MISSING: marketplace columns not found on `projects`. Apply supabase/migrations/0003_marketplace.sql.\n" +
        (marketplace.reason || "")
    );
    process.exit(3);
  }
} catch (e) {
  console.error("Marketplace schema probe failed:", e.message);
  process.exit(1);
}
