import { supabase } from "@/lib/supabase-client";
import type { CeoPersonalOwner } from "@/lib/erp-constants";

const toNumber = (v: unknown) => Number(v ?? 0) || 0;

export type CeoPersonalExpense = {
  id: string;
  owner: CeoPersonalOwner;
  date: string;
  amount: number;
  description: string;
  comment: string | null;
  created_at: string;
};

export type DepotExpense = {
  id: string;
  date: string;
  object: string;
  description: string;
  amount: number;
  responsible: string | null;
  created_at: string;
};

export async function loadCeoPersonalExpenses(limit = 300): Promise<CeoPersonalExpense[]> {
  const { data, error } = await supabase
    .from("ceo_personal_expenses")
    .select("id, owner, date, amount, description, comment, created_at")
    .order("date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    owner: row.owner as CeoPersonalOwner,
    date: String(row.date ?? ""),
    amount: toNumber(row.amount),
    description: String(row.description ?? ""),
    comment: row.comment ?? null,
    created_at: String(row.created_at ?? ""),
  }));
}

export async function loadDepotExpenses(limit = 300): Promise<DepotExpense[]> {
  const { data, error } = await supabase
    .from("depot_expenses")
    .select("id, date, object, description, amount, responsible, created_at")
    .order("date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    date: String(row.date ?? ""),
    object: String(row.object ?? ""),
    description: String(row.description ?? ""),
    amount: toNumber(row.amount),
    responsible: row.responsible ?? null,
    created_at: String(row.created_at ?? ""),
  }));
}

export function sumCeoByOwner(rows: CeoPersonalExpense[]) {
  return {
    axelle: rows.filter((r) => r.owner === "axelle").reduce((s, r) => s + r.amount, 0),
    allexe: rows.filter((r) => r.owner === "allexe").reduce((s, r) => s + r.amount, 0),
  };
}

export async function createCeoPersonalExpense(input: {
  owner: CeoPersonalOwner;
  date: string;
  amount: number;
  description: string;
  comment?: string;
  recordedByManagerId?: string | null;
}) {
  const { error } = await supabase.from("ceo_personal_expenses").insert({
    owner: input.owner,
    date: input.date,
    amount: input.amount,
    description: input.description,
    comment: input.comment || null,
    recorded_by_manager_id: input.recordedByManagerId || null,
  });
  if (error) throw error;
}

export async function createDepotExpense(input: {
  date: string;
  object: string;
  description: string;
  amount: number;
  responsible?: string;
  recordedByDepotId?: string | null;
}) {
  const { error } = await supabase.from("depot_expenses").insert({
    date: input.date,
    object: input.object,
    description: input.description,
    amount: input.amount,
    responsible: input.responsible || null,
    recorded_by_depot_id: input.recordedByDepotId || null,
  });
  if (error) throw error;
}
