import { supabase } from "@/lib/supabase-client";
import { isOperatingExpense } from "@/lib/accounting";
import { depotObjectLabel, expenseCategoryLabel } from "@/lib/erp-constants";
import { loadCeoPersonalExpenses, loadDepotExpenses } from "@/lib/extended-expenses";

const toNumber = (v: unknown) => Number(v ?? 0) || 0;

export type ReportSaleLine = {
  productName: string;
  retailQty: number;
  unitPrice: number;
  retailRevenue: number;
  wholesaleAmount: number;
  lineTotal: number;
  remainingStock: number;
  date: string;
};

export type ReportExpenseLine = {
  id: string;
  category: string;
  categoryLabel: string;
  description: string;
  amount: number;
  date: string;
};

export type ReportExpenseGroup = {
  key: string;
  label: string;
  total: number;
  lines: ReportExpenseLine[];
};

export type ManagerReportDetail = {
  id: string;
  managerName: string;
  locationName: string;
  weekStart: string;
  weekEnd: string;
  status: string;
  observations: string | null;
  salesLines: ReportSaleLine[];
  salesTotal: number;
  retailTotal: number;
  wholesaleTotal: number;
  productsSold: number;
  expenseGroups: ReportExpenseGroup[];
  operatingExpensesTotal: number;
  ceoAxelleTotal: number;
  ceoAllexeTotal: number;
  depotExpensesTotal: number;
  allExpensesTotal: number;
  grossProfit: number;
  finalResult: number;
};

function inRange(date: string, start: string, end: string) {
  const d = date.slice(0, 10);
  return d >= start && d <= end;
}

export async function loadManagerReportDetail(reportId: string): Promise<ManagerReportDetail | null> {
  const { data: report, error } = await supabase
    .from("manager_reports")
    .select(
      "id, manager_id, location_id, week_start_date, week_end_date, status, observations, products_sold, total_revenue, retail_revenue, wholesale_revenue, created_at",
    )
    .eq("id", reportId)
    .maybeSingle();

  if (error || !report) return null;

  const weekStart = String(report.week_start_date ?? "").slice(0, 10);
  const weekEnd = String(report.week_end_date ?? "").slice(0, 10);

  const [{ data: sales }, { data: managers }, { data: locations }, { data: expenses }, ceoRows, depotRows] =
    await Promise.all([
      supabase
        .from("manager_report_sales")
        .select("erp_product_id, retail_qty, wholesale_amount, retail_revenue, remaining_stock")
        .eq("report_id", reportId),
      supabase.from("erp_managers").select("id, name"),
      supabase.from("locations").select("id, name"),
      supabase
        .from("global_expenses")
        .select("id, date, category, amount, description, location_id, recorded_by")
        .gte("date", weekStart)
        .lte("date", weekEnd),
      loadCeoPersonalExpenses(500),
      loadDepotExpenses(500),
    ]);

  const productIds = [...new Set((sales || []).map((s) => s.erp_product_id))];
  const { data: products } = productIds.length
    ? await supabase.from("erp_products").select("id, name, selling_price").in("id", productIds)
    : { data: [] };

  const productById = new Map((products || []).map((p) => [p.id, p]));
  const managerName = (managers || []).find((m) => m.id === report.manager_id)?.name || "Manager";
  const locationName = (locations || []).find((l) => l.id === report.location_id)?.name || "Point de vente";

  const salesLines: ReportSaleLine[] = (sales || [])
    .map((row) => {
      const product = productById.get(row.erp_product_id);
      const unitPrice = toNumber(product?.selling_price);
      const retailQty = toNumber(row.retail_qty);
      const retailRevenue = toNumber(row.retail_revenue) || retailQty * unitPrice;
      const wholesaleAmount = toNumber(row.wholesale_amount);
      return {
        productName: product?.name || "Produit",
        retailQty,
        unitPrice,
        retailRevenue,
        wholesaleAmount,
        lineTotal: retailRevenue + wholesaleAmount,
        remainingStock: toNumber(row.remaining_stock),
        date: weekEnd || weekStart,
      };
    })
    .sort((a, b) => a.productName.localeCompare(b.productName));

  const retailTotal = salesLines.reduce((s, l) => s + l.retailRevenue, 0);
  const wholesaleTotal = salesLines.reduce((s, l) => s + l.wholesaleAmount, 0);
  const salesTotal = toNumber(report.total_revenue) || retailTotal + wholesaleTotal;
  const productsSold = toNumber(report.products_sold) || salesLines.reduce((s, l) => s + l.retailQty, 0);

  const scopedExpenses = (expenses || []).filter((e) => {
    if (!isOperatingExpense(String(e.category))) return false;
    if (report.location_id && e.location_id === report.location_id) return true;
    if (report.manager_id && e.recorded_by === report.manager_id) return true;
    return false;
  });

  const byCategory = new Map<string, ReportExpenseLine[]>();
  for (const row of scopedExpenses) {
    const category = String(row.category ?? "unexpected");
    const line: ReportExpenseLine = {
      id: row.id,
      category,
      categoryLabel: expenseCategoryLabel(category),
      description: String(row.description || "—"),
      amount: toNumber(row.amount),
      date: String(row.date ?? "").slice(0, 10),
    };
    const list = byCategory.get(category) || [];
    list.push(line);
    byCategory.set(category, list);
  }

  const categoryOrder = [
    "transport_taxi",
    "salary",
    "rent",
    "marketing",
    "subscription",
    "shipping",
    "taxes",
    "unexpected",
  ];

  const expenseGroups: ReportExpenseGroup[] = [];
  for (const key of categoryOrder) {
    const lines = (byCategory.get(key) || []).sort((a, b) => b.date.localeCompare(a.date));
    if (!lines.length) continue;
    expenseGroups.push({
      key,
      label: expenseCategoryLabel(key),
      total: lines.reduce((s, l) => s + l.amount, 0),
      lines,
    });
    byCategory.delete(key);
  }
  for (const [key, lines] of byCategory) {
    expenseGroups.push({
      key,
      label: expenseCategoryLabel(key),
      total: lines.reduce((s, l) => s + l.amount, 0),
      lines: lines.sort((a, b) => b.date.localeCompare(a.date)),
    });
  }

  const ceoInPeriod = ceoRows.filter((r) => inRange(r.date, weekStart, weekEnd));
  const depotInPeriod = depotRows.filter((r) => inRange(r.date, weekStart, weekEnd));

  const axelleLines = ceoInPeriod
    .filter((r) => r.owner === "axelle")
    .map((r) => ({
      id: r.id,
      category: "ceo_axelle",
      categoryLabel: "Dépenses personnelles · Axelle",
      description: r.description + (r.comment ? ` — ${r.comment}` : ""),
      amount: r.amount,
      date: r.date,
    }));
  const allexeLines = ceoInPeriod
    .filter((r) => r.owner === "allexe")
    .map((r) => ({
      id: r.id,
      category: "ceo_allexe",
      categoryLabel: "Dépenses personnelles · Allexe",
      description: r.description + (r.comment ? ` — ${r.comment}` : ""),
      amount: r.amount,
      date: r.date,
    }));
  const depotLines = depotInPeriod.map((r) => ({
    id: r.id,
    category: "depot",
    categoryLabel: "Dépenses du dépôt",
    description: `${depotObjectLabel(r.object)}: ${r.description}${r.responsible ? ` · ${r.responsible}` : ""}`,
    amount: r.amount,
    date: r.date,
  }));

  if (axelleLines.length) {
    expenseGroups.unshift({
      key: "ceo_axelle",
      label: "Dépenses personnelles · Axelle",
      total: axelleLines.reduce((s, l) => s + l.amount, 0),
      lines: axelleLines,
    });
  }
  if (allexeLines.length) {
    expenseGroups.unshift({
      key: "ceo_allexe",
      label: "Dépenses personnelles · Allexe",
      total: allexeLines.reduce((s, l) => s + l.amount, 0),
      lines: allexeLines,
    });
  }
  if (depotLines.length) {
    expenseGroups.unshift({
      key: "depot",
      label: "Dépenses du dépôt",
      total: depotLines.reduce((s, l) => s + l.amount, 0),
      lines: depotLines,
    });
  }

  // Keep transport near top after special groups
  expenseGroups.sort((a, b) => {
    const rank = (key: string) => {
      if (key === "depot") return 0;
      if (key === "ceo_axelle") return 1;
      if (key === "ceo_allexe") return 2;
      if (key === "transport_taxi") return 3;
      return 10;
    };
    return rank(a.key) - rank(b.key);
  });

  const operatingExpensesTotal = expenseGroups
    .filter((g) => !g.key.startsWith("ceo_") && g.key !== "depot")
    .reduce((s, g) => s + g.total, 0);
  const ceoAxelleTotal = axelleLines.reduce((s, l) => s + l.amount, 0);
  const ceoAllexeTotal = allexeLines.reduce((s, l) => s + l.amount, 0);
  const depotExpensesTotal = depotLines.reduce((s, l) => s + l.amount, 0);
  const allExpensesTotal = operatingExpensesTotal + ceoAxelleTotal + ceoAllexeTotal + depotExpensesTotal;
  const grossProfit = salesTotal;
  const finalResult = salesTotal - allExpensesTotal;

  return {
    id: report.id,
    managerName,
    locationName,
    weekStart,
    weekEnd,
    status: report.status || "submitted",
    observations: report.observations ?? null,
    salesLines,
    salesTotal,
    retailTotal,
    wholesaleTotal,
    productsSold,
    expenseGroups,
    operatingExpensesTotal,
    ceoAxelleTotal,
    ceoAllexeTotal,
    depotExpensesTotal,
    allExpensesTotal,
    grossProfit,
    finalResult,
  };
}

export async function loadRecentReportSummaries(limit = 30) {
  const { data } = await supabase
    .from("manager_reports")
    .select(
      "id, manager_id, location_id, week_start_date, week_end_date, products_sold, total_revenue, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  const [{ data: managers }, { data: locations }] = await Promise.all([
    supabase.from("erp_managers").select("id, name"),
    supabase.from("locations").select("id, name"),
  ]);
  const managerById = new Map((managers || []).map((m) => [m.id, m.name]));
  const locationById = new Map((locations || []).map((l) => [l.id, l.name]));

  return (data || []).map((row) => ({
    id: row.id,
    manager: managerById.get(row.manager_id) || "Manager",
    location: locationById.get(row.location_id) || "Point de vente",
    weekStart: String(row.week_start_date ?? ""),
    weekEnd: String(row.week_end_date ?? ""),
    productsSold: toNumber(row.products_sold),
    totalRevenue: toNumber(row.total_revenue),
    status: row.status || "submitted",
  }));
}
