/**
 * Matadora email service — uses Resend REST API directly (no package needed).
 * Set RESEND_API_KEY in .env.local / Vercel env.
 * If the key is absent emails are silently skipped (dev-friendly).
 */

import { formatPLN } from "@/lib/utils";

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
    subject: `💼 Nowa oferta na „${opts.projectTitle}”`,
    html: baseTemplate(`
      <h2>Otrzymano nową ofertę</h2>
      <p>Cześć <strong>${opts.investorName}</strong>,</p>
      <p><strong>${opts.contractorName}</strong> złożył ofertę na kwotę
         <strong>${formatPLN(opts.offerTotal)}</strong> dla Twojego projektu
         <em>${opts.projectTitle}</em>.</p>
      <a href="${opts.offerUrl}" class="btn">Zobacz ofertę</a>
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
    subject: `🎉 Oferta zaakceptowana — „${opts.projectTitle}”`,
    html: baseTemplate(`
      <h2>Twoja oferta została zaakceptowana!</h2>
      <p>Cześć <strong>${opts.contractorName}</strong>,</p>
      <p><strong>${opts.investorName}</strong> zaakceptował Twoją ofertę dla
         <em>${opts.projectTitle}</em>. Projekt jest teraz aktywny.</p>
      <a href="${opts.dashboardUrl}" class="btn">Otwórz projekt</a>
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
    subject: `📋 Nowe zadanie: „${opts.taskTitle}”`,
    html: baseTemplate(`
      <h2>Masz nowe zadanie</h2>
      <p>Cześć <strong>${opts.workerName}</strong>,</p>
      <p>Zadanie <strong>${opts.taskTitle}</strong> zostało Ci przypisane w
         projekcie <em>${opts.projectTitle}</em>.
         ${opts.dueDate ? `Termin: <strong>${opts.dueDate}</strong>.` : ""}</p>
      <a href="${opts.boardUrl}" class="btn">Zobacz zadanie</a>
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
    subject: `📊 Aktualizacja postępu — „${opts.projectTitle}” ${opts.progress}%`,
    html: baseTemplate(`
      <h2>Aktualizacja postępu</h2>
      <p>Cześć <strong>${opts.investorName}</strong>,</p>
      <p>Projekt <em>${opts.projectTitle}</em> jest ukończony w
         <strong>${opts.progress}%</strong>.</p>
      ${opts.note ? `<blockquote>${opts.note}</blockquote>` : ""}
      <a href="${opts.projectUrl}" class="btn">Zobacz postęp</a>
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
    subject: `✅ Projekt zakończony — „${opts.projectTitle}”`,
    html: baseTemplate(`
      <h2>Projekt zakończony 🎉</h2>
      <p>Cześć <strong>${opts.investorName}</strong>,</p>
      <p>Twój projekt <strong>${opts.projectTitle}</strong> został oznaczony jako
         <strong>zakończony</strong> przez wykonawcę.</p>
      <a href="${opts.projectUrl}" class="btn">Zobacz raport końcowy</a>
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
    subject: `🔴 Zgłoszono usterkę — „${opts.projectTitle}”`,
    html: baseTemplate(`
      <h2>Nowa usterka / pozycja z listy usterek</h2>
      <p>Cześć <strong>${opts.contractorName}</strong>,</p>
      <p>Nowa pozycja <strong>„${opts.itemTitle}”</strong> została zgłoszona w
         projekcie <em>${opts.projectTitle}</em> i wymaga Twojej uwagi.</p>
      <a href="${opts.projectUrl}" class="btn">Zobacz listę usterek</a>
    `),
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseTemplate(body: string) {
  return `<!DOCTYPE html>
<html lang="pl">
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
  <div class="footer">Matadora · Platforma ConTech · <a href="https://matadora.business" style="color:#f97316;">matadora.business</a></div>
</div>
</body>
</html>`;
}
