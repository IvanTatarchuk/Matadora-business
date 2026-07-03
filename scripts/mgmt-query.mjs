// Run SQL against the project's Postgres via the Supabase Management API.
// No DB password needed — uses SUPABASE_ACCESS_TOKEN (sbp_...).
//
// Usage:
//   node scripts/mgmt-query.mjs --file supabase/migrations/0003_marketplace.sql
//   node scripts/mgmt-query.mjs --sql "select 1"
import { readFileSync } from "node:fs";
import { loadEnv, getEnv } from "./load-env.mjs";

const fileEnv = loadEnv();
const token = getEnv("SUPABASE_ACCESS_TOKEN", fileEnv);
const url = getEnv("NEXT_PUBLIC_SUPABASE_URL", fileEnv);

if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN in .env.local");
  process.exit(1);
}
const ref = (url ?? "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
if (!ref) {
  console.error("Could not derive project ref from NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

const args = process.argv.slice(2);
let query = "";
const fileIdx = args.indexOf("--file");
const sqlIdx = args.indexOf("--sql");
if (fileIdx !== -1) query = readFileSync(args[fileIdx + 1], "utf8");
else if (sqlIdx !== -1) query = args[sqlIdx + 1];
else {
  console.error("Provide --file <path> or --sql <query>");
  process.exit(1);
}

export async function runQuery(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const text = await res.text();
  return { status: res.status, text };
}

const { status, text } = await runQuery(query);
if (status >= 200 && status < 300) {
  console.log(`OK (${status}):`, text.slice(0, 2000));
} else {
  console.error(`FAILED (${status}):`, text.slice(0, 2000));
  process.exit(2);
}
