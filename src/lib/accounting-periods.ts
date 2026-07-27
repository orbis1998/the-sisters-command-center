import { supabase } from "@/lib/supabase-client";

export type AccountingPeriod = {
  id: string;
  label: string;
  start_date: string;
  end_date: string | null;
  status: "open" | "closed";
  closed_at: string | null;
  notes: string | null;
  created_at: string;
};

export type PeriodSnapshot = {
  id: string;
  period_id: string;
  depot_revenue: number;
  sales_revenue: number;
  operating_expenses: number;
  total_revenue: number;
  profit: number;
  global_stock_qty: number;
  pos_stock_qty: number;
  snapshot_at: string;
};

export type PeriodRange = {
  startDate: string;
  endDate: string | null;
  label: string;
};

export function dateInPeriod(date: string | null | undefined, period: PeriodRange): boolean {
  if (!date) return false;
  const d = String(date).slice(0, 10);
  if (d < period.startDate) return false;
  if (period.endDate && d > period.endDate) return false;
  return true;
}

export function reportDate(report: {
  week_end_date?: string | null;
  week_start_date?: string | null;
  created_at?: string | null;
}) {
  return String(report.week_end_date || report.week_start_date || report.created_at || "").slice(0, 10);
}

export async function loadOpenAccountingPeriod(): Promise<AccountingPeriod | null> {
  const { data } = await supabase
    .from("accounting_periods")
    .select("id, label, start_date, end_date, status, closed_at, notes, created_at")
    .eq("status", "open")
    .maybeSingle();

  return (data as AccountingPeriod | null) ?? null;
}

export async function loadAccountingPeriods(): Promise<AccountingPeriod[]> {
  const { data } = await supabase
    .from("accounting_periods")
    .select("id, label, start_date, end_date, status, closed_at, notes, created_at")
    .order("start_date", { ascending: false });

  return (data || []) as AccountingPeriod[];
}

export async function loadPeriodSnapshots(periodIds: string[]): Promise<PeriodSnapshot[]> {
  if (!periodIds.length) return [];

  const { data } = await supabase
    .from("accounting_period_snapshots")
    .select(
      "id, period_id, depot_revenue, sales_revenue, operating_expenses, total_revenue, profit, global_stock_qty, pos_stock_qty, snapshot_at",
    )
    .in("period_id", periodIds);

  return (data || []).map((row) => ({
    id: row.id,
    period_id: row.period_id,
    depot_revenue: Number(row.depot_revenue || 0),
    sales_revenue: Number(row.sales_revenue || 0),
    operating_expenses: Number(row.operating_expenses || 0),
    total_revenue: Number(row.total_revenue || 0),
    profit: Number(row.profit || 0),
    global_stock_qty: Number(row.global_stock_qty || 0),
    pos_stock_qty: Number(row.pos_stock_qty || 0),
    snapshot_at: String(row.snapshot_at ?? ""),
  }));
}

export function toPeriodRange(period: AccountingPeriod | null): PeriodRange | null {
  if (!period) return null;
  return {
    startDate: String(period.start_date).slice(0, 10),
    endDate: period.end_date ? String(period.end_date).slice(0, 10) : null,
    label: period.label,
  };
}

export async function closeAccountingPeriod(periodId: string, endDate: string, notes?: string) {
  const { data, error } = await supabase.rpc("close_accounting_period", {
    p_period_id: periodId,
    p_end_date: endDate,
    p_notes: notes || null,
  });

  if (error) throw error;
  return data as string;
}
