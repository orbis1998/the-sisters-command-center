import { supabase } from "@/lib/supabase-client";
import { loadOpenAccountingPeriod } from "@/lib/accounting-periods";

const toNumber = (v: unknown) => Number(v ?? 0) || 0;

export type PosPeriodOpening = {
  id: string;
  period_id: string;
  location_id: string;
  manager_id: string;
  opening_ca: number;
  notes: string | null;
  created_at: string;
};

export async function loadOpeningForLocation(locationId: string, periodId?: string) {
  let pid = periodId;
  if (!pid) {
    const period = await loadOpenAccountingPeriod();
    pid = period?.id;
  }
  if (!pid) return null;

  const { data, error } = await supabase
    .from("pos_period_openings")
    .select("id, period_id, location_id, manager_id, opening_ca, notes, created_at")
    .eq("period_id", pid)
    .eq("location_id", locationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    opening_ca: toNumber(data.opening_ca),
  } as PosPeriodOpening;
}

export async function loadOpeningsForOpenPeriod() {
  const period = await loadOpenAccountingPeriod();
  if (!period) return { period: null, openings: [] as PosPeriodOpening[] };

  const { data, error } = await supabase
    .from("pos_period_openings")
    .select("id, period_id, location_id, manager_id, opening_ca, notes, created_at")
    .eq("period_id", period.id);

  if (error) throw error;
  return {
    period,
    openings: (data || []).map((row) => ({
      ...row,
      opening_ca: toNumber(row.opening_ca),
    })) as PosPeriodOpening[],
  };
}

export async function submitPosPeriodOpening(input: {
  periodId: string;
  locationId: string;
  managerId: string;
  openingCa: number;
  notes?: string;
  items: { erp_product_id: string; quantity: number }[];
}) {
  if (!input.locationId) {
    throw new Error("Point de vente non assigné.");
  }

  const { data, error } = await supabase.rpc("apply_pos_period_opening", {
    p_period_id: input.periodId,
    p_location_id: input.locationId,
    p_manager_id: input.managerId,
    p_opening_ca: input.openingCa,
    p_notes: input.notes || null,
    p_items: input.items,
  });
  if (error) {
    throw new Error(error.message || "Impossible d'enregistrer l'ouverture");
  }
  return data as string;
}
