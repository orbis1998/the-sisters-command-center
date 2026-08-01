import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "@/components/kpi-card";
import { useRole } from "@/lib/role-context";
import { supabase } from "@/lib/supabase-client";
import {
  ceoPersonalOwners,
  depotObjectLabel,
  monthlyExpenseCategories,
} from "@/lib/erp-constants";
import {
  loadCeoPersonalExpenses,
  loadDepotExpenses,
  sumCeoByOwner,
  type CeoPersonalExpense,
  type DepotExpense,
} from "@/lib/extended-expenses";
import { fmtUsd } from "@/lib/format";
import { Receipt, User, Warehouse } from "lucide-react";

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
  const [ceoExpenses, setCeoExpenses] = useState<CeoPersonalExpense[]>([]);
  const [depotExpenses, setDepotExpenses] = useState<DepotExpense[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isCEO) return;
    void (async () => {
      try {
        const [{ data }, { data: managers }, { data: locations }, ceoRows, depotRows] = await Promise.all([
          supabase.from("global_expenses").select("*").order("date", { ascending: false }).limit(200),
          supabase.from("erp_managers").select("id, name"),
          supabase.from("locations").select("id, name"),
          loadCeoPersonalExpenses(300),
          loadDepotExpenses(300),
        ]);
        setExpenses((data || []) as Expense[]);
        setCeoExpenses(ceoRows);
        setDepotExpenses(depotRows);
        const map: Record<string, string> = {};
        (managers || []).forEach((m) => {
          map[`m:${m.id}`] = m.name;
        });
        (locations || []).forEach((l) => {
          map[`l:${l.id}`] = l.name;
        });
        setLabels(map);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erreur de chargement");
      }
    })();
  }, [isCEO]);

  if (!isCEO) return <div className="p-8 text-center">Accès réservé à l'administration.</div>;

  const ceoTotals = sumCeoByOwner(ceoExpenses);
  const depotTotal = depotExpenses.reduce((s, r) => s + r.amount, 0);
  const operatingTotal = expenses
    .filter((e) => e.category !== "stock_purchase" && e.category !== "investment")
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dépenses"
        description="Consultation uniquement. Les managers saisissent les dépenses POS et CEO ; le compte dépôt saisit les charges dépôt."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Opérationnelles POS" value={fmtUsd(operatingTotal)} icon={Receipt} />
        <KpiCard label="Axelle" value={fmtUsd(ceoTotals.axelle)} icon={User} tone="gold" />
        <KpiCard label="Allexe" value={fmtUsd(ceoTotals.allexe)} icon={User} />
        <KpiCard label="Dépôt" value={fmtUsd(depotTotal)} icon={Warehouse} />
      </div>

      <Tabs defaultValue="operating" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="operating">Opérationnelles POS</TabsTrigger>
          <TabsTrigger value="ceo">Personnelles CEO</TabsTrigger>
          <TabsTrigger value="depot">Dépenses du dépôt</TabsTrigger>
        </TabsList>

        <TabsContent value="operating" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {monthlyExpenseCategories.map((category) => {
              const rows = expenses.filter((e) => e.category === category.value);
              const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
              return (
                <SectionCard key={category.value} title={category.label} description={`Total: ${fmtUsd(total)}`}>
                  <div className="max-h-72 space-y-2 overflow-y-auto">
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
                            {row.description && <div className="mt-0.5 text-xs">{row.description}</div>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </SectionCard>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="ceo" className="space-y-4">
          <SectionCard title="Dépenses personnelles des CEO" description="Saisies par les managers POS — lecture seule ici">
            <div className="grid gap-4 lg:grid-cols-2">
              {ceoPersonalOwners.map((owner) => {
                const rows = ceoExpenses.filter((r) => r.owner === owner.value);
                const total = rows.reduce((s, r) => s + r.amount, 0);
                return (
                  <div key={owner.value} className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <div className="font-display text-lg font-semibold">{owner.label}</div>
                        <div className="text-[11px] tracking-widest text-muted-foreground">{owner.code}</div>
                      </div>
                      <div className="font-semibold">{fmtUsd(total)}</div>
                    </div>
                    <div className="max-h-80 space-y-2 overflow-y-auto">
                      {rows.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">Aucun historique.</p>
                      ) : (
                        rows.map((row) => (
                          <div key={row.id} className="rounded-md border p-2.5 text-sm">
                            <div className="flex justify-between gap-3">
                              <div className="font-medium">{row.description}</div>
                              <div className="shrink-0 font-semibold">{fmtUsd(row.amount)}</div>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">{row.date}</div>
                            {row.comment && <div className="mt-1 text-xs">{row.comment}</div>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="depot" className="space-y-4">
          <SectionCard title="Dépenses du dépôt" description={`Total: ${fmtUsd(depotTotal)} · Saisies par le compte dépôt`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Objet</th>
                    <th className="py-2 pr-3">Description</th>
                    <th className="py-2 pr-3">Responsable</th>
                    <th className="py-2 pr-3 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {depotExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        Aucune dépense dépôt.
                      </td>
                    </tr>
                  ) : (
                    depotExpenses.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="py-2.5 pr-3">{row.date}</td>
                        <td className="py-2.5 pr-3 font-medium">{depotObjectLabel(row.object)}</td>
                        <td className="py-2.5 pr-3">{row.description}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{row.responsible || "—"}</td>
                        <td className="py-2.5 pr-3 text-right font-semibold">{fmtUsd(row.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
