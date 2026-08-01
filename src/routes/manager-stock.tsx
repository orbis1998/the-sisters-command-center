import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { useRole } from "@/lib/role-context";
import { supabase } from "@/lib/supabase-client";
import { fmtNum } from "@/lib/format";
import { Loader2 } from "lucide-react";
import { stockStatus } from "@/lib/erp-constants";

export const Route = createFileRoute("/manager-stock")({
  component: ManagerStockPage,
});

type StockRow = {
  name: string;
  sku: string;
  quantity: number;
  minStock: number;
};

function ManagerStockPage() {
  const { role, manager } = useRole();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role !== "manager" || !manager?.location_id) return;
    void (async () => {
      const { data: stocks } = await supabase
        .from("inventory_stock")
        .select("erp_product_id, quantity")
        .eq("location_id", manager.location_id);

      const productIds = (stocks || []).map((s) => s.erp_product_id).filter(Boolean);
      if (productIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: products } = await supabase
        .from("erp_products")
        .select("id, name, sku, min_stock")
        .in("id", productIds);

      const productById = new Map((products || []).map((p) => [p.id, p]));
      setRows(
        (stocks || []).map((s) => {
          const p = productById.get(s.erp_product_id);
          return {
            name: p?.name || "Produit",
            sku: p?.sku || "—",
            quantity: Number(s.quantity || 0),
            minStock: Number(p?.min_stock || 10),
          };
        }),
      );
      setLoading(false);
    })();
  }, [role, manager?.location_id]);

  if (role === "ceo") return <div className="p-8 text-center">Réservé aux managers.</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Mon stock" description="Quantités au point de vente" />

      <SectionCard title="Inventaire">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Aucun stock. Complétez l'ouverture d'exercice ou un approvisionnement.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Produit</th>
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Qté</th>
                  <th className="py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.sku} className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-medium">{row.name}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{row.sku}</td>
                    <td className="py-2.5 pr-3">{fmtNum(row.quantity)}</td>
                    <td className="py-2.5">{stockStatus(row.quantity, row.minStock)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
