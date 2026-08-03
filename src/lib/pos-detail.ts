import { supabase } from "@/lib/supabase-client";
import { expenseCategoryLabel } from "@/lib/erp-constants";
import {
  dateInPeriod,
  loadOpenAccountingPeriod,
  reportDate,
  toPeriodRange,
} from "@/lib/accounting-periods";
import { isOperatingExpense } from "@/lib/accounting";
import { loadOpeningForLocation } from "@/lib/pos-openings";

const toNumber = (v: unknown) => Number(v ?? 0) || 0;

export type PosStockLine = {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  minStock: number;
  unitPurchasePrice: number;
  sellingPrice: number;
};

export type PosDetailData = {
  locationId: string;
  locationName: string;
  managers: string[];
  periodLabel: string | null;
  openingCa: number;
  stockQty: number;
  stockValue: number;
  salesRevenue: number;
  provisionTotal: number;
  expensesTotal: number;
  transferTotal: number;
  assistanceReceived: number;
  writeoffUnits: number;
  profit: number;
  stockLines: PosStockLine[];
  expenses: { id: string; date: string; category: string; amount: number; description: string | null }[];
  investments: { id: string; date: string; total: number; notes: string | null; manager: string }[];
  reports: {
    id: string;
    weekStart: string;
    weekEnd: string;
    totalRevenue: number;
    productsSold: number;
    status: string;
    manager: string;
  }[];
  transfers: { id: string; date: string; amount: number; notes: string | null; manager: string }[];
};

export async function loadPosDetail(locationId: string): Promise<PosDetailData | null> {
  const openPeriod = await loadOpenAccountingPeriod();
  const period = toPeriodRange(openPeriod);

  const [
    { data: location },
    { data: managers },
    { data: stocks },
    { data: products },
    { data: investments },
    { data: expenses },
    { data: reports },
    { data: transfers },
    { data: writeoffs },
    { data: assistRows },
    opening,
  ] = await Promise.all([
    supabase.from("locations").select("id, name").eq("id", locationId).maybeSingle(),
    supabase.from("user_roles").select("id, name").eq("role", "manager").eq("location_id", locationId),
    supabase
      .from("inventory_stock")
      .select("erp_product_id, quantity")
      .eq("location_id", locationId),
    supabase
      .from("erp_products")
      .select("id, name, sku, min_stock, unit_purchase_price, selling_price")
      .order("name"),
    supabase
      .from("manager_investments")
      .select("id, date, total_amount, notes, manager_id, created_at")
      .eq("location_id", locationId)
      .order("date", { ascending: false }),
    supabase
      .from("global_expenses")
      .select("id, date, category, amount, description, created_at")
      .eq("location_id", locationId)
      .order("date", { ascending: false }),
    supabase
      .from("manager_reports")
      .select(
        "id, manager_id, week_start_date, week_end_date, total_revenue, products_sold, status, created_at",
      )
      .eq("location_id", locationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("manager_cash_transfers")
      .select("id, date, amount, notes, manager_id, created_at")
      .eq("location_id", locationId)
      .order("date", { ascending: false }),
    supabase
      .from("erp_stock_movements")
      .select("quantity_change, movement_type, created_at")
      .eq("location_id", locationId)
      .in("movement_type", ["loss", "damage", "gift"]),
    supabase
      .from("pos_financial_assistances")
      .select("date, amount, status")
      .eq("to_location_id", locationId)
      .eq("status", "completed"),
    loadOpeningForLocation(locationId, openPeriod?.id),
  ]);

  if (!location) return null;

  const managerById = new Map((managers || []).map((m) => [m.id, m.name]));
  const productById = new Map((products || []).map((p) => [p.id, p]));

  const scopedInv = (investments || []).filter((r) =>
    period ? dateInPeriod(String(r.date ?? ""), period) : true,
  );
  const scopedExp = (expenses || []).filter(
    (r) =>
      isOperatingExpense(String(r.category)) &&
      (period ? dateInPeriod(String(r.date ?? ""), period) : true),
  );
  const scopedRep = (reports || []).filter((r) =>
    period ? dateInPeriod(reportDate(r), period) : true,
  );
  const scopedTr = (transfers || []).filter((r) =>
    period ? dateInPeriod(String(r.date ?? ""), period) : true,
  );
  const scopedWriteoffs = (writeoffs || []).filter((r) =>
    period ? dateInPeriod(String(r.created_at ?? "").slice(0, 10), period) : true,
  );

  const stockLines: PosStockLine[] = (stocks || [])
    .map((s) => {
      const p = productById.get(s.erp_product_id);
      if (!p) return null;
      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        quantity: toNumber(s.quantity),
        minStock: toNumber(p.min_stock) || 10,
        unitPurchasePrice: toNumber(p.unit_purchase_price),
        sellingPrice: toNumber(p.selling_price),
      };
    })
    .filter(Boolean) as PosStockLine[];

  stockLines.sort((a, b) => a.name.localeCompare(b.name));

  const stockQty = stockLines.reduce((s, l) => s + l.quantity, 0);
  const stockValue = stockLines.reduce((s, l) => s + l.quantity * l.unitPurchasePrice, 0);
  const openingCa = opening?.opening_ca ?? 0;
  const salesRevenue =
    openingCa + scopedRep.reduce((s, r) => s + toNumber(r.total_revenue), 0);
  const provisionTotal = scopedInv.reduce((s, r) => s + toNumber(r.total_amount), 0);
  const expensesTotal = scopedExp.reduce((s, r) => s + toNumber(r.amount), 0);
  const transferTotal = scopedTr.reduce((s, r) => s + toNumber(r.amount), 0);
  const assistanceReceived = (assistRows || [])
    .filter((r) => (period ? dateInPeriod(String(r.date ?? ""), period) : true))
    .reduce((s, r) => s + toNumber(r.amount), 0);
  const writeoffUnits = scopedWriteoffs.reduce((s, r) => s + Math.abs(toNumber(r.quantity_change)), 0);
  const profit = salesRevenue + assistanceReceived - provisionTotal - expensesTotal;

  return {
    locationId: location.id,
    locationName: location.name,
    managers: (managers || []).map((m) => m.name),
    periodLabel: openPeriod?.label ?? null,
    openingCa,
    stockQty,
    stockValue,
    salesRevenue,
    provisionTotal,
    expensesTotal,
    transferTotal,
    assistanceReceived,
    writeoffUnits,
    profit,
    stockLines,
    expenses: scopedExp.slice(0, 40).map((r) => ({
      id: r.id,
      date: String(r.date ?? ""),
      category: expenseCategoryLabel(String(r.category ?? "")),
      amount: toNumber(r.amount),
      description: r.description ?? null,
    })),
    investments: scopedInv.slice(0, 30).map((r) => ({
      id: r.id,
      date: String(r.date ?? ""),
      total: toNumber(r.total_amount),
      notes: r.notes ?? null,
      manager: managerById.get(r.manager_id) || "Manager",
    })),
    reports: scopedRep.slice(0, 30).map((r) => ({
      id: r.id,
      weekStart: String(r.week_start_date ?? ""),
      weekEnd: String(r.week_end_date ?? ""),
      totalRevenue: toNumber(r.total_revenue),
      productsSold: toNumber(r.products_sold),
      status: r.status || "submitted",
      manager: managerById.get(r.manager_id) || "Manager",
    })),
    transfers: scopedTr.slice(0, 30).map((r) => ({
      id: r.id,
      date: String(r.date ?? ""),
      amount: toNumber(r.amount),
      notes: r.notes ?? null,
      manager: managerById.get(r.manager_id) || "Manager",
    })),
  };
}
