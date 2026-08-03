import { supabase } from "@/lib/supabase-client";
import {
  dateInPeriod,
  loadOpenAccountingPeriod,
  reportDate,
  toPeriodRange,
  type PeriodRange,
} from "@/lib/accounting-periods";
import { loadOpeningForLocation } from "@/lib/pos-openings";

const toNumber = (value: unknown) => Number(value ?? 0) || 0;

/** Monday–Sunday week containing `date` (local calendar). */
export function weekRangeContaining(date = new Date()): { start: string; end: string } {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const iso = (x: Date) => {
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  return { start: iso(monday), end: iso(sunday) };
}

function dateInWeek(date: string | null | undefined, week: { start: string; end: string }) {
  if (!date) return false;
  const d = String(date).slice(0, 10);
  return d >= week.start && d <= week.end;
}

export type ManagerCashSnapshot = {
  weekStart: string;
  weekEnd: string;
  openingCa: number;
  openingCountsThisWeek: boolean;
  salesRevenue: number;
  expensesTotal: number;
  investmentTotal: number;
  transferTotal: number;
  assistanceReceived: number;
  /** Fonds restants cette semaine. */
  cashAvailable: number;
  hasPeriodOpening: boolean;
};

export async function loadManagerCash(
  managerId: string,
  locationId?: string | null,
  at: Date = new Date(),
): Promise<ManagerCashSnapshot> {
  const week = weekRangeContaining(at);
  const openPeriod = await loadOpenAccountingPeriod();
  const period = toPeriodRange(openPeriod);

  const [investmentsResult, expensesResult, reportsResult, transfersResult, assistResult, opening] =
    await Promise.all([
      supabase
        .from("manager_investments")
        .select("date, total_amount")
        .eq("manager_id", managerId),
      supabase
        .from("global_expenses")
        .select("date, category, amount")
        .eq("recorded_by", managerId),
      supabase
        .from("manager_reports")
        .select("week_start_date, week_end_date, created_at, total_revenue")
        .eq("manager_id", managerId),
      supabase
        .from("manager_cash_transfers")
        .select("date, amount")
        .eq("manager_id", managerId),
      locationId
        ? supabase
            .from("pos_financial_assistances")
            .select("date, amount, status")
            .eq("to_location_id", locationId)
            .eq("status", "completed")
        : Promise.resolve({ data: [] as { date: string; amount: number; status: string }[] }),
      locationId && openPeriod?.id
        ? loadOpeningForLocation(locationId, openPeriod.id).catch(() => null)
        : Promise.resolve(null),
    ]);

  const inScope = (date: string) => {
    if (period && !dateInPeriod(date, period)) return false;
    return dateInWeek(date, week);
  };

  const investments = (investmentsResult.data ?? []).filter((row) =>
    inScope(String(row.date ?? "")),
  );
  const expenses = (expensesResult.data ?? []).filter((row) => {
    const cat = String(row.category ?? "");
    if (cat === "stock_purchase" || cat === "investment") return false;
    return inScope(String(row.date ?? ""));
  });
  const reports = (reportsResult.data ?? []).filter((row) => inScope(reportDate(row)));
  const transfers = (transfersResult.data ?? []).filter((row) =>
    inScope(String(row.date ?? "")),
  );
  const assistReceived = (assistResult.data ?? []).filter((row) =>
    inScope(String(row.date ?? "")),
  );

  const openingCa = opening?.opening_ca ?? 0;
  const openingCountsThisWeek = Boolean(
    opening && dateInWeek(String(opening.created_at).slice(0, 10), week),
  );
  // First-week seed only; later weeks start from sales alone (caisse → 0).
  const openingInCash = openingCountsThisWeek ? openingCa : 0;

  const salesRevenue = reports.reduce((s, r) => s + toNumber(r.total_revenue), 0);
  const expensesTotal = expenses.reduce((s, r) => s + toNumber(r.amount), 0);
  const investmentTotal = investments.reduce((s, r) => s + toNumber(r.total_amount), 0);
  const transferTotal = transfers.reduce((s, r) => s + toNumber(r.amount), 0);
  const assistanceReceived = assistReceived.reduce((s, r) => s + toNumber(r.amount), 0);
  // Sender debit is already inside expensesTotal (category financial_assistance).
  const cashAvailable =
    openingInCash + salesRevenue + assistanceReceived - expensesTotal - investmentTotal - transferTotal;

  return {
    weekStart: week.start,
    weekEnd: week.end,
    openingCa,
    openingCountsThisWeek,
    salesRevenue,
    expensesTotal,
    investmentTotal,
    transferTotal,
    assistanceReceived,
    cashAvailable,
    hasPeriodOpening: Boolean(opening),
  };
}

/** Period-scoped totals (for history / charts), not the weekly caisse. */
export async function loadManagerPeriodCashTotals(
  managerId: string,
  period: PeriodRange | null,
) {
  const [{ data: investments }, { data: expenses }, { data: reports }, { data: transfers }] =
    await Promise.all([
      supabase.from("manager_investments").select("date, total_amount").eq("manager_id", managerId),
      supabase.from("global_expenses").select("date, category, amount").eq("recorded_by", managerId),
      supabase
        .from("manager_reports")
        .select("week_start_date, week_end_date, created_at, total_revenue")
        .eq("manager_id", managerId),
      supabase.from("manager_cash_transfers").select("date, amount").eq("manager_id", managerId),
    ]);

  const scoped = <T extends { date?: string | null }>(rows: T[] | null, getDate: (r: T) => string) =>
    (rows || []).filter((r) => (period ? dateInPeriod(getDate(r), period) : true));

  const inv = scoped(investments, (r) => String(r.date ?? ""));
  const exp = scoped(expenses, (r) => String(r.date ?? "")).filter((r) => {
    const cat = String(r.category ?? "");
    return cat !== "stock_purchase" && cat !== "investment";
  });
  const reps = (reports || []).filter((r) =>
    period ? dateInPeriod(reportDate(r), period) : true,
  );
  const tr = scoped(transfers, (r) => String(r.date ?? ""));

  return {
    investmentTotal: inv.reduce((s, r) => s + toNumber(r.total_amount), 0),
    expensesTotal: exp.reduce((s, r) => s + toNumber(r.amount), 0),
    salesRevenue: reps.reduce((s, r) => s + toNumber(r.total_revenue), 0),
    transferTotal: tr.reduce((s, r) => s + toNumber(r.amount), 0),
  };
}
