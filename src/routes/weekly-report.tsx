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
import { calcRetailRevenue } from "@/lib/accounting";
import { fmtNum, fmtUsd } from "@/lib/format";

export const Route = createFileRoute("/weekly-report")({
  component: WeeklyReportPage,
});

type ProductRow = {
  id: string;
  name: string;
  selling_price: number;
  current_qty: number;
};

function WeeklyReportPage() {
  const { role, manager } = useRole();
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);

  useEffect(() => {
    if (role !== "manager" || !manager?.location_id) return;
    void (async () => {
      const { data: stocks } = await supabase
        .from("inventory_stock")
        .select("erp_product_id, quantity")
        .eq("location_id", manager.location_id)
        .gt("quantity", 0);

      const ids = (stocks || []).map((s) => s.erp_product_id).filter(Boolean) as string[];
      if (!ids.length) {
        setProducts([]);
        return;
      }

      const qtyById = new Map((stocks || []).map((s) => [s.erp_product_id, Number(s.quantity || 0)]));
      const { data } = await supabase
        .from("erp_products")
        .select("id, name, selling_price")
        .in("id", ids)
        .order("name");

      setProducts(
        (data || []).map((p) => ({
          id: p.id,
          name: p.name,
          selling_price: Number(p.selling_price || 0),
          current_qty: qtyById.get(p.id) || 0,
        })),
      );
    })();
  }, [role, manager?.location_id]);

  if (role !== "manager") {
    return <div className="p-8 text-center">Réservé aux managers des points de vente.</div>;
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
    if (!manager?.id || !manager.location_id) {
      toast.error("Point de vente non assigné.");
      return;
    }

    setSaving(true);
    void (async () => {
      let retailRevenue = 0;
      let wholesaleRevenue = 0;
      const salesRows: {
        erp_product_id: string;
        retail_qty: number;
        wholesale_qty: number;
        wholesale_unit_price: number;
        wholesale_amount: number;
        retail_revenue: number;
        remaining_stock: number;
      }[] = [];

      for (const product of products) {
        const retailQty = Number(fd.get(`retail_${product.id}`) || 0);
        const wholesaleQty = Number(fd.get(`wholesale_qty_${product.id}`) || 0);
        const wholesaleUnit = Number(fd.get(`wholesale_unit_${product.id}`) || 0);
        const sold = retailQty + wholesaleQty;

        if (sold <= 0) continue;

        if (sold > product.current_qty) {
          toast.error(`Stock insuffisant pour ${product.name} (dispo: ${product.current_qty}).`);
          setSaving(false);
          return;
        }

        const lineRetail = calcRetailRevenue(retailQty, Number(product.selling_price));
        const lineWholesale = wholesaleQty * wholesaleUnit;
        retailRevenue += lineRetail;
        wholesaleRevenue += lineWholesale;

        salesRows.push({
          erp_product_id: product.id,
          retail_qty: retailQty,
          wholesale_qty: wholesaleQty,
          wholesale_unit_price: wholesaleUnit,
          wholesale_amount: lineWholesale,
          retail_revenue: lineRetail,
          remaining_stock: product.current_qty - sold,
        });
      }

      if (salesRows.length === 0) {
        toast.error("Remplissez au moins une vente.");
        setSaving(false);
        return;
      }

      const totalRevenue = retailRevenue + wholesaleRevenue;
      const productsSold = salesRows.reduce((s, r) => s + r.retail_qty + r.wholesale_qty, 0);

      const { data: report, error: reportError } = await supabase
        .from("manager_reports")
        .insert({
          manager_id: manager.id,
          location_id: manager.location_id,
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
        const { data: existing } = await supabase
          .from("inventory_stock")
          .select("id")
          .eq("erp_product_id", row.erp_product_id)
          .eq("location_id", manager.location_id)
          .maybeSingle();

        if (existing?.id) {
          await supabase.from("inventory_stock").update({ quantity: row.remaining_stock }).eq("id", existing.id);
        }

        await supabase.from("erp_stock_movements").insert({
          erp_product_id: row.erp_product_id,
          location_id: manager.location_id,
          movement_type: "weekly_stock_update",
          quantity_change: -(row.retail_qty + row.wholesale_qty),
          reference_type: "report",
          reference_id: report.id,
          notes: `Ventes détail ${row.retail_qty} · gros ${row.wholesale_qty}`,
        });
      }

      toast.success(`Rapport envoyé · ${fmtUsd(totalRevenue)}`);
      form.reset();
      setProducts((prev) =>
        prev
          .map((p) => {
            const sold = salesRows.find((r) => r.erp_product_id === p.id);
            if (!sold) return p;
            return { ...p, current_qty: sold.remaining_stock };
          })
          .filter((p) => p.current_qty > 0),
      );
      setSaving(false);
    })();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Rapport hebdomadaire" description="Produits en stock sur votre point de vente" />

      <SectionCard title="Ventes de la semaine">
        {products.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucun produit en stock. Complétez l'ouverture d'exercice ou un approvisionnement.
          </p>
        ) : (
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
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="p-3">Produit</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3">Prix détail</th>
                    <th className="p-3">Qté détail</th>
                    <th className="p-3">Qté gros</th>
                    <th className="p-3">Prix unit. gros</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-border/60">
                      <td className="p-3 font-medium">{product.name}</td>
                      <td className="p-3">{fmtNum(product.current_qty)}</td>
                      <td className="p-3">{fmtUsd(product.selling_price)}</td>
                      <td className="p-3">
                        <Input
                          name={`retail_${product.id}`}
                          type="number"
                          min="0"
                          max={product.current_qty}
                          defaultValue={0}
                          className="h-8 w-24"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          name={`wholesale_qty_${product.id}`}
                          type="number"
                          min="0"
                          max={product.current_qty}
                          defaultValue={0}
                          className="h-8 w-24"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          name={`wholesale_unit_${product.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={0}
                          className="h-8 w-28"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
        )}
      </SectionCard>
    </div>
  );
}
