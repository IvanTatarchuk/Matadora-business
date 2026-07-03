// Smoke test for Phase 4 (reviews, rating aggregate trigger, RLS).
//   node scripts/smoke-trust.mjs
import { createClient } from "@supabase/supabase-js";
import { loadEnv, getEnv } from "./load-env.mjs";

const env = loadEnv();
const url = getEnv("NEXT_PUBLIC_SUPABASE_URL", env);
const anon =
  getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", env) ??
  getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", env);
const serviceKey =
  getEnv("SUPABASE_SECRET_KEY", env) ??
  getEnv("SUPABASE_SERVICE_ROLE_KEY", env);

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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

console.log("Phase 4 trust smoke test —", url);

const investor = await signUp("investor");
const contractor = await signUp("contractor");
ok("investor + contractor signed up");

// Project owned by investor, moved to in_progress with the contractor assigned
// (simulating an accepted offer).
let projectId;
{
  const { data, error } = await investor.client
    .from("projects")
    .insert({
      investor_id: investor.user.id,
      title: `Trust project ${stamp}`,
      status: "open",
    })
    .select("id")
    .single();
  if (error) fail("create project", error);
  else projectId = data.id;
}
if (projectId) {
  const { error } = await admin
    .from("projects")
    .update({ contractor_id: contractor.user.id, status: "in_progress" })
    .eq("id", projectId);
  if (error) fail("assign contractor", error);
  else ok("project in_progress with contractor assigned");
}

// Investor reviews the contractor (5 stars)
if (projectId) {
  const { error } = await investor.client.from("reviews").insert({
    project_id: projectId,
    reviewer_id: investor.user.id,
    reviewee_id: contractor.user.id,
    rating: 5,
    comment: "Excellent work",
  });
  if (error) fail("investor review contractor", error);
  else ok("investor posted 5★ review");
}

// Aggregate trigger updated the contractor's rating
{
  const { data } = await admin
    .from("profiles")
    .select("rating_avg, rating_count")
    .eq("id", contractor.user.id)
    .single();
  if (Number(data?.rating_avg) === 5 && data?.rating_count === 1)
    ok("rating aggregate updated (5.00 / 1)");
  else fail(`rating aggregate wrong: ${JSON.stringify(data)}`);
}

// Contractor reviews the investor (4 stars)
if (projectId) {
  const { error } = await contractor.client.from("reviews").insert({
    project_id: projectId,
    reviewer_id: contractor.user.id,
    reviewee_id: investor.user.id,
    rating: 4,
  });
  if (error) fail("contractor review investor", error);
  else ok("contractor posted 4★ review");
}

// Duplicate review by the same reviewer should be rejected (unique)
if (projectId) {
  const { error } = await investor.client.from("reviews").insert({
    project_id: projectId,
    reviewer_id: investor.user.id,
    reviewee_id: contractor.user.id,
    rating: 3,
  });
  if (error) ok("duplicate review blocked (unique constraint)");
  else fail("duplicate review was allowed");
}

// Outsider cannot review this project (RLS)
{
  const outsider = await signUp("investor");
  const { error } = await outsider.client.from("reviews").insert({
    project_id: projectId,
    reviewer_id: outsider.user.id,
    reviewee_id: contractor.user.id,
    rating: 1,
  });
  if (error) ok("RLS blocks review from non-participant");
  else fail("RLS leak: outsider could review");
}

console.log(process.exitCode ? "\nSMOKE TEST FAILED" : "\nSMOKE TEST PASSED");
