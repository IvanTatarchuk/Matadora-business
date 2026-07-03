// Smoke test for Phase 6 (project execution: tasks, updates, participant RLS).
//   node scripts/smoke-execution.mjs
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

console.log("Phase 6 execution smoke test —", url);

const investor = await signUp("investor");
const contractor = await signUp("contractor");
ok("investor + contractor signed up");

// Project assigned to contractor, in progress
let projectId;
{
  const { data } = await investor.client
    .from("projects")
    .insert({ investor_id: investor.user.id, title: `Exec ${stamp}`, status: "open" })
    .select("id")
    .single();
  projectId = data?.id;
  await admin
    .from("projects")
    .update({ contractor_id: contractor.user.id, status: "in_progress" })
    .eq("id", projectId);
  ok("project in_progress with contractor assigned");
}

// Contractor creates a task
let taskId;
{
  const { data, error } = await contractor.client
    .from("project_tasks")
    .insert({ project_id: projectId, title: "Foundation", progress: 0 })
    .select("id")
    .single();
  if (error) fail("contractor create task", error);
  else { taskId = data.id; ok("contractor created task"); }
}

// Investor (participant) can read the task
{
  const { data } = await investor.client
    .from("project_tasks")
    .select("id")
    .eq("project_id", projectId);
  if ((data ?? []).length === 1) ok("investor can read tasks");
  else fail("investor could not read tasks");
}

// Update task progress
if (taskId) {
  const { error } = await contractor.client
    .from("project_tasks")
    .update({ progress: 100, status: "done" })
    .eq("id", taskId);
  if (error) fail("update task progress", error);
  else ok("task progress updated to 100/done");
}

// Contractor posts a progress update
{
  const { error } = await contractor.client.from("project_updates").insert({
    project_id: projectId,
    author_id: contractor.user.id,
    note: "Concrete poured",
    progress: 50,
  });
  if (error) fail("post update", error);
  else ok("progress update posted");
}

// Outsider cannot read or write
{
  const outsider = await signUp("contractor");
  const { data: t } = await outsider.client
    .from("project_tasks")
    .select("id")
    .eq("project_id", projectId);
  if (!t || t.length === 0) ok("RLS hides tasks from non-participant");
  else fail("RLS leak: outsider read tasks");

  const { error } = await outsider.client
    .from("project_tasks")
    .insert({ project_id: projectId, title: "hack" });
  if (error) ok("RLS blocks task insert by non-participant");
  else fail("RLS leak: outsider inserted task");
}

console.log(process.exitCode ? "\nSMOKE TEST FAILED" : "\nSMOKE TEST PASSED");
