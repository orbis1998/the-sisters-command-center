import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { useRole } from "@/lib/role-context";
import { supabase } from "@/lib/supabase-client";
import { fmtNum, fmtUsd } from "@/lib/format";

export const Route = createFileRoute("/restocks")({
  component: RestocksPage,
});

type RestockRow = {
  id: string;
  date: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  notes: string | null;
  erp_products?: { name: string; sku: string } | null;
};

function RestocksPage() {
  const { isCEO } = useRole();
  const [history, setHistory] = useState<RestockRow[]>([]);

  useEffect(() => {
    if (!isCEO) return;
    void (async () => {
      const [{ data: productRows }, { data: restockRows }] = await Promise.all([
        supabase.from("erp_products").select("id, name, sku"),
        supabase
          .from("restocks")
          .select("id, date, quantity, unit_cost, total_cost, notes, erp_product_id")
          .order("date", { ascending: false })
          .limit(100),
      ]);

      const productsById = new Map((productRows || []).map((p) => [p.id, p]));
      setHistory(
        ((restockRows || []) as Array<RestockRow & { erp_product_id?: string }>).map((row) => ({
          ...row,
          erp_products: row.erp_product_id
            ? {
                name: productsById.get(row.erp_product_id)?.name || "Produit",
                sku: productsById.get(row.erp_product_id)?.sku || "",
              }
            : null,
        })),
      );
    })().catch((error) => toast.error(error instanceof Error ? error.message : "Erreur"));
  }, [isCEO]);

  if (!isCEO) {
    return <div className="p-8 text-center">Accès réservé à l'administration.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvisionnement dépôt"
        description="Consultation uniquement. La saisie est effectuée par le compte dépôt."
      />

      <SectionCard title="Historique des entrées">
        <div className="space-y-2">
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucun mouvement.</p>
          ) : (
            history.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <div className="font-medium">{row.erp_products?.name || "Produit"}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.date} · {row.erp_products?.sku}
                    {row.notes ? ` · ${row.notes}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div>+{fmtNum(row.quantity)}</div>
                  <div className="text-xs text-muted-foreground">{fmtUsd(Number(row.total_cost))}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}
