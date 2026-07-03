/**
 * Matadora email service — uses Resend REST API directly (no package needed).
 * Set RESEND_API_KEY in .env.local / Vercel env.
 * If the key is absent emails are silently skipped (dev-friendly).
 */

const RESEND_API = "https://api.resend.com/emails";
const FROM = "Matadora <no-reply@matadora.business>";

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return; // silent no-op in dev without key

  try {
    await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, ...payload }),
    });
  } catch {
    // Non-blocking — never crash the main action
  }
}

// ─── Typed helpers ────────────────────────────────────────────────────────────

export function emailNewBid(opts: {
  investorEmail: string;
  investorName: string;
  contractorName: string;
  projectTitle: string;
  offerTotal: number;
  offerUrl: string;
}) {
  return sendEmail({
    to: opts.investorEmail,
    subject: `💼 New bid on "${opts.projectTitle}"`,
    html: baseTemplate(`
      <h2>New bid received</h2>
      <p>Hello <strong>${opts.investorName}</strong>,</p>
      <p><strong>${opts.contractorName}</strong> has submitted a bid of
         <strong>${fmtUAH(opts.offerTotal)}</strong> on your project
         <em>${opts.projectTitle}</em>.</p>
      <a href="${opts.offerUrl}" class="btn">Review offer</a>
    `),
  });
}

export function emailOfferAccepted(opts: {
  contractorEmail: string;
  contractorName: string;
  projectTitle: string;
  investorName: string;
  dashboardUrl: string;
}) {
  return sendEmail({
    to: opts.contractorEmail,
    subject: `🎉 Offer accepted — "${opts.projectTitle}"`,
    html: baseTemplate(`
      <h2>Your offer was accepted!</h2>
      <p>Hello <strong>${opts.contractorName}</strong>,</p>
      <p><strong>${opts.investorName}</strong> accepted your offer for
         <em>${opts.projectTitle}</em>. The project is now active.</p>
      <a href="${opts.dashboardUrl}" class="btn">Open project</a>
    `),
  });
}

export function emailTaskAssigned(opts: {
  workerEmail: string;
  workerName: string;
  taskTitle: string;
  projectTitle: string;
  dueDate?: string | null;
  boardUrl: string;
}) {
  return sendEmail({
    to: opts.workerEmail,
    subject: `📋 New task: "${opts.taskTitle}"`,
    html: baseTemplate(`
      <h2>You have a new task</h2>
      <p>Hello <strong>${opts.workerName}</strong>,</p>
      <p>Task <strong>${opts.taskTitle}</strong> has been assigned to you on
         project <em>${opts.projectTitle}</em>.
         ${opts.dueDate ? `Due: <strong>${opts.dueDate}</strong>.` : ""}</p>
      <a href="${opts.boardUrl}" class="btn">View task</a>
    `),
  });
}

export function emailProgressUpdate(opts: {
  investorEmail: string;
  investorName: string;
  projectTitle: string;
  progress: number;
  note?: string | null;
  projectUrl: string;
}) {
  return sendEmail({
    to: opts.investorEmail,
    subject: `📊 Progress update — "${opts.projectTitle}" ${opts.progress}%`,
    html: baseTemplate(`
      <h2>Progress update</h2>
      <p>Hello <strong>${opts.investorName}</strong>,</p>
      <p>Project <em>${opts.projectTitle}</em> is now
         <strong>${opts.progress}% complete</strong>.</p>
      ${opts.note ? `<blockquote>${opts.note}</blockquote>` : ""}
      <a href="${opts.projectUrl}" class="btn">View progress</a>
    `),
  });
}

export function emailProjectComplete(opts: {
  investorEmail: string;
  investorName: string;
  projectTitle: string;
  projectUrl: string;
}) {
  return sendEmail({
    to: opts.investorEmail,
    subject: `✅ Project completed — "${opts.projectTitle}"`,
    html: baseTemplate(`
      <h2>Project completed 🎉</h2>
      <p>Hello <strong>${opts.investorName}</strong>,</p>
      <p>Your project <strong>${opts.projectTitle}</strong> has been marked as
         <strong>completed</strong> by the contractor.</p>
      <a href="${opts.projectUrl}" class="btn">View final report</a>
    `),
  });
}

export function emailPunchItemOpened(opts: {
  contractorEmail: string;
  contractorName: string;
  projectTitle: string;
  itemTitle: string;
  projectUrl: string;
}) {
  return sendEmail({
    to: opts.contractorEmail,
    subject: `🔴 Defect reported — "${opts.projectTitle}"`,
    html: baseTemplate(`
      <h2>New defect / punch item</h2>
      <p>Hello <strong>${opts.contractorName}</strong>,</p>
      <p>A new punch item <strong>"${opts.itemTitle}"</strong> was reported on
         <em>${opts.projectTitle}</em> and requires your attention.</p>
      <a href="${opts.projectUrl}" class="btn">View punch list</a>
    `),
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtUAH(n: number) {
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
    maximumFractionDigits: 0,
  }).format(n);
}

function baseTemplate(body: string) {
  return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body { margin:0; padding:0; background:#f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrapper { max-width:560px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.08); }
  .header { background:#0f172a; padding:24px 32px; }
  .header span { color:#f97316; font-weight:700; font-size:20px; letter-spacing:-.3px; }
  .content { padding:32px; color:#1e293b; line-height:1.6; }
  h2 { margin:0 0 16px; font-size:22px; color:#0f172a; }
  p { margin:0 0 12px; font-size:15px; }
  blockquote { border-left:3px solid #f97316; margin:16px 0; padding:8px 16px; background:#fff7ed; border-radius:0 8px 8px 0; font-style:italic; color:#7c3aed; }
  .btn { display:inline-block; margin-top:20px; background:#f97316; color:#fff !important; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:600; font-size:15px; }
  .footer { padding:20px 32px; background:#f8fafc; text-align:center; font-size:12px; color:#94a3b8; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header"><span>🏗 matadora.business</span></div>
  <div class="content">${body}</div>
  <div class="footer">Matadora · ConTech Platform · <a href="https://matadora.business" style="color:#f97316;">matadora.business</a></div>
</div>
</body>
</html>`;
}
