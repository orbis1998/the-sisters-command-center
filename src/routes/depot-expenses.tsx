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
import { useRole } from "@/lib/role-context";
import { depotExpenseObjects, depotObjectLabel } from "@/lib/erp-constants";
import {
  createDepotExpense,
  loadDepotExpenses,
  type DepotExpense,
} from "@/lib/extended-expenses";
import {
  loadAssistancesSentByDepot,
  loadPosLocationsForAssistance,
  submitFinancialAssistance,
  type FinancialAssistanceRow,
} from "@/lib/financial-assistance";
import { fmtUsd } from "@/lib/format";

export const Route = createFileRoute("/depot-expenses")({
  component: DepotExpensesPage,
});

function DepotExpensesPage() {
  const { role, depotAccount } = useRole();
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<DepotExpense[]>([]);
  const [object, setObject] = useState(depotExpenseObjects[0].value);
  const [assistances, setAssistances] = useState<FinancialAssistanceRow[]>([]);
  const [posTargets, setPosTargets] = useState<{ id: string; name: string }[]>([]);

  const load = async () => {
    const [data, targets, sent] = await Promise.all([
      loadDepotExpenses(200),
      loadPosLocationsForAssistance(),
      depotAccount?.id
        ? loadAssistancesSentByDepot(depotAccount.id, 40).catch(() => [])
        : Promise.resolve([] as FinancialAssistanceRow[]),
    ]);
    setRows(data);
    setPosTargets(targets);
    setAssistances(sent);
  };

  useEffect(() => {
    if (role === "depot") void load().catch((e) => toast.error(e.message));
  }, [role, depotAccount?.id]);

  if (role !== "depot") {
    return <div className="p-8 text-center">Réservé au compte dépôt.</div>;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
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
          recordedByDepotId: depotAccount?.id ?? null,
        });
        toast.success("Dépense dépôt enregistrée");
        form.reset();
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erreur");
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleAssistanceSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!depotAccount?.id) {
      toast.error("Compte dépôt manquant.");
      return;
    }
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const date = String(fd.get("date") || new Date().toISOString().slice(0, 10));
    const amount = Number(fd.get("amount") || 0);
    const toLocationId = String(fd.get("to_location_id") || "").trim();
    const notes = String(fd.get("notes") || "").trim();

    if (!toLocationId || amount <= 0) {
      toast.error("Bénéficiaire et montant requis.");
      return;
    }

    setSaving(true);
    void (async () => {
      try {
        await submitFinancialAssistance({
          amount,
          toLocationId,
          fromType: "depot",
          fromDepotId: depotAccount.id,
          performedByDepotId: depotAccount.id,
          date,
          notes,
        });
        toast.success("Assistance financière envoyée au POS");
        form.reset();
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erreur");
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Dépenses du dépôt"
        description={`${depotAccount?.name || "Dépôt"} · charges dépôt + assistance vers POS`}
      />

      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="expenses">Dépenses</TabsTrigger>
          <TabsTrigger value="assistance">Assistance financière</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          <SectionCard title="Nouvelle dépense">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label>Objet / catégorie</Label>
                <select
                  value={object}
                  onChange={(e) => setObject(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  required
                >
                  {depotExpenseObjects.map((obj) => (
                    <option key={obj.value} value={obj.value}>
                      {obj.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description détaillée</Label>
                <Textarea id="description" name="description" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Montant</Label>
                <Input id="amount" name="amount" type="number" min="0.01" step="0.01" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsible">Responsable (optionnel)</Label>
                <Input id="responsible" name="responsible" />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Historique">
            <div className="space-y-2">
              {rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucune dépense.</p>
              ) : (
                rows.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">{depotObjectLabel(row.object)}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.date}
                        {row.responsible ? ` · ${row.responsible}` : ""}
                      </div>
                      <div className="mt-1 text-xs">{row.description}</div>
                    </div>
                    <div className="font-semibold">{fmtUsd(row.amount)}</div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="assistance" className="space-y-4">
          <SectionCard title="Envoyer une assistance à un POS">
            <p className="mb-4 text-sm text-muted-foreground">
              Le dépôt peut uniquement envoyer. Il n&apos;apparaît jamais comme bénéficiaire et ne
              reçoit pas d&apos;aide financière.
            </p>
            <form className="space-y-4" onSubmit={handleAssistanceSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="assist_date">Date</Label>
                  <Input
                    id="assist_date"
                    name="date"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assist_amount">Montant</Label>
                  <Input
                    id="assist_amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="to_location_id">POS bénéficiaire</Label>
                  <select
                    id="to_location_id"
                    name="to_location_id"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Choisir un point de vente…
                    </option>
                    {posTargets.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="assist_notes">Notes (optionnel)</Label>
                  <Textarea id="assist_notes" name="notes" rows={2} />
                </div>
              </div>
              <Button type="submit" disabled={saving || posTargets.length === 0}>
                {saving ? "Envoi..." : "Envoyer l'assistance"}
              </Button>
            </form>
          </SectionCard>

          <SectionCard title="Historique des envois">
            <div className="space-y-2">
              {assistances.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Aucune assistance envoyée.
                </p>
              ) : (
                assistances.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">Vers {row.toName}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.date}
                        {row.notes ? ` · ${row.notes}` : ""}
                      </div>
                    </div>
                    <div className="font-semibold">−{fmtUsd(row.amount)}</div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
