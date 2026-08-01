import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRole } from "@/lib/role-context";
import { depotExpenseObjects, depotObjectLabel } from "@/lib/erp-constants";
import {
  createDepotExpense,
  loadDepotExpenses,
  type DepotExpense,
} from "@/lib/extended-expenses";
import { fmtUsd } from "@/lib/format";

export const Route = createFileRoute("/depot-expenses")({
  component: DepotExpensesPage,
});

function DepotExpensesPage() {
  const { role, depotAccount } = useRole();
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<DepotExpense[]>([]);
  const [object, setObject] = useState(depotExpenseObjects[0].value);

  const load = async () => {
    const data = await loadDepotExpenses(200);
    setRows(data);
  };

  useEffect(() => {
    if (role === "depot") void load().catch((e) => toast.error(e.message));
  }, [role]);

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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Dépenses du dépôt"
        description={`${depotAccount?.name || "Dépôt"} · mêmes catégories que les POS + charges dépôt`}
      />

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
            <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
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
              <div key={row.id} className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm">
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
    </div>
  );
}
