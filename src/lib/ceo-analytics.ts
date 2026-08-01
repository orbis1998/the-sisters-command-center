import { supabase } from "@/lib/supabase-client";
import { isOperatingExpense } from "@/lib/accounting";
import {
  dateInPeriod,
  loadOpenAccountingPeriod,
  reportDate,
  toPeriodRange,
} from "@/lib/accounting-periods";
import { loadCeoPersonalExpenses, loadDepotExpenses } from "@/lib/extended-expenses";
import { loadOpeningsForOpenPeriod } from "@/lib/pos-openings";

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const toNumber = (v: unknown) => Number(v ?? 0) || 0;
const yearKey = (date: string) => new Date(date).getFullYear();

export type AnalyticsProductRow = {
  productId: string;
  name: string;
  qtySold: number;
  revenue: number;
};

export type AnalyticsPosRow = {
  locationId: string;
  name: string;
  sales: number;
  expenses: number;
  appro: number;
  profit: number;
  productsSold: number;
};

export type AnalyticsMonthly = {
  month: string;
  monthIndex: number;
  revenue: number;
  expenses: number;
  payroll: number;
  profit: number;
};

export type AnalyticsAnnual = {
  year: number;
  revenue: number;
  expenses: number;
  payroll: number;
  profit: number;
};

export type CeoAnalyticsData = {
  periodLabel: string | null;
  totalRevenue: number;
  depotRevenue: number;
  salesRevenue: number;
  operatingExpenses: number;
  payrollTotal: number;
  profit: number;
  bestMonth: AnalyticsMonthly | null;
  bestYear: AnalyticsAnnual | null;
  topProducts: AnalyticsProductRow[];
  topPos: AnalyticsPosRow[];
  monthly: AnalyticsMonthly[];
  annual: AnalyticsAnnual[];
};

function isPayrollCategory(category: string) {
  return (
    category === "salary" ||
    category === "salaires_depot" ||
    category.includes("salaire") ||
    category.includes("salary")
  );
}

export async function loadCeoAnalytics(): Promise<CeoAnalyticsData> {
  const openPeriod = await loadOpenAccountingPeriod();
  const period = toPeriodRange(openPeriod);

  const [
    { data: locations },
    { data: reports },
    { data: salesLines },
    { data: products },
    { data: investments },
    { data: expenses },
    { data: depotReceipts },
    ceoPersonal,
    depotExpenses,
    { openings },
  ] = await Promise.all([
    supabase.from("locations").select("id, name").neq("name", "DEPOT GLOBAL"),
    supabase
      .from("manager_reports")
      .select(
        "id, location_id, total_revenue, products_sold, week_start_date, week_end_date, created_at",
      ),
    supabase
      .from("manager_report_sales")
      .select(
        "report_id, erp_product_id, retail_qty, wholesale_amount, retail_revenue, wholesale_qty",
      ),
    supabase.from("erp_products").select("id, name"),
    supabase.from("manager_investments").select("location_id, total_amount, date"),
    supabase.from("global_expenses").select("location_id, amount, category, date"),
    supabase.from("depot_receipts").select("amount, date"),
    loadCeoPersonalExpenses(500),
    loadDepotExpenses(500),
    loadOpeningsForOpenPeriod(),
  ]);

  const scopedReports = (reports || []).filter((r) =>
    period ? dateInPeriod(reportDate(r), period) : true,
  );
  const reportIds = new Set(scopedReports.map((r) => r.id));
  const scopedSales = (salesLines || []).filter((s) => reportIds.has(s.report_id));
  const scopedInv = (investments || []).filter((i) =>
    period ? dateInPeriod(String(i.date ?? ""), period) : true,
  );
  const scopedExp = (expenses || []).filter((e) =>
    period ? dateInPeriod(String(e.date ?? ""), period) : true,
  );
  const scopedDepot = (depotReceipts || []).filter((r) =>
    period ? dateInPeriod(String(r.date ?? ""), period) : true,
  );
  const scopedCeo = ceoPersonal.filter((e) => (period ? dateInPeriod(e.date, period) : true));
  const scopedDepotExp = depotExpenses.filter((e) =>
    period ? dateInPeriod(e.date, period) : true,
  );

  const openingCaTotal = openings.reduce((s, o) => s + o.opening_ca, 0);
  const salesRevenue =
    scopedReports.reduce((s, r) => s + toNumber(r.total_revenue), 0) + openingCaTotal;
  const depotRevenue = scopedDepot.reduce((s, r) => s + toNumber(r.amount), 0);

  const posOperating = scopedExp
    .filter((e) => isOperatingExpense(String(e.category)))
    .reduce((s, e) => s + toNumber(e.amount), 0);
  const ceoTotal = scopedCeo.reduce((s, e) => s + e.amount, 0);
  const depotExpTotal = scopedDepotExp.reduce((s, e) => s + e.amount, 0);
  const operatingExpenses = posOperating + ceoTotal + depotExpTotal;

  const payrollPos = scopedExp
    .filter((e) => isPayrollCategory(String(e.category)))
    .reduce((s, e) => s + toNumber(e.amount), 0);
  const payrollDepot = scopedDepotExp
    .filter((e) => isPayrollCategory(e.object))
    .reduce((s, e) => s + e.amount, 0);
  const payrollTotal = payrollPos + payrollDepot;

  const totalRevenue = depotRevenue + salesRevenue;
  const profit = totalRevenue - operatingExpenses;

  const productById = new Map((products || []).map((p) => [p.id, p.name]));
  const productMap = new Map<string, AnalyticsProductRow>();
  for (const line of scopedSales) {
    const id = String(line.erp_product_id);
    const prev = productMap.get(id) || {
      productId: id,
      name: productById.get(id) || "Produit",
      qtySold: 0,
      revenue: 0,
    };
    const qty = toNumber(line.retail_qty) + toNumber(line.wholesale_qty);
    const rev = toNumber(line.retail_revenue) + toNumber(line.wholesale_amount);
    prev.qtySold += qty;
    prev.revenue += rev;
    productMap.set(id, prev);
  }
  const topProducts = [...productMap.values()]
    .sort((a, b) => b.revenue - a.revenue || b.qtySold - a.qtySold)
    .slice(0, 10);

  const posMap = new Map<string, AnalyticsPosRow>();
  for (const loc of locations || []) {
    posMap.set(loc.id, {
      locationId: loc.id,
      name: loc.name,
      sales: 0,
      expenses: 0,
      appro: 0,
      profit: 0,
      productsSold: 0,
    });
  }
  for (const o of openings) {
    const row = posMap.get(o.location_id);
    if (row) row.sales += o.opening_ca;
  }
  for (const r of scopedReports) {
    const row = posMap.get(r.location_id);
    if (!row) continue;
    row.sales += toNumber(r.total_revenue);
    row.productsSold += toNumber(r.products_sold);
  }
  for (const e of scopedExp) {
    if (!isOperatingExpense(String(e.category))) continue;
    const row = e.location_id ? posMap.get(e.location_id) : null;
    if (row) row.expenses += toNumber(e.amount);
  }
  for (const i of scopedInv) {
    const row = i.location_id ? posMap.get(i.location_id) : null;
    if (row) row.appro += toNumber(i.total_amount);
  }
  for (const row of posMap.values()) {
    row.profit = row.sales - row.appro - row.expenses;
  }
  const topPos = [...posMap.values()].sort((a, b) => b.sales - a.sales);

  const monthly: AnalyticsMonthly[] = MONTH_LABELS.map((month, monthIndex) => ({
    month,
    monthIndex,
    revenue: 0,
    expenses: 0,
    payroll: 0,
    profit: 0,
  }));
  const annualMap = new Map<number, AnalyticsAnnual>();

  const bump = (date: string, patch: Partial<AnalyticsMonthly>) => {
    if (!date) return;
    const m = monthly[new Date(date).getMonth()];
    if (!m) return;
    m.revenue += patch.revenue || 0;
    m.expenses += patch.expenses || 0;
    m.payroll += patch.payroll || 0;
    const y = yearKey(date);
    const yearly = annualMap.get(y) || { year: y, revenue: 0, expenses: 0, payroll: 0, profit: 0 };
    yearly.revenue += patch.revenue || 0;
    yearly.expenses += patch.expenses || 0;
    yearly.payroll += patch.payroll || 0;
    annualMap.set(y, yearly);
  };

  for (const r of scopedReports) {
    bump(reportDate(r), { revenue: toNumber(r.total_revenue) });
  }
  for (const r of scopedDepot) {
    bump(String(r.date ?? ""), { revenue: toNumber(r.amount) });
  }
  for (const e of scopedExp) {
    if (!isOperatingExpense(String(e.category))) continue;
    const amount = toNumber(e.amount);
    bump(String(e.date ?? ""), {
      expenses: amount,
      payroll: isPayrollCategory(String(e.category)) ? amount : 0,
    });
  }
  for (const e of scopedCeo) {
    bump(e.date, { expenses: e.amount });
  }
  for (const e of scopedDepotExp) {
    bump(e.date, {
      expenses: e.amount,
      payroll: isPayrollCategory(e.object) ? e.amount : 0,
    });
  }

  for (const m of monthly) m.profit = m.revenue - m.expenses;
  const annual = [...annualMap.values()]
    .map((y) => ({ ...y, profit: y.revenue - y.expenses }))
    .sort((a, b) => a.year - b.year);

  const bestMonth =
    [...monthly].filter((m) => m.revenue > 0 || m.expenses > 0).sort((a, b) => b.profit - a.profit)[0] ||
    null;
  const bestYear = [...annual].sort((a, b) => b.profit - a.profit)[0] || null;

  return {
    periodLabel: openPeriod?.label ?? null,
    totalRevenue,
    depotRevenue,
    salesRevenue,
    operatingExpenses,
    payrollTotal,
    profit,
    bestMonth,
    bestYear,
    topProducts,
    topPos,
    monthly,
    annual,
  };
}
