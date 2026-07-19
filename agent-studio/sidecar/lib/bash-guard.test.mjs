// agent-studio/sidecar/lib/bash-guard.test.mjs
//
// Standalone test script (no test framework / no deps) proving the
// PreToolUse guard actually blocks dangerous commands and actually allows
// safe ones. Run directly:
//
//   node agent-studio/sidecar/lib/bash-guard.test.mjs
//
// Exits 0 with all assertions passing, exits 1 (and prints every failure)
// otherwise.

import { evaluateBashCommand } from "./bash-guard.mjs";

const cases = [
  // --- must be BLOCKED ---------------------------------------------------
  { cmd: "git push origin main", blocked: true, category: "push-protected-branch" },
  { cmd: "git push", blocked: true, category: "push-protected-branch" },
  { cmd: "git push origin production", blocked: true, category: "push-protected-branch" },
  { cmd: "git push --force origin main", blocked: true, category: "push-protected-branch" },
  { cmd: "git merge feature/x", blocked: true, category: "merge" },
  { cmd: "git merge --abort", blocked: true, category: "merge" },
  { cmd: "gh pr merge 42 --squash", blocked: true, category: "merge" },
  { cmd: "npm run db:migrate", blocked: true, category: "db-migration" },
  { cmd: "npm run db:apply supabase/migrations/0099_x.sql", blocked: true, category: "db-migration" },
  { cmd: "vercel --prod", blocked: true, category: "vercel-deploy" },
  { cmd: "npx vercel deploy", blocked: true, category: "vercel-deploy" },
  { cmd: "npm run build && vercel --prod", blocked: true, category: "vercel-deploy" },
  { cmd: "gh release create v1.0.0", blocked: true, category: "gh-release" },
  {
    cmd: 'echo "key=REDACTED_TEST_FIXTURE_NOT_A_REAL_KEY"',
    blocked: true,
    category: "stripe-secret-key",
  },
  {
    cmd: 'export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiJ9.eyJzZXJ2aWNlX3JvbGUiOnRydWV9.sig123"',
    blocked: true,
    category: "supabase-service-role-key",
  },
  {
    cmd: 'curl -X POST https://api.resend.com/emails -d "to=user@example.com&subject=hi"',
    blocked: true,
    category: "real-send-email-sms",
  },
  {
    cmd: "curl -X POST https://api.twilio.com/2010-04-01/Accounts/AC1/Messages.json -d 'To=+15551234'",
    blocked: true,
    category: "real-send-email-sms",
  },

  // --- must be ALLOWED -----------------------------------------------------
  { cmd: "npm run typecheck", blocked: false },
  { cmd: "npm run lint", blocked: false },
  { cmd: "npm run build", blocked: false },
  { cmd: "git status", blocked: false },
  { cmd: "git add -A", blocked: false },
  { cmd: 'git commit -m "add worktree changes"', blocked: false },
  { cmd: "git push origin agent/task-123", blocked: false },
  { cmd: "git log --oneline -5", blocked: false },
  { cmd: "git merge-base main HEAD", blocked: false },
  { cmd: "cat vercel.json", blocked: false },
  { cmd: "grep -r vercel .", blocked: false },
  {
    cmd: 'curl -X POST https://api.resend.com/emails -d "draft=true&to=user@example.com"',
    blocked: false,
  },
  { cmd: "npm run test", blocked: false },
  { cmd: "ls -la src/lib/actions", blocked: false },
];

let failures = 0;

for (const { cmd, blocked, category } of cases) {
  const verdict = evaluateBashCommand(cmd);
  const ok =
    verdict.blocked === blocked && (category === undefined || verdict.category === category);
  const label = ok ? "PASS" : "FAIL";
  if (!ok) failures++;
  console.log(
    `[${label}] blocked=${verdict.blocked} category=${verdict.category ?? "-"} :: ${cmd}`
  );
  if (!ok) {
    console.log(
      `       expected blocked=${blocked}${category ? ` category=${category}` : ""}`
    );
  }
}

console.log(`\n${cases.length - failures}/${cases.length} passed.`);

if (failures > 0) {
  console.error(`${failures} test case(s) FAILED.`);
  process.exit(1);
} else {
  console.log("All bash-guard test cases passed.");
  process.exit(0);
}
