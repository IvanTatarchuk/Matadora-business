"use server";

import { createClient } from "@/lib/supabase/server";
import { round2 } from "@/lib/utils";

const FORECAST_WEEKS = 8;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS_PL = ["Ndz", "Pon", "Wt", "Śr", "Czw", "Pt", "Sob"];

export type CashPositionWeek = {
  weekStart: string;
  label: string;
  expectedInflow: number;
  expectedOutflow: number;
  net: number;
  cumulative: number;
};

export type CashPositionForecast = {
  cashNow: number;
  weeks: CashPositionWeek[];
};

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + diff);
  return monday;
}

function formatWeekLabel(d: Date): string {
  return `${WEEKDAY_LABELS_PL[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}`;
}

/** Bucket index for a date relative to this week's Monday; overdue/undated fall into bucket 0. */
function bucketIndex(dateStr: string | null, thisWeekStart: Date): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const diffDays = Math.floor((d.getTime() - thisWeekStart.getTime()) / MS_PER_DAY);
  const idx = Math.floor(diffDays / 7);
  return Math.min(Math.max(idx, 0), FORECAST_WEEKS - 1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any;

export async function getCashPositionForecast(): Promise<CashPositionForecast | { error: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nie zalogowano" };
  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();
  if (!member) return { error: "Brak organizacji" };
  const orgId = member.org_id;

  const [cashflowRes, invoicesRes, retentionRes] = await Promise.all([
    db(supabase).from("cashflow_entries").select("type, actual_amount").eq("org_id", orgId).eq("is_confirmed", true),
    db(supabase)
      .from("invoices")
      .select("direction, net_amount, vat_rate, gross_amount, due_date, status")
      .eq("org_id", orgId)
      .in("status", ["unpaid", "partially_paid", "overdue", "sent"]),
    db(supabase)
      .from("retention_payments")
      .select("direction, retention_amount, released_amount, release_date, status")
      .eq("org_id", orgId)
      .in("status", ["held", "partially_released"]),
  ]);

  const cashNow = round2(
    (cashflowRes.data ?? []).reduce((sum: number, e: { type: string; actual_amount: number | null }) => {
      const amount = e.actual_amount ?? 0;
      return sum + (e.type === "inflow" ? amount : -amount);
    }, 0)
  );

  const thisWeekStart = startOfWeek(new Date());
  const weeks: CashPositionWeek[] = Array.from({ length: FORECAST_WEEKS }, (_, i) => {
    const start = new Date(thisWeekStart);
    start.setDate(start.getDate() + i * 7);
    return {
      weekStart: start.toISOString().slice(0, 10),
      label: formatWeekLabel(start),
      expectedInflow: 0,
      expectedOutflow: 0,
      net: 0,
      cumulative: 0,
    };
  });

  for (const inv of invoicesRes.data ?? []) {
    const gross = inv.gross_amount ?? round2(inv.net_amount * (1 + inv.vat_rate / 100));
    const week = weeks[bucketIndex(inv.due_date, thisWeekStart)]!;
    if (inv.direction === "outgoing") week.expectedInflow += gross;
    else week.expectedOutflow += gross;
  }

  for (const ret of retentionRes.data ?? []) {
    const remaining = round2((ret.retention_amount ?? 0) - (ret.released_amount ?? 0));
    if (remaining <= 0) continue;
    const week = weeks[bucketIndex(ret.release_date, thisWeekStart)]!;
    if (ret.direction === "held") week.expectedInflow += remaining;
    else week.expectedOutflow += remaining;
  }

  let cumulative = cashNow;
  for (const week of weeks) {
    week.expectedInflow = round2(week.expectedInflow);
    week.expectedOutflow = round2(week.expectedOutflow);
    week.net = round2(week.expectedInflow - week.expectedOutflow);
    cumulative = round2(cumulative + week.net);
    week.cumulative = cumulative;
  }

  return { cashNow, weeks };
}
