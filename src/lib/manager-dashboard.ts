import { supabase } from "@/lib/supabase-client";
import {
  dateInPeriod,
  loadOpenAccountingPeriod,
  reportDate,
  toPeriodRange,
} from "@/lib/accounting-periods";

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const toNumber = (value: unknown) => Number(value ?? 0) || 0;
const monthKey = (date: string) => MONTH_LABELS[new Date(date).getMonth()] ?? "Jan";

export type ManagerMonthlyPoint = {
  month: string;
  investments: number;
  expenses: number;
};

export type ManagerDashboardData = {
  locationName: string;
  hasLocation: boolean;
  posStockQty: number;
  investmentTotal: number;
  expensesTotal: number;
  salesRevenue: number;
  netProfit: number;
  productsSold: number;
  stockLines: number;
  lowStock: number;
  outOfStock: number;
  reportsCount: number;
  monthlyPoints: ManagerMonthlyPoint[];
  recentInvestments: { id: string; date: string; total: number; notes: string | null }[];
  recentExpenses: { id: string; date: string; category: string; amount: number }[];
  recentReports: {
    id: string;
    weekStart: string;
    weekEnd: string;
    productsSold: number;
    totalRevenue: number;
    status: string;
  }[];
};

const emptyMonthly = () =>
  MONTH_LABELS.map((month) => ({ month, investments: 0, expenses: 0 }));

export async function loadManagerDashboard(managerId: string, locationId?: string) {
  const openPeriod = await loadOpenAccountingPeriod();
  const period = toPeriodRange(openPeriod);

  const [
    locationResult,
    stockResult,
    productsResult,
    investmentsResult,
    expensesResult,
    reportsResult,
  ] = await Promise.all([
    locationId
      ? supabase.from("locations").select("id, name").eq("id", locationId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    locationId
      ? supabase
          .from("inventory_stock")
          .select("erp_product_id, product_id, quantity")
          .eq("location_id", locationId)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("erp_products").select("id, unit_purchase_price, min_stock"),
    supabase.from("manager_investments").select("id, date, total_amount, notes").eq("manager_id", managerId),
    supabase.from("global_expenses").select("id, date, category, amount").eq("recorded_by", managerId),
    supabase
      .from("manager_reports")
      .select(
        "id, week_start_date, week_end_date, products_sold, total_revenue, status, created_at",
      )
      .eq("manager_id", managerId),
  ]);

  const products = productsResult.data ?? [];
  const stocks = stockResult.data ?? [];
  const investments = (investmentsResult.data ?? []).filter((row) =>
    period ? dateInPeriod(String(row.date ?? ""), period) : true,
  );
  const expenses = (expensesResult.data ?? []).filter((row) =>
    period ? dateInPeriod(String(row.date ?? ""), period) : true,
  );
  const reports = (reportsResult.data ?? []).filter((row) =>
    period ? dateInPeriod(reportDate(row), period) : true,
  );
  const productById = new Map(products.map((p) => [p.id, p] as const));

  const posStockQty = stocks.reduce((sum, row) => sum + toNumber(row.quantity), 0);

  let lowStock = 0;
  let outOfStock = 0;
  for (const row of stocks) {
    const qty = toNumber(row.quantity);
    const productId = row.erp_product_id || row.product_id;
    const min = productId ? toNumber(productById.get(productId)?.min_stock) || 10 : 10;
    if (qty <= 0) outOfStock += 1;
    else if (qty <= min) lowStock += 1;
  }

  const monthlyMap = emptyMonthly().reduce<Record<string, ManagerMonthlyPoint>>((acc, point) => {
    acc[point.month] = { ...point };
    return acc;
  }, {});

  investments.forEach((row) => {
    const month = monthKey(String(row.date ?? ""));
    monthlyMap[month].investments += toNumber(row.total_amount);
  });

  expenses.forEach((row) => {
    const month = monthKey(String(row.date ?? ""));
    monthlyMap[month].expenses += toNumber(row.amount);
  });

  const recentInvestments = [...investments]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 5)
    .map((row) => ({
      id: row.id,
      date: String(row.date ?? ""),
      total: toNumber(row.total_amount),
      notes: row.notes ?? null,
    }));

  const recentExpenses = [...expenses]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 5)
    .map((row) => ({
      id: row.id,
      date: String(row.date ?? ""),
      category: String(row.category ?? ""),
      amount: toNumber(row.amount),
    }));

  const recentReports = [...reports]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 5)
    .map((row) => ({
      id: row.id,
      weekStart: String(row.week_start_date ?? ""),
      weekEnd: String(row.week_end_date ?? ""),
      productsSold: toNumber(row.products_sold),
      totalRevenue: toNumber(row.total_revenue),
      status: row.status || "submitted",
    }));

  const investmentTotal = investments.reduce((sum, row) => sum + toNumber(row.total_amount), 0);
  const expensesTotal = expenses
    .filter((row) => row.category !== "stock_purchase" && row.category !== "investment")
    .reduce((sum, row) => sum + toNumber(row.amount), 0);
  const salesRevenue = reports.reduce((sum, row) => sum + toNumber(row.total_revenue), 0);
  const netProfit = salesRevenue - investmentTotal - expensesTotal;

  return {
    locationName: locationResult.data?.name || "Non assigné",
    hasLocation: Boolean(locationId),
    posStockQty,
    investmentTotal,
    expensesTotal,
    salesRevenue,
    netProfit,
    productsSold: reports.reduce((sum, row) => sum + toNumber(row.products_sold), 0),
    stockLines: stocks.length,
    lowStock,
    outOfStock,
    reportsCount: reports.length,
    monthlyPoints: MONTH_LABELS.map((month) => monthlyMap[month]),
    recentInvestments,
    recentExpenses: recentExpenses.filter(
      (row) => row.category !== "stock_purchase" && row.category !== "investment",
    ),
    recentReports,
  } satisfies ManagerDashboardData;
}
