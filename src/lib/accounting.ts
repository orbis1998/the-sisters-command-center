import { supabase } from "@/lib/supabase-client";
import { dateInPeriod, loadOpenAccountingPeriod, reportDate, toPeriodRange } from "@/lib/accounting-periods";

export type AccountingSummary = {
  depotRevenue: number;
  salesRevenue: number;
  totalRevenue: number;
  operatingExpenses: number;
  ceoPersonalExpenses: number;
  depotOperatingExpenses: number;
  profit: number;
  globalStockQty: number;
  posStockQty: number;
};

const toNumber = (v: unknown) => Number(v ?? 0) || 0;

/** Company expenses excluding POS stock purchases (tracked as depot revenue). */
export function isOperatingExpense(category: string) {
  return category !== "stock_purchase" && category !== "investment";
}

export function calcRetailRevenue(retailQty: number, sellingPrice: number) {
  return retailQty * sellingPrice;
}

export function calcLineRevenue(retailQty: number, sellingPrice: number, wholesaleAmount: number) {
  return calcRetailRevenue(retailQty, sellingPrice) + wholesaleAmount;
}

export async function loadAccountingSummary(): Promise<AccountingSummary> {
  const openPeriod = await loadOpenAccountingPeriod();
  const period = toPeriodRange(openPeriod);

  const [
    { data: depotRows },
    { data: reportRows },
    { data: expenseRows },
    { data: products },
    { data: posStock },
    { data: ceoRows },
    { data: depotExpenseRows },
    { data: depotLocations },
    { data: openingRows },
  ] = await Promise.all([
    supabase.from("depot_receipts").select("amount, date"),
    supabase
      .from("manager_reports")
      .select("total_revenue, week_start_date, week_end_date, created_at, location_id"),
    supabase.from("global_expenses").select("amount, category, date"),
    supabase.from("erp_products").select("global_qty"),
    supabase.from("inventory_stock").select("quantity"),
    supabase.from("ceo_personal_expenses").select("amount, date"),
    supabase.from("depot_expenses").select("amount, date"),
    supabase.from("locations").select("id").eq("name", "DEPOT GLOBAL"),
    openPeriod?.id
      ? supabase.from("pos_period_openings").select("opening_ca, period_id").eq("period_id", openPeriod.id)
      : Promise.resolve({ data: [] as { opening_ca: number; period_id: string }[] }),
  ]);

  const depotLocationIds = new Set((depotLocations || []).map((l) => l.id));
  const scopedDepot = (depotRows || []).filter((r) => (period ? dateInPeriod(String(r.date ?? ""), period) : true));
  const scopedReports = (reportRows || []).filter((r) => {
    if (depotLocationIds.has(r.location_id)) return false;
    return period ? dateInPeriod(reportDate(r), period) : true;
  });
  const scopedExpenses = (expenseRows || []).filter((e) => (period ? dateInPeriod(String(e.date ?? ""), period) : true));
  const scopedCeo = (ceoRows || []).filter((e) => (period ? dateInPeriod(String(e.date ?? ""), period) : true));
  const scopedDepotExp = (depotExpenseRows || []).filter((e) =>
    period ? dateInPeriod(String(e.date ?? ""), period) : true,
  );

  const depotRevenue = scopedDepot.reduce((s, r) => s + toNumber(r.amount), 0);
  const openingCa = (openingRows || []).reduce((s, r) => s + toNumber(r.opening_ca), 0);
  const salesRevenue =
    scopedReports.reduce((s, r) => s + toNumber(r.total_revenue), 0) + openingCa;
  const posOperating = scopedExpenses
    .filter((e) => isOperatingExpense(String(e.category)))
    .reduce((s, e) => s + toNumber(e.amount), 0);
  const ceoPersonalExpenses = scopedCeo.reduce((s, e) => s + toNumber(e.amount), 0);
  const depotOperatingExpenses = scopedDepotExp.reduce((s, e) => s + toNumber(e.amount), 0);
  const operatingExpenses = posOperating + ceoPersonalExpenses + depotOperatingExpenses;

  const globalStockQty = (products || []).reduce((s, p) => s + toNumber(p.global_qty), 0);
  const posStockQty = (posStock || []).reduce((s, r) => s + toNumber(r.quantity), 0);
  const totalRevenue = depotRevenue + salesRevenue;
  const profit = totalRevenue - operatingExpenses;

  return {
    depotRevenue,
    salesRevenue,
    totalRevenue,
    operatingExpenses,
    ceoPersonalExpenses,
    depotOperatingExpenses,
    profit,
    globalStockQty,
    posStockQty,
  };
}

export type PosAccounting = {
  locationId: string;
  locationName: string;
  stockQty: number;
  provisionTotal: number;
  expensesTotal: number;
  salesRevenue: number;
  profit: number;
};

export async function loadPosAccounting(): Promise<PosAccounting[]> {
  const openPeriod = await loadOpenAccountingPeriod();
  const period = toPeriodRange(openPeriod);

  const [
    { data: locations },
    { data: stocks },
    { data: investments },
    { data: expenses },
    { data: reports },
    { data: openings },
  ] = await Promise.all([
    supabase.from("locations").select("id, name").neq("name", "DEPOT GLOBAL").order("name"),
    supabase.from("inventory_stock").select("location_id, quantity"),
    supabase.from("manager_investments").select("location_id, total_amount, date"),
    supabase.from("global_expenses").select("location_id, amount, category, date"),
    supabase.from("manager_reports").select("location_id, total_revenue, week_start_date, week_end_date, created_at"),
    openPeriod?.id
      ? supabase.from("pos_period_openings").select("location_id, opening_ca").eq("period_id", openPeriod.id)
      : Promise.resolve({ data: [] as { location_id: string; opening_ca: number }[] }),
  ]);

  const scopedInvestments = (investments || []).filter((i) =>
    period ? dateInPeriod(String(i.date ?? ""), period) : true,
  );
  const scopedExpenses = (expenses || []).filter((e) =>
    period ? dateInPeriod(String(e.date ?? ""), period) : true,
  );
  const scopedReports = (reports || []).filter((r) =>
    period ? dateInPeriod(reportDate(r), period) : true,
  );
  const openingByLocation = new Map(
    (openings || []).map((o) => [o.location_id, toNumber(o.opening_ca)] as const),
  );

  return (locations || []).map((loc) => {
    const stockQty = (stocks || [])
      .filter((s) => s.location_id === loc.id)
      .reduce((sum, s) => sum + toNumber(s.quantity), 0);
    const provisionTotal = scopedInvestments
      .filter((i) => i.location_id === loc.id)
      .reduce((sum, i) => sum + toNumber(i.total_amount), 0);
    const expensesTotal = scopedExpenses
      .filter((e) => e.location_id === loc.id && isOperatingExpense(String(e.category)))
      .reduce((sum, e) => sum + toNumber(e.amount), 0);
    const periodSales = scopedReports
      .filter((r) => r.location_id === loc.id)
      .reduce((sum, r) => sum + toNumber(r.total_revenue), 0);
    const openingCa = openingByLocation.get(loc.id) || 0;
    const salesRevenue = openingCa + periodSales;
    const profit = salesRevenue - provisionTotal - expensesTotal;

    return {
      locationId: loc.id,
      locationName: loc.name,
      stockQty,
      provisionTotal,
      expensesTotal,
      salesRevenue,
      profit,
    };
  });
}

export type StockMovementRow = {
  id: string;
  date: string;
  productName: string;
  locationName: string;
  movementType: string;
  /** Raw DB value for routing / filters. */
  movementTypeKey: string;
  quantityChange: number;
  notes: string | null;
  locationId: string | null;
};

export type StockMovementScope = "all" | "depot" | "pos";

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  depot_restock: "Entrée dépôt",
  depot_out_to_pos: "Sortie dépôt → POS",
  pos_restock_from_depot: "Entrée POS",
  weekly_stock_update: "Màj stock hebdo",
  correction: "Correction",
  loss: "Perte",
  damage: "Abîmé",
  gift: "Offert (0 $)",
};

/** Target page for a movement, depending on who is viewing. */
export function movementNotificationHref(
  movementTypeKey: string,
  role: "ceo" | "manager" | "depot",
): string {
  if (role === "ceo") {
    switch (movementTypeKey) {
      case "depot_restock":
        return "/restocks";
      case "depot_out_to_pos":
      case "pos_restock_from_depot":
        return "/investments";
      case "weekly_stock_update":
        return "/reports";
      case "loss":
      case "damage":
      case "gift":
        return "/stock-flows";
      default:
        return "/stock-flows";
    }
  }

  if (role === "depot") {
    switch (movementTypeKey) {
      case "depot_restock":
        return "/depot-restocks";
      case "depot_out_to_pos":
        return "/inventory";
      case "loss":
      case "damage":
        return "/stock-writeoff";
      case "weekly_stock_update":
        return "/";
      default:
        return "/inventory";
    }
  }

  // manager
  switch (movementTypeKey) {
    case "pos_restock_from_depot":
      return "/manager-investment";
    case "weekly_stock_update":
      return "/weekly-report";
    case "loss":
    case "damage":
    case "gift":
      return "/stock-writeoff";
    case "correction":
      return "/manager-stock";
    default:
      return "/manager-stock";
  }
}

export async function loadStockMovements(
  limit = 100,
  options?: { scope?: StockMovementScope; locationId?: string | null },
): Promise<StockMovementRow[]> {
  const scope = options?.scope ?? "all";
  let query = supabase
    .from("erp_stock_movements")
    .select("id, created_at, movement_type, quantity_change, notes, erp_product_id, location_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (scope === "pos") {
    if (!options?.locationId) return [];
    query = query.eq("location_id", options.locationId);
  } else if (scope === "depot") {
    // Dépôt: mouvements globaux (location null) + sorties vers POS
    query = query.or("location_id.is.null,movement_type.eq.depot_out_to_pos");
  }

  const { data } = await query;

  if (!data?.length) return [];

  const productIds = [...new Set(data.map((r) => r.erp_product_id))];
  const locationIds = [...new Set(data.map((r) => r.location_id).filter(Boolean))] as string[];

  const [{ data: products }, { data: locations }] = await Promise.all([
    supabase.from("erp_products").select("id, name").in("id", productIds),
    locationIds.length
      ? supabase.from("locations").select("id, name").in("id", locationIds)
      : Promise.resolve({ data: [] }),
  ]);

  const productById = new Map((products || []).map((p) => [p.id, p.name]));
  const locationById = new Map((locations || []).map((l) => [l.id, l.name]));

  return data.map((row) => ({
    id: row.id,
    date: String(row.created_at ?? "").slice(0, 10),
    productName: productById.get(row.erp_product_id) || "Produit",
    locationName: row.location_id ? locationById.get(row.location_id) || "POS" : "Dépôt global",
    movementType: MOVEMENT_TYPE_LABELS[row.movement_type] || row.movement_type,
    movementTypeKey: String(row.movement_type ?? ""),
    quantityChange: toNumber(row.quantity_change),
    notes: row.notes ?? null,
    locationId: row.location_id ? String(row.location_id) : null,
  }));
}
