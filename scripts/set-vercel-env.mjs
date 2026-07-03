/**
 * Reads .env.local and upserts every key/value pair as a Vercel env var
 * (production + preview + development) via REST API — no stdin, no newline issues.
 *
 * Usage:  node scripts/set-vercel-env.mjs
 * Needs:  .vercel/project.json  +  VERCEL_TOKEN in env or ~/.local auth file
 */
import { readFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { homedir } from "os";

// ── Read Vercel token ────────────────────────────────────────────────────────
function getToken() {
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN;

  // Try ~/.local/share/com.vercel.cli/auth.json
  const paths = [
    join(homedir(), "AppData", "Roaming", "com.vercel.cli", "Data", "auth.json"),
    join(homedir(), ".local", "share", "com.vercel.cli", "auth.json"),
    join(homedir(), ".config", "vercel", "auth.json"),
    join(homedir(), "AppData", "Roaming", "com.vercel.cli", "auth.json"),
    join(homedir(), "AppData", "Local", "com.vercel.cli", "auth.json"),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        const data = JSON.parse(readFileSync(p, "utf8"));
        const token = data.token ?? Object.values(data)[0]?.token;
        if (token) return token;
      } catch {}
    }
  }
  throw new Error("No VERCEL_TOKEN found. Run `npx vercel login` first.");
}

// ── Read .env.local ──────────────────────────────────────────────────────────
function parseEnvFile(path) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const map = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    map[key] = val;
  }
  return map;
}

// ── Vercel REST ──────────────────────────────────────────────────────────────
async function upsertVar(projectId, orgId, token, key, value) {
  const url = `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${orgId}&upsert=true`;
  const body = JSON.stringify([
    { key, value, type: "encrypted", target: ["production", "preview", "development"] },
  ]);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed ${key}: ${res.status} ${text}`);
  }
  return res.json();
}

// ── Main ─────────────────────────────────────────────────────────────────────
const projectJson = JSON.parse(readFileSync(".vercel/project.json", "utf8"));
const { projectId, orgId } = projectJson;
const token = getToken();

const envPath = resolve(".env.local");
if (!existsSync(envPath)) {
  console.error("❌  .env.local not found");
  process.exit(1);
}

const vars = parseEnvFile(envPath);

// Override NEXT_PUBLIC_SITE_URL for production
vars["NEXT_PUBLIC_SITE_URL"] = "https://matadora.business";

console.log(`Setting ${Object.keys(vars).length} env vars on project ${projectId}…`);

for (const [key, value] of Object.entries(vars)) {
  try {
    await upsertVar(projectId, orgId, token, key, value);
    console.log(`  ✅  ${key}`);
  } catch (e) {
    console.error(`  ❌  ${key}: ${e.message}`);
  }
}

console.log("\nDone.");
