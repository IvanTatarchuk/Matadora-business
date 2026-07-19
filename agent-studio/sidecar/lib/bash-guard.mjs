// agent-studio/sidecar/lib/bash-guard.mjs
//
// Pattern-matching safety gate for Bash-like tool calls made by the
// feature-dev agent. This is NOT prompt-level guidance — it is invoked
// from a Claude Agent SDK `PreToolUse` hook (see feature-dev-agent.mjs)
// and can actually deny command execution, before the shell ever runs it.
//
// Kept dependency-free (no imports) so it can be required/imported and
// unit-tested in complete isolation — see bash-guard.test.mjs.
//
// Design note: every rule below is intentionally "fail closed" — when a
// command is ambiguous (e.g. a bare `git push` with no explicit branch),
// we block rather than guess it's safe. Over-blocking just means the
// agent's turn ends with a clear reason logged; under-blocking here means
// a real push to `main` or a real Stripe/Supabase secret leaving the
// sandbox. The asymmetry is deliberate.

const FORBIDDEN_BRANCHES = ["main", "master", "production", "prod"];

function mentionsForbiddenBranch(cmd) {
  return FORBIDDEN_BRANCHES.some((branch) =>
    new RegExp(`(^|[\\s/:])${branch}(\\s|$)`, "i").test(cmd)
  );
}

/**
 * Guard rules, evaluated in order. First match wins and short-circuits
 * the rest — `category` + `reason` are what gets surfaced to the log and
 * back to the SDK hook's `permissionDecisionReason`.
 */
const RULES = [
  {
    category: "push-protected-branch",
    reason:
      "git push targeting (or ambiguously not excluding) a protected branch " +
      "(main/master/production/prod) is never allowed from an agent session " +
      "— only the owner pushes to protected branches.",
    test(cmd) {
      if (!/\bgit\s+push\b/i.test(cmd)) return false;
      if (mentionsForbiddenBranch(cmd)) return true;
      // An explicit non-forbidden remote+ref pair (e.g. "origin agent/task-1")
      // was named -> this is a normal, safe agent-branch push.
      const hasExplicitRef = /\bgit\s+push\s+(--[\w-]+(=\S+)?\s+)*\S+\s+\S+/i.test(cmd);
      if (hasExplicitRef) return false;
      // Bare `git push` / `git push origin` with no branch pushes whatever
      // the current branch happens to be — ambiguous, so fail closed.
      return true;
    },
  },
  {
    category: "merge",
    reason:
      "Merging is a human-only action in this workflow — agents push a " +
      "branch and stop; the owner opens/merges the PR via the compare URL.",
    test(cmd) {
      // `(\s|$)` (not `\b`) so read-only plumbing like `git merge-base` /
      // `git merge-tree` isn't caught by this rule.
      return /\bgit\s+merge(\s|$)/i.test(cmd) || /\bgh\s+pr\s+merge\b/i.test(cmd);
    },
  },
  {
    category: "db-migration",
    reason:
      "db:apply / db:migrate applies schema changes directly — agents may " +
      "draft migration SQL but must never apply it themselves.",
    test(cmd) {
      return /\bdb:(apply|migrate)\b/i.test(cmd);
    },
  },
  {
    category: "vercel-deploy",
    reason:
      "Any invocation of the vercel CLI is a deploy-adjacent action reserved " +
      "for the human owner.",
    test(cmd) {
      // Match `vercel` in command position (start of string, or after a
      // shell separator/chain operator, optionally via `npx`) rather than
      // anywhere in the string, so reading a file like `vercel.json` isn't
      // flagged.
      return /(^|[;&|]\s*)(npx\s+)?vercel(\s|$)/i.test(cmd.trim());
    },
  },
  {
    category: "gh-release",
    reason:
      "gh release publishes a real GitHub release — reserved for the human owner.",
    test(cmd) {
      return /\bgh\s+release\b/i.test(cmd);
    },
  },
  {
    category: "stripe-secret-key",
    reason:
      "Command appears to reference a live/test Stripe secret or restricted " +
      "key literal — agents must never handle real Stripe credentials.",
    test(cmd) {
      return /\b(sk|rk)_(live|test)_[A-Za-z0-9]{8,}/i.test(cmd);
    },
  },
  {
    category: "supabase-service-role-key",
    reason:
      "Command appears to reference the Supabase service-role key (bypasses " +
      "RLS entirely) — agents must never handle this credential directly.",
    test(cmd) {
      const explicitEnvAssign = /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]?eyJ/i.test(cmd);
      if (explicitEnvAssign) return true;
      const jwtLike = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.test(cmd);
      const mentionsServiceRole = /service[_-]?role/i.test(cmd);
      return jwtLike && mentionsServiceRole;
    },
  },
  {
    category: "real-send-email-sms",
    reason:
      "Command looks like it sends a real email/SMS (provider API call, " +
      "SMTP, sendmail) outside a clearly-marked draft-only path.",
    test(cmd) {
      const looksLikeSend =
        /(api\.resend\.com|resend\.emails\.send|api\.twilio\.com|smtp:\/\/|\bsendmail\b|\bnodemailer\b|RESEND_API_KEY\s*=|twilio\(|messages\.create\()/i.test(
          cmd
        );
      if (!looksLikeSend) return false;
      // A command explicitly marked as draft-only (e.g. writing to a
      // drafts table/field, or a --draft/draft=true flag) is allowed —
      // this mirrors the marketing_drafts / admin_reply draft-before-send
      // pattern already used elsewhere in the product.
      const isDraftMarked = /\bdraft\b/i.test(cmd);
      return !isDraftMarked;
    },
  },
];

/**
 * Evaluate a proposed Bash-like command string.
 * @param {string} command
 * @returns {{ blocked: boolean, reason: string | null, category: string | null }}
 */
export function evaluateBashCommand(command) {
  if (typeof command !== "string" || command.trim() === "") {
    return { blocked: false, reason: null, category: null };
  }
  for (const rule of RULES) {
    if (rule.test(command)) {
      return { blocked: true, reason: rule.reason, category: rule.category };
    }
  }
  return { blocked: false, reason: null, category: null };
}
