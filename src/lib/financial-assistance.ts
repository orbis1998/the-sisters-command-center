import { supabase } from "@/lib/supabase-client";
import { fmtUsd } from "@/lib/format";

const toNumber = (v: unknown) => Number(v ?? 0) || 0;

export type FinancialAssistanceRow = {
  id: string;
  date: string;
  amount: number;
  notes: string | null;
  status: string;
  fromType: "pos" | "depot";
  fromLocationId: string | null;
  fromDepotId: string | null;
  toLocationId: string;
  fromName: string;
  toName: string;
  createdAt: string;
};

export async function loadPosLocationsForAssistance(excludeLocationId?: string | null) {
  const { data, error } = await supabase
    .from("locations")
    .select("id, name")
    .neq("name", "DEPOT GLOBAL")
    .order("name");
  if (error) throw error;
  return (data || []).filter((l) => !excludeLocationId || l.id !== excludeLocationId);
}

export async function submitFinancialAssistance(input: {
  amount: number;
  toLocationId: string;
  fromType: "pos" | "depot";
  fromLocationId?: string | null;
  fromDepotId?: string | null;
  performedByManagerId?: string | null;
  performedByDepotId?: string | null;
  date?: string;
  notes?: string;
}) {
  const { data, error } = await supabase.rpc("apply_pos_financial_assistance", {
    p_amount: input.amount,
    p_to_location_id: input.toLocationId,
    p_from_type: input.fromType,
    p_from_location_id: input.fromLocationId ?? null,
    p_from_depot_id: input.fromDepotId ?? null,
    p_performed_by_manager_id: input.performedByManagerId ?? null,
    p_performed_by_depot_id: input.performedByDepotId ?? null,
    p_date: input.date || new Date().toISOString().slice(0, 10),
    p_notes: input.notes || null,
  });
  if (error) throw new Error(error.message || "Impossible d'enregistrer l'assistance");
  return data as string;
}

async function hydrateAssistances(
  rows: Array<Record<string, unknown>>,
): Promise<FinancialAssistanceRow[]> {
  if (!rows.length) return [];
  const locationIds = [
    ...new Set(
      rows
        .flatMap((r) => [r.from_location_id, r.to_location_id])
        .filter(Boolean)
        .map(String),
    ),
  ];
  const depotIds = [
    ...new Set(rows.map((r) => r.from_depot_id).filter(Boolean).map(String)),
  ];

  const [{ data: locations }, { data: depots }] = await Promise.all([
    locationIds.length
      ? supabase.from("locations").select("id, name").in("id", locationIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    depotIds.length
      ? supabase.from("erp_depot_accounts").select("id, name").in("id", depotIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const locById = new Map((locations || []).map((l) => [l.id, l.name]));
  const depotById = new Map((depots || []).map((d) => [d.id, d.name]));

  return rows.map((r) => {
    const fromType = (r.from_type === "depot" ? "depot" : "pos") as "pos" | "depot";
    const fromName =
      fromType === "depot"
        ? depotById.get(String(r.from_depot_id)) || "Dépôt"
        : locById.get(String(r.from_location_id)) || "POS";
    return {
      id: String(r.id),
      date: String(r.date ?? "").slice(0, 10),
      amount: toNumber(r.amount),
      notes: (r.notes as string | null) ?? null,
      status: String(r.status ?? "completed"),
      fromType,
      fromLocationId: r.from_location_id ? String(r.from_location_id) : null,
      fromDepotId: r.from_depot_id ? String(r.from_depot_id) : null,
      toLocationId: String(r.to_location_id),
      fromName,
      toName: locById.get(String(r.to_location_id)) || "POS",
      createdAt: String(r.created_at ?? ""),
    };
  });
}

export async function loadAssistancesForLocation(locationId: string, limit = 30) {
  const { data, error } = await supabase
    .from("pos_financial_assistances")
    .select("*")
    .or(`from_location_id.eq.${locationId},to_location_id.eq.${locationId}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return hydrateAssistances((data || []) as Array<Record<string, unknown>>);
}

export async function loadAssistancesSentByDepot(depotId: string, limit = 30) {
  const { data, error } = await supabase
    .from("pos_financial_assistances")
    .select("*")
    .eq("from_type", "depot")
    .eq("from_depot_id", depotId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return hydrateAssistances((data || []) as Array<Record<string, unknown>>);
}

export async function loadRecentAssistances(limit = 40) {
  const { data, error } = await supabase
    .from("pos_financial_assistances")
    .select("*")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return hydrateAssistances((data || []) as Array<Record<string, unknown>>);
}

export type AssistanceNotification = {
  id: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  amount: number;
};

export async function loadAssistanceNotifications(input: {
  role: "ceo" | "manager" | "depot";
  locationId?: string | null;
}): Promise<AssistanceNotification[]> {
  const rows = await loadRecentAssistances(40);

  if (input.role === "ceo") {
    return rows.map((r) => ({
      id: `assist-ceo-${r.id}`,
      title: "Assistance financière",
      body: `${r.fromName} → ${r.toName} · ${fmtUsd(r.amount)} · ${r.createdAt.slice(0, 16).replace("T", " ")}`,
      href: "/activity",
      createdAt: r.createdAt,
      amount: r.amount,
    }));
  }

  if (input.role === "manager" && input.locationId) {
    return rows
      .filter((r) => r.toLocationId === input.locationId)
      .map((r) => ({
        id: `assist-recv-${r.id}`,
        title: "Caisse alimentée",
        body: `Votre caisse a été alimentée par ${r.fromName} d'un montant de ${fmtUsd(r.amount)}.`,
        href: "/manager-expenses",
        createdAt: r.createdAt,
        amount: r.amount,
      }));
  }

  // Depot: only see sends they initiated (optional quiet); no receive
  return [];
}

export async function sumAssistanceReceivedForLocation(
  locationId: string,
  inScope: (date: string) => boolean,
) {
  const { data } = await supabase
    .from("pos_financial_assistances")
    .select("date, amount, status")
    .eq("to_location_id", locationId)
    .eq("status", "completed");
  return (data || [])
    .filter((r) => inScope(String(r.date ?? "")))
    .reduce((s, r) => s + toNumber(r.amount), 0);
}
