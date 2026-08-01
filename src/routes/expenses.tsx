import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "@/components/kpi-card";
import { useRole } from "@/lib/role-context";
import { supabase } from "@/lib/supabase-client";
import {
  ceoPersonalOwners,
  depotExpenseObjects,
  depotObjectLabel,
  monthlyExpenseCategories,
  type CeoPersonalOwner,
} from "@/lib/erp-constants";
import {
  createCeoPersonalExpense,
  createDepotExpense,
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
  const { isCEO, user } = useRole();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ceoExpenses, setCeoExpenses] = useState<CeoPersonalExpense[]>([]);
  const [depotExpenses, setDepotExpenses] = useState<DepotExpense[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [activeCeoOwner, setActiveCeoOwner] = useState<CeoPersonalOwner>("axelle");

  const reload = async () => {
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
  };

  useEffect(() => {
    if (!isCEO) return;
    void reload().catch((err) => toast.error(err instanceof Error ? err.message : "Erreur de chargement"));
  }, [isCEO]);

  if (!isCEO) return <div className="p-8 text-center">Accès réservé à l'administration.</div>;

  const ceoTotals = sumCeoByOwner(ceoExpenses);
  const depotTotal = depotExpenses.reduce((s, r) => s + r.amount, 0);
  const operatingTotal = expenses
    .filter((e) => e.category !== "stock_purchase" && e.category !== "investment")
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const handleCeoSubmit = (e: FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const description = String(fd.get("description") || "").trim();
    const amount = Number(fd.get("amount") || 0);
    const date = String(fd.get("date") || "");
    const comment = String(fd.get("comment") || "").trim();
    if (!description || amount <= 0 || !date) {
      toast.error("Description, montant et date sont requis.");
      return;
    }
    setSaving(true);
    void (async () => {
      try {
        await createCeoPersonalExpense({
          owner: activeCeoOwner,
          date,
          amount,
          description,
          comment,
          recordedBy: user?.id ?? null,
        });
        toast.success(`Dépense enregistrée pour ${activeCeoOwner === "axelle" ? "Axelle" : "Allexe"}`);
        form.reset();
        await reload();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer");
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleDepotSubmit = (e: FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const object = String(fd.get("object") || "").trim();
    const description = String(fd.get("description") || "").trim();
    const amount = Number(fd.get("amount") || 0);
    const date = String(fd.get("date") || "");
    const responsible = String(fd.get("responsible") || "").trim();
    if (!object || !description || amount <= 0 || !date) {
      toast.error("Objet, description, montant et date sont requis.");
      return;
    }
    setSaving(true);
    void (async () => {
      try {
        await createDepotExpense({
          date,
          object,
          description,
          amount,
          responsible,
          createdBy: user?.id ?? null,
        });
        toast.success("Dépense dépôt enregistrée");
        form.reset();
        await reload();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer");
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dépenses"
        description="Suivi séparé des dépenses opérationnelles, personnelles des CEO et du dépôt."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Opérationnelles" value={fmtUsd(operatingTotal)} icon={Receipt} />
        <KpiCard label="Axelle" value={fmtUsd(ceoTotals.axelle)} icon={User} tone="gold" />
        <KpiCard label="Allexe" value={fmtUsd(ceoTotals.allexe)} icon={User} />
        <KpiCard label="Dépôt" value={fmtUsd(depotTotal)} icon={Warehouse} />
      </div>

      <Tabs defaultValue="operating" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="operating">Opérationnelles</TabsTrigger>
          <TabsTrigger value="ceo">Personnelles CEO</TabsTrigger>
          <TabsTrigger value="depot">Dépenses du dépôt</TabsTrigger>
        </TabsList>

        <TabsContent value="operating" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Dépenses saisies par les points de vente (transport, salaires POS, etc.). Lecture seule ici.
          </p>
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
          <SectionCard title="Dépenses personnelles des CEO">
            <div className="mb-4 flex flex-wrap gap-2">
              {ceoPersonalOwners.map((owner) => (
                <Button
                  key={owner.value}
                  type="button"
                  size="sm"
                  variant={activeCeoOwner === owner.value ? "default" : "outline"}
                  onClick={() => setActiveCeoOwner(owner.value)}
                >
                  {owner.label}
                  <span className="ml-2 text-[10px] tracking-widest opacity-70">{owner.code}</span>
                </Button>
              ))}
            </div>

            <form className="mb-6 grid gap-4 md:grid-cols-2" onSubmit={handleCeoSubmit}>
              <div className="space-y-2 md:col-span-2">
                <Label>Auteur</Label>
                <Input
                  value={activeCeoOwner === "axelle" ? "Axelle" : "Allexe"}
                  readOnly
                  className="bg-muted/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ceo_date">Date</Label>
                <Input id="ceo_date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ceo_amount">Montant</Label>
                <Input id="ceo_amount" name="amount" type="number" min="0.01" step="0.01" required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ceo_description">Description</Label>
                <Input id="ceo_description" name="description" required placeholder="Objet de la dépense" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ceo_comment">Commentaire (optionnel)</Label>
                <Textarea id="ceo_comment" name="comment" />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Enregistrement..." : `Ajouter pour ${activeCeoOwner === "axelle" ? "Axelle" : "Allexe"}`}
                </Button>
              </div>
            </form>

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
                            <div className="mt-1 text-xs text-muted-foreground">
                              {row.date} · Auteur: {owner.label}
                            </div>
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
          <SectionCard title="Dépenses du dépôt" description={`Total: ${fmtUsd(depotTotal)}`}>
            <form className="mb-6 grid gap-4 md:grid-cols-2" onSubmit={handleDepotSubmit}>
              <div className="space-y-2">
                <Label htmlFor="depot_object">Objet de la dépense</Label>
                <select
                  id="depot_object"
                  name="object"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Choisir
                  </option>
                  {depotExpenseObjects.map((obj) => (
                    <option key={obj.value} value={obj.value}>
                      {obj.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="depot_date">Date</Label>
                <Input id="depot_date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="depot_description">Description détaillée</Label>
                <Textarea id="depot_description" name="description" required placeholder="Détail de la sortie d'argent" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="depot_amount">Montant</Label>
                <Input id="depot_amount" name="amount" type="number" min="0.01" step="0.01" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="depot_responsible">Responsable (optionnel)</Label>
                <Input id="depot_responsible" name="responsible" placeholder="Nom" />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Enregistrement..." : "Ajouter une dépense dépôt"}
                </Button>
              </div>
            </form>

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
