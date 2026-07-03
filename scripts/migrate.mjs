// =============================================================================
// Migration agent — applies every supabase/migrations/*.sql that hasn't run yet.
//
// Credentials (read from .env.local or process.env), in priority order:
//   1) SUPABASE_DB_URL  = full postgres connection string (recommended)
//   2) SUPABASE_DB_PASSWORD (+ optional SUPABASE_DB_HOST / _PORT / _USER)
//      host defaults to db.<ref>.supabase.co derived from NEXT_PUBLIC_SUPABASE_URL
//
// Applied migrations are tracked in public.schema_migrations so re-runs are safe.
//
// Usage: node scripts/migrate.mjs
// =============================================================================
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";

import { loadEnv, getEnv, getDbUrl } from "./load-env.mjs";

const fileEnv = loadEnv();

function buildConnection() {
  const url = getDbUrl(fileEnv);
  if (url) return { connectionString: url, ssl: { rejectUnauthorized: false } };

  const password = getEnv("SUPABASE_DB_PASSWORD", fileEnv);
  if (!password) return null;

  let host = getEnv("SUPABASE_DB_HOST", fileEnv);
  if (!host) {
    const projectUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL", fileEnv) ?? "";
    const ref = projectUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!ref) return null;
    host = `db.${ref}.supabase.co`;
  }

  return {
    host,
    port: Number(getEnv("SUPABASE_DB_PORT", fileEnv) ?? 5432),
    user: getEnv("SUPABASE_DB_USER", fileEnv) ?? "postgres",
    database: "postgres",
    password,
    ssl: { rejectUnauthorized: false },
  };
}

const conn = buildConnection();
if (!conn) {
  console.error(
    "No DB credentials found. Add SUPABASE_DB_URL (or SUPABASE_DB_PASSWORD) to .env.local."
  );
  process.exit(1);
}

const MIGRATIONS_DIR = "supabase/migrations";
const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new pg.Client(conn);

try {
  await client.connect();
  console.log(`Connected to ${conn.host ?? "(connection string)"}.`);

  await client.query(`
    create table if not exists public.schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  // Baseline: migrations applied manually before this agent existed are
  // recognized by checking whether their core object already exists. This
  // avoids re-running non-idempotent migrations (e.g. 0001 CREATE TYPE).
  const baseline = {
    "0001_init_schema.sql": "public.projects",
    "0002_offer_materials.sql": "public.offer_materials",
  };
  for (const [name, obj] of Object.entries(baseline)) {
    const { rows: present } = await client.query(
      "select to_regclass($1) as t",
      [obj]
    );
    if (present[0].t) {
      await client.query(
        "insert into public.schema_migrations (name) values ($1) on conflict (name) do nothing",
        [name]
      );
    }
  }

  const { rows } = await client.query(
    "select name from public.schema_migrations"
  );
  const applied = new Set(rows.map((r) => r.name));

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip   ${file} (already applied)`);
      continue;
    }
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    process.stdout.write(`apply  ${file} ... `);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        "insert into public.schema_migrations (name) values ($1)",
        [file]
      );
      await client.query("commit");
      console.log("OK");
      count++;
    } catch (e) {
      await client.query("rollback");
      console.log("FAILED");
      console.error(`  -> ${e.message}`);
      process.exitCode = 2;
      break;
    }
  }

  if (process.exitCode !== 2) {
    console.log(
      count === 0
        ? "Up to date — no new migrations."
        : `Done — applied ${count} migration(s).`
    );
  }
} catch (e) {
  console.error("Connection/migration error:", e.message);
  process.exitCode = 2;
} finally {
  await client.end();
}
