// End-to-end smoke test for Epic 1 (marketplace & bidding) against the live
// Supabase project, exercising RLS as real signed-up users.
//   node scripts/smoke-epic1.mjs
import { createClient } from "@supabase/supabase-js";
import { loadEnv, getEnv } from "./load-env.mjs";

const env = loadEnv();
const url = getEnv("NEXT_PUBLIC_SUPABASE_URL", env);
const anon =
  getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", env) ??
  getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", env);

const stamp = Date.now();
let seq = 0;
const mk = () => createClient(url, anon);
const ok = (m) => console.log("  OK:", m);
const fail = (m, e) => {
  console.error("  FAIL:", m, e?.message ?? e);
  process.exitCode = 1;
};

async function signUp(role) {
  const c = mk();
  const email = `smoke_${role}_${stamp}_${seq++}@example.com`;
  const { data, error } = await c.auth.signUp({
    email,
    password: "Passw0rd!" + stamp,
    options: { data: { role, full_name: `${role} ${stamp}` } },
  });
  if (error) throw new Error(`signUp ${role}: ${error.message}`);
  if (!data.session) throw new Error(`signUp ${role}: no session (autoconfirm off?)`);
  return { client: c, user: data.user, email };
}

console.log("Epic 1 smoke test —", url);

// 1) Investor signs up
const investor = await signUp("investor");
ok(`investor signed up (${investor.email})`);

// profile auto-created by trigger?
{
  const { data, error } = await investor.client
    .from("profiles").select("role").eq("id", investor.user.id).single();
  if (error) fail("investor profile lookup", error);
  else if (data.role !== "investor") fail(`investor role = ${data.role}`);
  else ok("investor profile auto-created with role=investor");
}

// 2) Investor publishes a project to the marketplace
let projectId;
{
  const { data, error } = await investor.client
    .from("projects")
    .insert({
      investor_id: investor.user.id,
      title: `Smoke project ${stamp}`,
      description: "Test renovation",
      category: "renovation",
      status: "open",
      budget_min: 1000,
      budget_max: 5000,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) fail("publish project", error);
  else { projectId = data.id; ok(`project published (${projectId})`); }
}

// 3) Contractor signs up
const contractor = await signUp("contractor");
ok(`contractor signed up (${contractor.email})`);

// 4) Contractor sees the open project on the marketplace
if (projectId) {
  const { data, error } = await contractor.client
    .from("projects").select("id,title,status").eq("id", projectId).single();
  if (error) fail("contractor read marketplace project", error);
  else if (data?.status === "open") ok("contractor sees open project on marketplace");
  else fail("project not visible/open to contractor");
}

// 5) Contractor submits a bid (offer)
let offerId;
if (projectId) {
  const { data, error } = await contractor.client
    .from("offers")
    .insert({
      project_id: projectId,
      contractor_id: contractor.user.id,
      title: `Bid ${stamp}`,
      total_net: 3000,
      total_gross: 3690,
      vat_rate: 23,
      status: "sent",
    })
    .select("id")
    .single();
  if (error) fail("contractor submit offer", error);
  else { offerId = data.id; ok(`offer submitted (${offerId})`); }
}

// 6) Investor sees the incoming offer on their project
if (offerId) {
  const { data, error } = await investor.client
    .from("offers").select("id,total_gross").eq("project_id", projectId);
  if (error) fail("investor read offers", error);
  else if (data.some((o) => o.id === offerId)) ok("investor sees contractor's offer");
  else fail("investor cannot see the offer (RLS?)");
}

// 7) Negative check: a second contractor must NOT see the bid amount
const intruder = await signUp("contractor");
if (offerId) {
  const { data } = await intruder.client
    .from("offers").select("id").eq("id", offerId);
  if (!data || data.length === 0) ok("RLS hides offer from unrelated contractor");
  else fail("RLS leak: unrelated contractor can read the offer");
}

console.log(process.exitCode ? "\nSMOKE TEST FAILED" : "\nSMOKE TEST PASSED");
