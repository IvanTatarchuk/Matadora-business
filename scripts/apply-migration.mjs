// Applies a .sql migration file to the Supabase Postgres database.
// Usage:
//   $env:SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres"
//   node scripts/apply-migration.mjs supabase/migrations/0002_offer_materials.sql
//
// The connection string is read from SUPABASE_DB_URL so the password is never
// written to a file. SSL is required by Supabase.
import { readFileSync } from "node:fs";
import pg from "pg";

import { loadEnv, getDbUrl } from "./load-env.mjs";

const fileEnv = loadEnv();
const connectionString = getDbUrl(fileEnv);
const file = process.argv[2];

if (!connectionString) {
  console.error("Missing SUPABASE_DB_URL or DATABASE_URL environment variable.");
  process.exit(1);
}
if (!file) {
  console.error("Usage: node scripts/apply-migration.mjs <path-to.sql>");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log(`Connected. Applying ${file} ...`);
  await client.query(sql);
  console.log("OK: migration applied successfully.");
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exitCode = 2;
} finally {
  await client.end();
}
