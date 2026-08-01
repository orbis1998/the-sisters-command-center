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
import { ceoPersonalOwners, monthlyExpenseCategories, type CeoPersonalOwner } from "@/lib/erp-constants";
import {
  createCeoPersonalExpense,
  loadCeoPersonalExpenses,
  type CeoPersonalExpense,
} from "@/lib/extended-expenses";
import { loadManagerCash } from "@/lib/manager-cash";
import { supabase } from "@/lib/supabase-client";
import { fmtUsd } from "@/lib/format";

export const Route = createFileRoute("/manager-expenses")({
  component: ManagerExpensesPage,
});

type Expense = {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string | null;
};

type Transfer = {
  id: string;
  date: string;
  amount: number;
  notes: string | null;
};

function ManagerExpensesPage() {
  const { role, manager } = useRole();
  const [activeCategory, setActiveCategory] = useState<string>(monthlyExpenseCategories[0].value);
  const [activeCeoOwner, setActiveCeoOwner] = useState<CeoPersonalOwner>("axelle");
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<Expense[]>([]);
  const [ceoRecent, setCeoRecent] = useState<CeoPersonalExpense[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [cashAvailable, setCashAvailable] = useState<number | null>(null);

  const load = async () => {
    if (!manager?.id) return;
    try {
      const [{ data }, ceoRows, cash, { data: transferRows }] = await Promise.all([
        supabase
          .from("global_expenses")
          .select("id, date, category, amount, description")
          .eq("recorded_by", manager.id)
          .order("date", { ascending: false })
          .limit(20),
        loadCeoPersonalExpenses(100),
        loadManagerCash(manager.id, manager.location_id),
        supabase
          .from("manager_cash_transfers")
          .select("id, date, amount, notes")
          .eq("manager_id", manager.id)
          .order("date", { ascending: false })
          .limit(20),
      ]);
      setRecent((data || []) as Expense[]);
      setCeoRecent(ceoRows.filter((r) => r.owner === activeCeoOwner).slice(0, 20));
      setCashAvailable(cash.cashAvailable);
      setTransfers((transferRows || []) as Transfer[]);
    } catch {
      setCashAvailable(0);
    }
  };

  useEffect(() => {
    if (role === "manager") void load();
  }, [role, manager?.id, activeCeoOwner]);

  if (role !== "manager") {
    return <div className="p-8 text-center">Réservé aux managers des points de vente.</div>;
  }

  const handlePosSubmit = (e: FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const date = String(fd.get("date") || "").trim();
    const amount = Number(fd.get("amount") || 0);
    const description = String(fd.get("description") || "").trim();

    if (!date || !amount) {
      toast.error("Date et montant requis.");
      return;
    }
    if (!manager?.id) {
      toast.error("Manager non connecté.");
      return;
    }

    setSaving(true);
    void (async () => {
      try {
        const cash = await loadManagerCash(manager.id, manager.location_id);
        setCashAvailable(cash.cashAvailable);
        if (amount > cash.cashAvailable + 0.001) {
          toast.error(
            `Fonds insuffisants (disponible: ${fmtUsd(cash.cashAvailable)}). Enregistrez d'abord vos ventes.`,
          );
          return;
        }

        const { error } = await supabase.from("global_expenses").insert({
          date,
          category: activeCategory,
          amount,
          description: description || null,
          recorded_by: manager.id,
          location_id: manager.location_id ?? null,
        });

        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Dépense enregistrée");
          form.reset();
          await load();
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer");
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleTransferSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!manager?.id) {
      toast.error("Manager non connecté.");
      return;
    }

    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const date = String(fd.get("date") || new Date().toISOString().slice(0, 10));
    const amount = Number(fd.get("amount") || 0);
    const notes = String(fd.get("notes") || "").trim();

    if (amount <= 0) {
      toast.error("Montant invalide.");
      return;
    }

    setSaving(true);
    void (async () => {
      try {
        const cash = await loadManagerCash(manager.id, manager.location_id);
        setCashAvailable(cash.cashAvailable);
        if (amount > cash.cashAvailable + 0.001) {
          toast.error(
            `Fonds insuffisants (disponible: ${fmtUsd(cash.cashAvailable)}). Enregistrez d'abord vos ventes.`,
          );
          return;
        }

        const { error } = await supabase.from("manager_cash_transfers").insert({
          manager_id: manager.id,
          location_id: manager.location_id,
          date,
          amount,
          notes: notes || "Remise / transfert siège",
        });

        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Transfert enregistré — caisse diminuée");
          form.reset();
          await load();
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer");
      } finally {
        setSaving(false);
      }
    })();
  };

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
          recordedByManagerId: manager?.id ?? null,
        });
        toast.success(`Dépense enregistrée pour ${activeCeoOwner === "axelle" ? "Axelle" : "Allexe"}`);
        form.reset();
        await load();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer");
      } finally {
        setSaving(false);
      }
    })();
  };

  const label = monthlyExpenseCategories.find((c) => c.value === activeCategory)?.label || activeCategory;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Dépenses" />

      <Tabs defaultValue="pos" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="pos">Point de vente</TabsTrigger>
          <TabsTrigger value="transfer">Transfert / remise</TabsTrigger>
          <TabsTrigger value="ceo">Personnelles CEO</TabsTrigger>
        </TabsList>

        <TabsContent value="pos" className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {monthlyExpenseCategories.map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() => setActiveCategory(category.value)}
                className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  activeCategory === category.value
                    ? "border-primary bg-primary/10 font-medium"
                    : "hover:bg-muted/50"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          <SectionCard title={label}>
            <form className="space-y-4" onSubmit={handlePosSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
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
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant</Label>
                  <Input id="amount" name="amount" type="number" min="0" step="0.01" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Détail</Label>
                <Textarea id="description" name="description" />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Enregistrement..." : `Enregistrer ${label.toLowerCase()}`}
              </Button>
            </form>
          </SectionCard>

          <SectionCard title="Historique POS">
            <div className="space-y-2">
              {recent.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucune dépense.</p>
              ) : (
                recent.map((row) => (
                  <div key={row.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <div>
                      <div className="font-medium">
                        {monthlyExpenseCategories.find((c) => c.value === row.category)?.label ||
                          row.category}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.date}
                        {row.description ? ` · ${row.description}` : ""}
                      </div>
                    </div>
                    <div className="font-semibold">−{fmtUsd(Number(row.amount))}</div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="transfer" className="space-y-4">
          <SectionCard title="Transfert / remise">
            <form className="space-y-4" onSubmit={handleTransferSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="transfer_date">Date</Label>
                  <Input
                    id="transfer_date"
                    name="date"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer_amount">Montant</Label>
                  <Input
                    key={cashAvailable ?? "na"}
                    id="transfer_amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={
                      cashAvailable && cashAvailable > 0
                        ? String(Math.round(cashAvailable * 100) / 100)
                        : ""
                    }
                    required
                  />
                  {cashAvailable !== null && cashAvailable > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="px-0"
                      onClick={() => {
                        const el = document.getElementById(
                          "transfer_amount",
                        ) as HTMLInputElement | null;
                        if (el) el.value = String(Math.round(cashAvailable * 100) / 100);
                      }}
                    >
                      Remettre tout ({fmtUsd(cashAvailable)})
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transfer_notes">Notes</Label>
                <Textarea id="transfer_notes" name="notes" rows={2} placeholder="Remise siège…" />
              </div>
              <Button type="submit" disabled={saving || (cashAvailable !== null && cashAvailable <= 0)}>
                {saving ? "Enregistrement..." : "Enregistrer le transfert"}
              </Button>
            </form>
          </SectionCard>

          <SectionCard title="Historique transferts">
            <div className="space-y-2">
              {transfers.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucun transfert.</p>
              ) : (
                transfers.map((row) => (
                  <div key={row.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <div>
                      <div className="font-medium">Transfert / remise</div>
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
                <Input
                  id="ceo_date"
                  name="date"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  required
                />
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
                  {saving
                    ? "Enregistrement..."
                    : `Ajouter pour ${activeCeoOwner === "axelle" ? "Axelle" : "Allexe"}`}
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              {ceoRecent.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aucun historique pour cette personne.
                </p>
              ) : (
                ceoRecent.map((row) => (
                  <div key={row.id} className="rounded-md border p-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <div className="font-medium">{row.description}</div>
                      <div className="font-semibold">{fmtUsd(row.amount)}</div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{row.date}</div>
                    {row.comment && <div className="mt-1 text-xs">{row.comment}</div>}
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
