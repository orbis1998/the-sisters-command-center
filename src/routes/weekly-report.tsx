import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useRole } from "@/lib/role-context";
import { supabase } from "@/lib/supabase-client";
import { calcLineRevenue } from "@/lib/accounting";
import { fmtUsd } from "@/lib/format";

export const Route = createFileRoute("/weekly-report")({
  component: WeeklyReportPage,
});

type Product = {
  id: string;
  name: string;
  selling_price: number;
};

function WeeklyReportPage() {
  const { role, manager, depotAccount } = useRole();
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  const isDepot = role === "depot";
  const isManager = role === "manager";
  const actorId = isDepot ? depotAccount?.report_manager_id : manager?.id;
  const locationId = isDepot ? depotAccount?.location_id : manager?.location_id;

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("erp_products")
        .select("id, name, selling_price")
        .order("name");
      setProducts((data || []) as Product[]);
    })();
  }, []);

  if (role === "ceo" || role === "loading" || role === "unauthorized") {
    return <div className="p-8 text-center">Réservé aux managers et au compte dépôt.</div>;
  }

  if (!isManager && !isDepot) {
    return <div className="p-8 text-center">Réservé aux managers et au compte dépôt.</div>;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const weekStart = String(fd.get("week_start") || "").trim();
    const weekEnd = String(fd.get("week_end") || "").trim();
    const observations = String(fd.get("observations") || "").trim();

    if (!weekStart || !weekEnd) {
      toast.error("Dates de semaine requises.");
      return;
    }
    if (!actorId || !locationId) {
      toast.error(isDepot ? "Compte dépôt non configuré (location / rapport)." : "Point de vente non assigné.");
      return;
    }

    setSaving(true);
    void (async () => {
      let retailRevenue = 0;
      let wholesaleRevenue = 0;
      const salesRows: {
        erp_product_id: string;
        retail_qty: number;
        wholesale_amount: number;
        retail_revenue: number;
        remaining_stock: number;
      }[] = [];

      for (const product of products) {
        const retailQty = Number(fd.get(`retail_${product.id}`) || 0);
        const wholesaleAmount = Number(fd.get(`wholesale_${product.id}`) || 0);
        const remainingRaw = String(fd.get(`remaining_${product.id}`) ?? "").trim();
        const remaining = remainingRaw === "" ? 0 : Number(remainingRaw);

        if (retailQty <= 0 && wholesaleAmount <= 0 && remainingRaw === "") continue;

        const lineRetail = calcLineRevenue(retailQty, Number(product.selling_price), 0);
        retailRevenue += lineRetail;
        wholesaleRevenue += wholesaleAmount;

        salesRows.push({
          erp_product_id: product.id,
          retail_qty: retailQty,
          wholesale_amount: wholesaleAmount,
          retail_revenue: lineRetail,
          remaining_stock: remaining,
        });
      }

      if (salesRows.length === 0) {
        toast.error("Remplissez au moins une ligne produit.");
        setSaving(false);
        return;
      }

      const totalRevenue = retailRevenue + wholesaleRevenue;
      const productsSold = salesRows.reduce((s, r) => s + r.retail_qty, 0);

      const { data: report, error: reportError } = await supabase
        .from("manager_reports")
        .insert({
          manager_id: actorId,
          location_id: locationId,
          week_start_date: weekStart,
          week_end_date: weekEnd,
          products_sold: productsSold,
          retail_revenue: retailRevenue,
          wholesale_revenue: wholesaleRevenue,
          total_revenue: totalRevenue,
          investment: 0,
          expenses: 0,
          salary: 0,
          rent: 0,
          observations: observations || null,
          status: "submitted",
        })
        .select("id")
        .single();

      if (reportError || !report) {
        toast.error(reportError?.message || "Erreur d'enregistrement");
        setSaving(false);
        return;
      }

      await supabase.from("manager_report_sales").insert(
        salesRows.map((row) => ({ ...row, report_id: report.id })),
      );

      for (const row of salesRows) {
        if (String(fd.get(`remaining_${row.erp_product_id}`) ?? "").trim() === "") continue;

        if (isDepot) {
          const { error: stockError } = await supabase.rpc("apply_depot_weekly_stock", {
            p_product_id: row.erp_product_id,
            p_remaining: row.remaining_stock,
            p_report_id: report.id,
          });
          if (stockError) {
            toast.error(stockError.message);
            setSaving(false);
            return;
          }
          continue;
        }

        const { data: existing } = await supabase
          .from("inventory_stock")
          .select("id")
          .eq("erp_product_id", row.erp_product_id)
          .eq("location_id", locationId)
          .maybeSingle();

        if (existing?.id) {
          await supabase.from("inventory_stock").update({ quantity: row.remaining_stock }).eq("id", existing.id);
        } else {
          await supabase.from("inventory_stock").insert({
            erp_product_id: row.erp_product_id,
            location_id: locationId,
            quantity: row.remaining_stock,
          });
        }

        await supabase.from("erp_stock_movements").insert({
          erp_product_id: row.erp_product_id,
          location_id: locationId,
          movement_type: "weekly_stock_update",
          quantity_change: 0,
          reference_type: "report",
          reference_id: report.id,
          notes: `Stock restant: ${row.remaining_stock}`,
        });
      }

      toast.success(`Rapport envoyé · Revenu: ${fmtUsd(totalRevenue)}`);
      form.reset();
      setSaving(false);
    })();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Rapport hebdomadaire"
        description={isDepot ? "Ventes et stock restant du dépôt global" : undefined}
      />

      <SectionCard title="Ventes & stock de la semaine">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="week_start">Début</Label>
              <Input id="week_start" name="week_start" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="week_end">Fin</Label>
              <Input id="week_end" name="week_end" type="date" required />
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="p-3">Produit</th>
                  <th className="p-3">Prix détail</th>
                  <th className="p-3">Qté détail</th>
                  <th className="p-3">Montant gros</th>
                  <th className="p-3">Stock restant</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-border/60">
                    <td className="p-3 font-medium">{product.name}</td>
                    <td className="p-3">{fmtUsd(Number(product.selling_price))}</td>
                    <td className="p-3">
                      <Input
                        name={`retail_${product.id}`}
                        type="number"
                        min="0"
                        defaultValue={0}
                        className="h-8 w-24"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        name={`wholesale_${product.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={0}
                        className="h-8 w-28"
                        placeholder="Montant"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        name={`remaining_${product.id}`}
                        type="number"
                        min="0"
                        className="h-8 w-24"
                        placeholder="Qté"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border bg-muted/20 p-4 text-sm">
            <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Aide à la saisie</div>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Chaque produit rempli apparaît ligne par ligne dans le rapport CEO.</li>
              <li>Revenu détail = quantité × prix unitaire admin.</li>
              <li>Gros = montant total saisi (pas la quantité).</li>
              {isDepot ? (
                <li>Le stock restant met à jour le stock global du dépôt.</li>
              ) : (
                <li>Les dépenses POS de la semaine sont rattachées automatiquement au détail CEO.</li>
              )}
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observations</Label>
            <Textarea id="observations" name="observations" className="min-h-[100px]" />
          </div>

          <Button type="submit" disabled={saving}>
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {saving ? "Envoi..." : "Envoyer le rapport"}
          </Button>
        </form>
      </SectionCard>
    </div>
  );
}
