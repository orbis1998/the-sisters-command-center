import { supabase } from "@/lib/supabase-client";
import { isOperatingExpense } from "@/lib/accounting";
import {
  dateInPeriod,
  loadOpenAccountingPeriod,
  reportDate,
  toPeriodRange,
  type PeriodRange,
} from "@/lib/accounting-periods";
import { loadCeoPersonalExpenses, loadDepotExpenses } from "@/lib/extended-expenses";

export type MonthlyPoint = {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
};

export type AnnualPoint = {
  year: number;
  revenue: number;
  expenses: number;
  profit: number;
};

export type RecentReport = {
  id: string;
  manager: string;
  location: string;
  weekStart: string;
  weekEnd: string;
  productsSold: number;
  totalRevenue: number;
  status: string;
};

export type RecentExpense = {
  id: string;
  date: string;
  category: string;
  amount: number;
  location: string;
};

export type ExecutiveDashboardData = {
  globalStockQty: number;
  posStockQty: number;
  depotRevenue: number;
  salesRevenue: number;
  avgMarginPct: number;
  operatingExpenses: number;
  revenue: number;
  profit: number;
  managersCount: number;
  activeManagersCount: number;
  locationsCount: number;
  stockCount: number;
  lowStockCount: number;
  pendingReports: number;
  monthlyPoints: MonthlyPoint[];
  annualPoints: AnnualPoint[];
  recentReports: RecentReport[];
  recentExpenses: RecentExpense[];
  activePeriod: PeriodRange | null;
};

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const makeMonthlyMap = () =>
  MONTH_LABELS.reduce<Record<string, MonthlyPoint>>((acc, month) => {
    acc[month] = { month, revenue: 0, expenses: 0, profit: 0 };
    return acc;
  }, {});

const makeAnnualMap = () => new Map<number, AnnualPoint>();

const toNumber = (value: unknown) => Number(value ?? 0) || 0;
const monthKey = (date: string) => MONTH_LABELS[new Date(date).getMonth()] ?? "Jan";
const yearKey = (date: string) => new Date(date).getFullYear();

export async function loadExecutiveDashboard() {
  const openPeriod = await loadOpenAccountingPeriod();
  const period = toPeriodRange(openPeriod);

  const [
    productsResult,
    stockResult,
    expensesResult,
    reportsResult,
    depotReceiptsResult,
    locationsResult,
    managersResult,
    ceoPersonal,
    depotExpenseRows,
  ] = await Promise.all([
    supabase.from("erp_products").select("id, name, sku, unit_purchase_price, selling_price, global_qty, min_stock"),
    supabase.from("inventory_stock").select("erp_product_id, location_id, quantity"),
    supabase.from("global_expenses").select("id, date, category, amount, location_id"),
    supabase
      .from("manager_reports")
      .select(
        "id, manager_id, location_id, week_start_date, week_end_date, products_sold, total_revenue, retail_revenue, wholesale_revenue, status, created_at",
      ),
    supabase.from("depot_receipts").select("id, date, amount"),
    supabase.from("locations").select("id, name").neq("name", "DEPOT GLOBAL"),
    supabase.from("erp_managers").select("id, name, location_id, is_active"),
    loadCeoPersonalExpenses(500),
    loadDepotExpenses(500),
  ]);

  const products = productsResult.data ?? [];
  const stocks = stockResult.data ?? [];
  const expenses = expensesResult.data ?? [];
  const reports = reportsResult.data ?? [];
  const depotReceipts = depotReceiptsResult.data ?? [];
  const locations = locationsResult.data ?? [];
  const managers = managersResult.data ?? [];

  const managerById = new Map(managers.map((manager) => [manager.id, manager] as const));
  const locationById = new Map(locations.map((location) => [location.id, location] as const));

  const scopedDepotReceipts = period
    ? depotReceipts.filter((r) => dateInPeriod(String(r.date ?? ""), period))
    : depotReceipts;
  const scopedExpenses = period
    ? expenses.filter((e) => dateInPeriod(e.date, period))
    : expenses;
  const scopedReports = period
    ? reports.filter((r) => dateInPeriod(reportDate(r), period))
    : reports;
  const scopedCeo = period
    ? ceoPersonal.filter((e) => dateInPeriod(e.date, period))
    : ceoPersonal;
  const scopedDepotExpenses = period
    ? depotExpenseRows.filter((e) => dateInPeriod(e.date, period))
    : depotExpenseRows;

  const globalStockQty = products.reduce((sum, p) => sum + toNumber(p.global_qty), 0);
  const posStockQty = stocks.reduce((sum, s) => sum + toNumber(s.quantity), 0);

  const avgMarginPct = products.length
    ? products.reduce((sum, product) => {
        const purchase = toNumber(product.unit_purchase_price);
        const selling = toNumber(product.selling_price);
        if (!selling) return sum;
        return sum + ((selling - purchase) / selling) * 100;
      }, 0) / products.length
    : 0;

  const posOperating = scopedExpenses
    .filter((e) => isOperatingExpense(String(e.category)))
    .reduce((sum, row) => sum + toNumber(row.amount), 0);
  const ceoPersonalTotal = scopedCeo.reduce((sum, row) => sum + row.amount, 0);
  const depotExpenseTotal = scopedDepotExpenses.reduce((sum, row) => sum + row.amount, 0);
  const operatingExpenses = posOperating + ceoPersonalTotal + depotExpenseTotal;

  const depotRevenue = scopedDepotReceipts.reduce((sum, r) => sum + toNumber(r.amount), 0);
  const salesRevenue = scopedReports.reduce((sum, r) => sum + toNumber(r.total_revenue), 0);
  const revenue = depotRevenue + salesRevenue;
  const profit = revenue - operatingExpenses;

  const monthlyMap = makeMonthlyMap();
  const annualMap = makeAnnualMap();

  scopedReports.forEach((report) => {
    const month = monthKey(report.week_end_date || report.week_start_date || report.created_at);
    const year = yearKey(report.week_end_date || report.week_start_date || report.created_at);
    const reportRevenue = toNumber(report.total_revenue);

    monthlyMap[month].revenue += reportRevenue;
    monthlyMap[month].profit += reportRevenue;

    const yearly = annualMap.get(year) ?? { year, revenue: 0, expenses: 0, profit: 0 };
    yearly.revenue += reportRevenue;
    yearly.profit += reportRevenue;
    annualMap.set(year, yearly);
  });

  scopedDepotReceipts.forEach((receipt) => {
    const month = monthKey(String(receipt.date ?? ""));
    const year = yearKey(String(receipt.date ?? ""));
    const amount = toNumber(receipt.amount);

    monthlyMap[month].revenue += amount;
    monthlyMap[month].profit += amount;

    const yearly = annualMap.get(year) ?? { year, revenue: 0, expenses: 0, profit: 0 };
    yearly.revenue += amount;
    yearly.profit += amount;
    annualMap.set(year, yearly);
  });

  scopedExpenses.forEach((expense) => {
    if (!isOperatingExpense(String(expense.category))) return;
    const month = monthKey(expense.date);
    const year = yearKey(expense.date);
    const amount = toNumber(expense.amount);

    monthlyMap[month].expenses += amount;
    monthlyMap[month].profit -= amount;

    const yearly = annualMap.get(year) ?? { year, revenue: 0, expenses: 0, profit: 0 };
    yearly.expenses += amount;
    yearly.profit -= amount;
    annualMap.set(year, yearly);
  });

  scopedCeo.forEach((expense) => {
    const month = monthKey(expense.date);
    const year = yearKey(expense.date);
    monthlyMap[month].expenses += expense.amount;
    monthlyMap[month].profit -= expense.amount;
    const yearly = annualMap.get(year) ?? { year, revenue: 0, expenses: 0, profit: 0 };
    yearly.expenses += expense.amount;
    yearly.profit -= expense.amount;
    annualMap.set(year, yearly);
  });

  scopedDepotExpenses.forEach((expense) => {
    const month = monthKey(expense.date);
    const year = yearKey(expense.date);
    monthlyMap[month].expenses += expense.amount;
    monthlyMap[month].profit -= expense.amount;
    const yearly = annualMap.get(year) ?? { year, revenue: 0, expenses: 0, profit: 0 };
    yearly.expenses += expense.amount;
    yearly.profit -= expense.amount;
    annualMap.set(year, yearly);
  });

  const recentReports = [...scopedReports]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 5)
    .map((report) => {
      const manager = managerById.get(report.manager_id);
      const location = locationById.get(report.location_id);
      return {
        id: report.id,
        manager: manager?.name || "Manager",
        location: location?.name || "Point de vente",
        weekStart: String(report.week_start_date ?? ""),
        weekEnd: String(report.week_end_date ?? ""),
        productsSold: toNumber(report.products_sold),
        totalRevenue: toNumber(report.total_revenue),
        status: report.status || "submitted",
      };
    });

  const recentExpenses = [...scopedExpenses]
    .filter((e) => isOperatingExpense(String(e.category)))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 5)
    .map((expense) => ({
      id: expense.id,
      date: String(expense.date ?? ""),
      category: String(expense.category ?? ""),
      amount: toNumber(expense.amount),
      location: locationById.get(expense.location_id || "")?.name || "Global",
    }));

  const lowStockCount = products.filter(
    (p) => toNumber(p.global_qty) > 0 && toNumber(p.global_qty) <= toNumber(p.min_stock || 10),
  ).length;
  const pendingReports = scopedReports.filter((report) => report.status !== "approved").length;

  return {
    globalStockQty,
    posStockQty,
    depotRevenue,
    salesRevenue,
    avgMarginPct,
    operatingExpenses,
    revenue,
    profit,
    managersCount: managers.length,
    activeManagersCount: managers.filter((manager) => manager.is_active).length,
    locationsCount: locations.length,
    stockCount: products.length,
    lowStockCount,
    pendingReports,
    monthlyPoints: MONTH_LABELS.map((month) => monthlyMap[month]),
    annualPoints: [...annualMap.values()].sort((a, b) => a.year - b.year),
    recentReports,
    recentExpenses,
    activePeriod: period,
  } satisfies ExecutiveDashboardData;
}
