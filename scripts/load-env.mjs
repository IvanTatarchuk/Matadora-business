// Minimal .env.local loader (no external deps). Values already present in
// process.env take precedence over file values.
import { readFileSync } from "node:fs";

export function loadEnv(file = ".env.local") {
  const env = {};
  let raw = "";
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return env;
  }
  for (const line of raw.split(/\r?\n/)) {
    if (line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

/** Returns a value preferring process.env, then .env.local, else undefined. */
export function getEnv(name, fileEnv) {
  return process.env[name] ?? fileEnv[name];
}

/**
 * Resolves a Postgres connection string from the common env var names used in
 * this project: SUPABASE_DB_URL (preferred) or DATABASE_URL (Supabase pooler).
 */
export function getDbUrl(fileEnv) {
  return getEnv("SUPABASE_DB_URL", fileEnv) ?? getEnv("DATABASE_URL", fileEnv);
}
