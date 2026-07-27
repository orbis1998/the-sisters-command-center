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
import { monthlyExpenseCategories } from "@/lib/erp-constants";
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

function ManagerExpensesPage() {
  const { role, manager } = useRole();
  const [activeCategory, setActiveCategory] = useState<string>(monthlyExpenseCategories[0].value);
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<Expense[]>([]);

  const load = async () => {
    if (!manager?.id) return;
    const { data } = await supabase
      .from("global_expenses")
      .select("id, date, category, amount, description")
      .eq("recorded_by", manager.id)
      .order("date", { ascending: false })
      .limit(20);
    setRecent((data || []) as Expense[]);
  };

  useEffect(() => {
    if (role === "manager") void load();
  }, [role, manager?.id]);

  if (role === "ceo") {
    return <div className="p-8 text-center">Réservé aux managers.</div>;
  }

  const handleSubmit = (e: FormEvent) => {
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

    setSaving(true);
    void (async () => {
      const { error } = await supabase.from("global_expenses").insert({
        date,
        category: activeCategory,
        amount,
        description: description || null,
        recorded_by: manager?.id ?? null,
        location_id: manager?.location_id ?? null,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Dépense enregistrée");
        form.reset();
        await load();
      }
      setSaving(false);
    })();
  };

  const label = monthlyExpenseCategories.find((c) => c.value === activeCategory)?.label || activeCategory;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title="Dépenses mensuelles" />

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
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
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

      <SectionCard title="Historique">
        <div className="space-y-2">
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucune dépense.</p>
          ) : (
            recent.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <div className="font-medium">
                    {monthlyExpenseCategories.find((c) => c.value === row.category)?.label || row.category}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {row.date}
                    {row.description ? ` · ${row.description}` : ""}
                  </div>
                </div>
                <div className="font-semibold">{fmtUsd(Number(row.amount))}</div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}
