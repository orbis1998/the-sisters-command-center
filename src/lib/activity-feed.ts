import { supabase } from "@/lib/supabase-client";
import { depotObjectLabel, expenseCategoryLabel } from "@/lib/erp-constants";
import {
  isOperatingExpense,
  loadStockMovements,
  movementNotificationHref,
} from "@/lib/accounting";
import { loadCeoPersonalExpenses, loadDepotExpenses } from "@/lib/extended-expenses";

export type ActivityItem = {
  id: string;
  at: string;
  kind: string;
  title: string;
  detail: string;
  amountLabel?: string;
  href: string;
};

const toNumber = (v: unknown) => Number(v ?? 0) || 0;

function sortByAtDesc(a: ActivityItem, b: ActivityItem) {
  return String(b.at).localeCompare(String(a.at));
}

/** Journal d'activité global (CEO) — agrège stock, finance, rapports. */
export async function loadCeoActivityFeed(limit = 80): Promise<ActivityItem[]> {
  const [
    movements,
    { data: investments },
    { data: reports },
    { data: expenses },
    { data: transfers },
    { data: receipts },
    ceoPersonal,
    depotExpenses,
    { data: managers },
    { data: locations },
  ] = await Promise.all([
    loadStockMovements(50, { scope: "all" }),
    supabase
      .from("manager_investments")
      .select("id, date, total_amount, notes, manager_id, location_id, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("manager_reports")
      .select(
        "id, manager_id, location_id, week_start_date, week_end_date, total_revenue, products_sold, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("global_expenses")
      .select("id, date, category, amount, description, location_id, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("manager_cash_transfers")
      .select("id, date, amount, notes, manager_id, location_id, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("depot_receipts")
      .select("id, date, amount, notes, manager_id, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    loadCeoPersonalExpenses(30),
    loadDepotExpenses(30),
    supabase.from("user_roles").select("id, name").eq("role", "manager"),
    supabase.from("locations").select("id, name"),
  ]);

  const managerById = new Map((managers || []).map((m) => [m.id, m.name]));
  const locationById = new Map((locations || []).map((l) => [l.id, l.name]));

  const items: ActivityItem[] = [];

  for (const row of movements) {
    items.push({
      id: `mov-${row.id}`,
      at: row.date,
      kind: "Stock",
      title: row.movementType,
      detail: `${row.productName} · ${row.locationName}${row.notes ? ` · ${row.notes}` : ""}`,
      amountLabel: `${row.quantityChange > 0 ? "+" : ""}${row.quantityChange}`,
      href: movementNotificationHref(row.movementTypeKey, "ceo"),
    });
  }

  for (const row of investments || []) {
    const manager = managerById.get(row.manager_id) || "Manager";
    const loc = row.location_id ? locationById.get(row.location_id) || "POS" : "POS";
    items.push({
      id: `inv-${row.id}`,
      at: String(row.created_at || row.date || "").slice(0, 10),
      kind: "Approvisionnement",
      title: `Achat dépôt · ${manager}`,
      detail: `${loc}${row.notes ? ` · ${row.notes}` : ""}`,
      amountLabel: `$${toNumber(row.total_amount).toLocaleString("en-US")}`,
      href: "/investments",
    });
  }

  for (const row of reports || []) {
    const manager = managerById.get(row.manager_id) || "Manager";
    const loc = row.location_id ? locationById.get(row.location_id) || "POS" : "POS";
    items.push({
      id: `rep-${row.id}`,
      at: String(row.created_at || row.week_end_date || "").slice(0, 10),
      kind: "Rapport",
      title: `Rapport · ${manager}`,
      detail: `${loc} · ${row.week_start_date} → ${row.week_end_date} · ${row.status || "submitted"}`,
      amountLabel: `$${toNumber(row.total_revenue).toLocaleString("en-US")}`,
      href: "/reports",
    });
  }

  for (const row of expenses || []) {
    const cat = String(row.category ?? "");
    if (!isOperatingExpense(cat)) continue;
    const loc = row.location_id ? locationById.get(row.location_id) || "POS" : "Global";
    items.push({
      id: `exp-${row.id}`,
      at: String(row.created_at || row.date || "").slice(0, 10),
      kind: "Dépense POS",
      title: expenseCategoryLabel(cat),
      detail: `${loc}${row.description ? ` · ${row.description}` : ""}`,
      amountLabel: `−$${toNumber(row.amount).toLocaleString("en-US")}`,
      href: "/expenses",
    });
  }

  for (const row of transfers || []) {
    const manager = managerById.get(row.manager_id) || "Manager";
    items.push({
      id: `tr-${row.id}`,
      at: String(row.created_at || row.date || "").slice(0, 10),
      kind: "Transfert",
      title: `Remise caisse · ${manager}`,
      detail: row.notes || "Transfert / remise siège",
      amountLabel: `−$${toNumber(row.amount).toLocaleString("en-US")}`,
      href: "/expenses",
    });
  }

  for (const row of receipts || []) {
    const manager = managerById.get(row.manager_id) || "Manager";
    items.push({
      id: `rc-${row.id}`,
      at: String(row.created_at || row.date || "").slice(0, 10),
      kind: "CA dépôt",
      title: `Encaissement dépôt · ${manager}`,
      detail: row.notes || "Paiement approvisionnement",
      amountLabel: `+$${toNumber(row.amount).toLocaleString("en-US")}`,
      href: "/investments",
    });
  }

  for (const row of ceoPersonal) {
    items.push({
      id: `ceo-${row.id}`,
      at: String(row.created_at || row.date || "").slice(0, 10),
      kind: "Dépense CEO",
      title: `${row.owner === "axelle" ? "Axelle" : "Allexe"} · ${row.description}`,
      detail: row.comment || "Dépense personnelle",
      amountLabel: `−$${toNumber(row.amount).toLocaleString("en-US")}`,
      href: "/expenses",
    });
  }

  for (const row of depotExpenses) {
    items.push({
      id: `dex-${row.id}`,
      at: String(row.created_at || row.date || "").slice(0, 10),
      kind: "Dépense dépôt",
      title: depotObjectLabel(row.object),
      detail: `${row.description || "Charge dépôt"}${row.responsible ? ` · ${row.responsible}` : ""}`,
      amountLabel: `−$${toNumber(row.amount).toLocaleString("en-US")}`,
      href: "/expenses",
    });
  }

  return items.sort(sortByAtDesc).slice(0, limit);
}
