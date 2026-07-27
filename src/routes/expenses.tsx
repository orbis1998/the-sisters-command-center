import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { useRole } from "@/lib/role-context";
import { supabase } from "@/lib/supabase-client";
import { monthlyExpenseCategories } from "@/lib/erp-constants";
import { fmtUsd } from "@/lib/format";

export const Route = createFileRoute("/expenses")({
  component: ExpensesPage,
});

type Expense = {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string | null;
  location_id: string | null;
  recorded_by: string | null;
};

function ExpensesPage() {
  const { isCEO } = useRole();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isCEO) return;
    void (async () => {
      const [{ data }, { data: managers }, { data: locations }] = await Promise.all([
        supabase.from("global_expenses").select("*").order("date", { ascending: false }).limit(200),
        supabase.from("erp_managers").select("id, name"),
        supabase.from("locations").select("id, name"),
      ]);
      setExpenses((data || []) as Expense[]);
      const map: Record<string, string> = {};
      (managers || []).forEach((m) => {
        map[`m:${m.id}`] = m.name;
      });
      (locations || []).forEach((l) => {
        map[`l:${l.id}`] = l.name;
      });
      setLabels(map);
    })();
  }, [isCEO]);

  if (!isCEO) return <div className="p-8 text-center">Accès réservé à l'administration.</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Dépenses" />

      <div className="grid gap-4 lg:grid-cols-2">
        {monthlyExpenseCategories.map((category) => {
          const rows = expenses.filter((e) => e.category === category.value);
          const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
          return (
            <SectionCard
              key={category.value}
              title={category.label}
              description={`Total: ${fmtUsd(total)}`}
            >
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {rows.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Aucune saisie.</p>
                ) : (
                  rows.slice(0, 20).map((row) => (
                    <div key={row.id} className="flex items-start justify-between gap-3 rounded-md border p-2.5 text-sm">
                      <div>
                        <div className="font-medium">{fmtUsd(Number(row.amount))}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.date}
                          {row.recorded_by ? ` · ${labels[`m:${row.recorded_by}`] || "Manager"}` : ""}
                          {row.location_id ? ` · ${labels[`l:${row.location_id}`] || ""}` : ""}
                        </div>
                        {row.description && <div className="text-xs mt-0.5">{row.description}</div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
