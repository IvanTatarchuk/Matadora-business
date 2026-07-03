// Smoke test for Phase 3 (material import schema + RLS) against the live
// Supabase project, exercising suppliers / materials_catalog / price_history /
// import_jobs as a real signed-up wholesaler.
//   node scripts/smoke-import.mjs
import { createClient } from "@supabase/supabase-js";
import { loadEnv, getEnv } from "./load-env.mjs";

const env = loadEnv();
const url = getEnv("NEXT_PUBLIC_SUPABASE_URL", env);
const anon =
  getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", env) ??
  getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", env);

const stamp = Date.now();
let seq = 0;
const ok = (m) => console.log("  OK:", m);
const fail = (m, e) => {
  console.error("  FAIL:", m, e?.message ?? e);
  process.exitCode = 1;
};

async function signUp(role) {
  const c = createClient(url, anon);
  const email = `smoke_${role}_${stamp}_${seq++}@example.com`;
  const { data, error } = await c.auth.signUp({
    email,
    password: "Passw0rd!" + stamp,
    options: { data: { role, full_name: `${role} ${stamp}` } },
  });
  if (error) throw new Error(`signUp ${role}: ${error.message}`);
  if (!data.session) throw new Error(`signUp ${role}: no session`);
  return { client: c, user: data.user, email };
}

console.log("Phase 3 import smoke test —", url);

const ws = await signUp("wholesaler");
ok(`wholesaler signed up (${ws.email})`);

// 1) Create a supplier
let supplierId;
{
  const { data, error } = await ws.client
    .from("suppliers")
    .insert({ owner_id: ws.user.id, name: `PSB ${stamp}` })
    .select("id")
    .single();
  if (error) fail("create supplier", error);
  else { supplierId = data.id; ok(`supplier created (${supplierId})`); }
}

// 2) Insert two catalog rows (as a CSV import would)
const ids = [];
for (const [i, sku] of [["A-100"], ["A-200"]].entries()) {
  const { data, error } = await ws.client
    .from("materials_catalog")
    .insert({
      wholesaler_id: ws.user.id,
      product_name: `Material ${i} ${stamp}`,
      sku: `${sku}-${stamp}`,
      external_id: `EXT-${i}-${stamp}`,
      price_net: 10 + i,
      unit: "szt",
      stock_status: "in_stock",
      supplier_id: supplierId,
      source: "csv",
      price_updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) fail(`insert material ${i}`, error);
  else ids.push(data.id);
}
if (ids.length === 2) ok("two catalog rows imported (source=csv)");

// 3) Price history
if (ids.length === 2) {
  const { error } = await ws.client.from("price_history").insert(
    ids.map((id, i) => ({
      material_id: id,
      wholesaler_id: ws.user.id,
      price_net: 10 + i,
    }))
  );
  if (error) fail("insert price_history", error);
  else ok("price history recorded");
}

// 4) Import job audit row
{
  const { error } = await ws.client.from("import_jobs").insert({
    wholesaler_id: ws.user.id,
    supplier_id: supplierId,
    filename: "prices.csv",
    total_rows: 2,
    created_count: 2,
    updated_count: 0,
  });
  if (error) fail("insert import_job", error);
  else ok("import job logged");
}

// 5) Read back catalog
{
  const { data, error } = await ws.client
    .from("materials_catalog")
    .select("id, source, supplier_id")
    .eq("wholesaler_id", ws.user.id);
  if (error) fail("read catalog", error);
  else if ((data ?? []).filter((r) => r.source === "csv").length >= 2)
    ok("catalog readable with csv source");
  else fail("imported rows not found");
}

// 6) Negative: a second wholesaler cannot see the first's suppliers/jobs
const intruder = await signUp("wholesaler");
{
  const { data: sup } = await intruder.client
    .from("suppliers").select("id").eq("id", supplierId);
  if (!sup || sup.length === 0) ok("RLS hides supplier from other wholesaler");
  else fail("RLS leak: supplier visible to other wholesaler");

  const { data: jobs } = await intruder.client
    .from("import_jobs").select("id").eq("wholesaler_id", ws.user.id);
  if (!jobs || jobs.length === 0) ok("RLS hides import_jobs from others");
  else fail("RLS leak: import_jobs visible to others");
}

console.log(process.exitCode ? "\nSMOKE TEST FAILED" : "\nSMOKE TEST PASSED");
