// Smoke test for Phase 5 (organizations, members, invitations, workers, crews).
//   node scripts/smoke-orgs.mjs
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

async function signUp(role, companyName, email) {
  const c = createClient(url, anon);
  email = email ?? `smoke_${role}_${stamp}_${seq++}@example.com`;
  const { data, error } = await c.auth.signUp({
    email,
    password: "Passw0rd!" + stamp,
    options: {
      data: { role, full_name: `${role} ${stamp}`, company_name: companyName },
    },
  });
  if (error) throw new Error(`signUp ${role}: ${error.message}`);
  if (!data.session) throw new Error(`signUp ${role}: no session`);
  return { client: c, user: data.user, email };
}

console.log("Phase 5 organizations smoke test —", url);

const owner = await signUp("contractor", "Owner Build Co");
ok(`owner signed up (${owner.email})`);

// Auto-created personal org via signup trigger
let orgId;
{
  const { data, error } = await owner.client
    .from("organization_members")
    .select("org_id, role, organizations(name)")
    .eq("user_id", owner.user.id);
  if (error) fail("read membership", error);
  const ownerRow = (data ?? []).find((m) => m.role === "owner");
  if (ownerRow) {
    orgId = ownerRow.org_id;
    const name = ownerRow.organizations?.name;
    if (name === "Owner Build Co")
      ok(`personal org auto-created ("${name}", owner)`);
    else fail(`org name mismatch: ${name}`);
  } else fail("no owner membership found");
}

// Workers + crews
let workerId, crewId;
if (orgId) {
  const { data, error } = await owner.client
    .from("workers")
    .insert({ org_id: orgId, full_name: "Jan Kowalski", specialty: "Mason" })
    .select("id")
    .single();
  if (error) fail("create worker", error);
  else { workerId = data.id; ok("worker created"); }
}
if (orgId) {
  const { data, error } = await owner.client
    .from("crews")
    .insert({ org_id: orgId, name: "Crew A", foreman_worker_id: workerId })
    .select("id")
    .single();
  if (error) fail("create crew", error);
  else { crewId = data.id; ok("crew created with foreman"); }
}
if (crewId && workerId) {
  const { error } = await owner.client
    .from("crew_members")
    .insert({ crew_id: crewId, worker_id: workerId });
  if (error) fail("add crew member", error);
  else ok("worker added to crew");
}

// Invitation flow
const invitee = await signUp("contractor", "Invitee Co");
{
  const { error } = await owner.client.from("organization_invitations").insert({
    org_id: orgId,
    email: invitee.email,
    role: "manager",
  });
  if (error) fail("create invitation", error);
  else ok("invitation created");
}

// Before acceptance: invitee cannot read the org's workers (RLS)
{
  const { data } = await invitee.client
    .from("workers")
    .select("id")
    .eq("org_id", orgId);
  if (!data || data.length === 0) ok("RLS hides workers from non-member");
  else fail("RLS leak: non-member saw workers");
}

// Accept (mirrors acceptInvitation: admin inserts membership + marks accepted)
{
  const { error } = await admin.from("organization_members").upsert(
    { org_id: orgId, user_id: invitee.user.id, role: "manager" },
    { onConflict: "org_id,user_id" }
  );
  if (error) fail("accept (insert membership)", error);
  else ok("invitee joined as manager");
}

// After acceptance: invitee can now read workers
{
  const { data } = await invitee.client
    .from("workers")
    .select("id")
    .eq("org_id", orgId);
  if ((data ?? []).length === 1) ok("member can read org workers");
  else fail("member could not read workers after joining");
}

// Outsider in a different org cannot read these workers
{
  const outsider = await signUp("contractor", "Outsider Co");
  const { data } = await outsider.client
    .from("workers")
    .select("id")
    .eq("org_id", orgId);
  if (!data || data.length === 0) ok("RLS blocks outsider org");
  else fail("RLS leak: outsider saw workers");
}

console.log(process.exitCode ? "\nSMOKE TEST FAILED" : "\nSMOKE TEST PASSED");
