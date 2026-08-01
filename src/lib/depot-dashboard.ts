import { supabase } from "@/lib/supabase-client";
import {
  dateInPeriod,
  loadOpenAccountingPeriod,
  toPeriodRange,
} from "@/lib/accounting-periods";

const toNumber = (v: unknown) => Number(v ?? 0) || 0;

export type DepotDashboardData = {
  stockQty: number;
  productCount: number;
  lowStock: number;
  outOfStock: number;
  unitsSoldToPos: number;
  cashReceived: number;
  expensesTotal: number;
  writeoffUnits: number;
  stockValue: number;
  recentOutflows: {
    id: string;
    date: string;
    amount: number;
    manager: string;
    qty: number;
  }[];
  recentWriteoffs: {
    id: string;
    createdAt: string;
    type: string;
    qty: number;
    product: string;
  }[];
};

export async function loadDepotDashboard(): Promise<DepotDashboardData> {
  const period = toPeriodRange(await loadOpenAccountingPeriod());

  const [
    { data: products },
    { data: receipts },
    { data: expenses },
    { data: outMoves },
    { data: writeoffs },
    { data: managers },
    { data: investmentItems },
  ] = await Promise.all([
    supabase.from("erp_products").select("id, name, global_qty, min_stock, unit_purchase_price"),
    supabase.from("depot_receipts").select("id, date, amount, manager_id, investment_id"),
    supabase.from("depot_expenses").select("amount, date"),
    supabase
      .from("erp_stock_movements")
      .select("id, quantity_change, created_at, movement_type, erp_product_id")
      .eq("movement_type", "depot_out_to_pos")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("erp_stock_movements")
      .select("id, quantity_change, created_at, movement_type, erp_product_id, notes")
      .in("movement_type", ["loss", "damage", "gift"])
      .is("location_id", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("erp_managers").select("id, name"),
    supabase.from("manager_investment_items").select("quantity, investment_id"),
  ]);

  const productRows = products || [];
  const productById = new Map(productRows.map((p) => [p.id, p]));
  const managerById = new Map((managers || []).map((m) => [m.id, m.name]));

  const scopedReceipts = (receipts || []).filter((r) =>
    period ? dateInPeriod(String(r.date ?? ""), period) : true,
  );
  const scopedExpenses = (expenses || []).filter((e) =>
    period ? dateInPeriod(String(e.date ?? ""), period) : true,
  );
  const scopedOut = (outMoves || []).filter((m) =>
    period ? dateInPeriod(String(m.created_at ?? "").slice(0, 10), period) : true,
  );

  const unitsSoldToPos = scopedOut.reduce((s, m) => s + Math.abs(toNumber(m.quantity_change)), 0);

  const qtyByInvestment = new Map<string, number>();
  (investmentItems || []).forEach((item) => {
    const id = String(item.investment_id ?? "");
    qtyByInvestment.set(id, (qtyByInvestment.get(id) || 0) + toNumber(item.quantity));
  });

  const recentOutflows = [...scopedReceipts]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 8)
    .map((r) => ({
      id: r.id,
      date: String(r.date ?? ""),
      amount: toNumber(r.amount),
      manager: managerById.get(r.manager_id) || "Manager",
      qty: qtyByInvestment.get(String(r.investment_id ?? "")) || 0,
    }));

  const recentWriteoffs = (writeoffs || []).map((w) => ({
    id: w.id,
    createdAt: String(w.created_at ?? "").slice(0, 10),
    type: String(w.movement_type ?? ""),
    qty: Math.abs(toNumber(w.quantity_change)),
    product: productById.get(w.erp_product_id)?.name || "Produit",
  }));

  const writeoffUnits = recentWriteoffs.reduce((s, w) => s + w.qty, 0);

  return {
    stockQty: productRows.reduce((s, p) => s + toNumber(p.global_qty), 0),
    productCount: productRows.length,
    lowStock: productRows.filter(
      (p) => toNumber(p.global_qty) > 0 && toNumber(p.global_qty) <= toNumber(p.min_stock || 0),
    ).length,
    outOfStock: productRows.filter((p) => toNumber(p.global_qty) <= 0).length,
    unitsSoldToPos,
    cashReceived: scopedReceipts.reduce((s, r) => s + toNumber(r.amount), 0),
    expensesTotal: scopedExpenses.reduce((s, e) => s + toNumber(e.amount), 0),
    writeoffUnits,
    stockValue: productRows.reduce(
      (s, p) => s + toNumber(p.global_qty) * toNumber(p.unit_purchase_price),
      0,
    ),
    recentOutflows,
    recentWriteoffs,
  };
}
