import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { useRole } from "@/lib/role-context";
import { supabase } from "@/lib/supabase-client";
import { fmtUsd, fmtNum } from "@/lib/format";
import { KpiCard } from "@/components/kpi-card";
import { Coins, Package } from "lucide-react";

export const Route = createFileRoute("/investments")({
  component: InvestmentsPage,
});

type Investment = {
  id: string;
  date: string;
  total_amount: number;
  notes: string | null;
  manager_id: string;
  location_id: string | null;
};

function InvestmentsPage() {
  const { isCEO } = useRole();
  const [rows, setRows] = useState<Array<Investment & { manager?: string; location?: string; items?: string }>>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [qtyMoved, setQtyMoved] = useState(0);

  useEffect(() => {
    if (!isCEO) return;
    void (async () => {
      const [{ data: investments }, { data: items }, { data: managers }, { data: locations }, { data: products }] =
        await Promise.all([
          supabase.from("manager_investments").select("*").order("date", { ascending: false }).limit(50),
          supabase.from("manager_investment_items").select("investment_id, quantity, erp_product_id, line_total"),
          supabase.from("erp_managers").select("id, name"),
          supabase.from("locations").select("id, name"),
          supabase.from("erp_products").select("id, name"),
        ]);

      const managerById = new Map((managers || []).map((m) => [m.id, m.name]));
      const locationById = new Map((locations || []).map((l) => [l.id, l.name]));
      const productById = new Map((products || []).map((p) => [p.id, p.name]));

      const qty = (items || []).reduce((sum, i) => sum + Number(i.quantity || 0), 0);
      setQtyMoved(qty);
      setTotalPaid((investments || []).reduce((sum, i) => sum + Number(i.total_amount || 0), 0));

      setRows(
        ((investments || []) as Investment[]).map((inv) => {
          const invItems = (items || []).filter((i) => i.investment_id === inv.id);
          return {
            ...inv,
            manager: managerById.get(inv.manager_id) || "Manager",
            location: inv.location_id ? locationById.get(inv.location_id) || "—" : "—",
            items: invItems
              .map((i) => `${productById.get(i.erp_product_id) || "Produit"} × ${i.quantity}`)
              .join(", "),
          };
        }),
      );
    })();
  }, [isCEO]);

  if (!isCEO) return <div className="p-8 text-center">Accès réservé à l'administration.</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Investissements" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Montant payé" value={fmtUsd(totalPaid)} icon={Coins} tone="gold" />
        <KpiCard label="Unités sorties du dépôt" value={fmtNum(qtyMoved)} icon={Package} />
      </div>

      <SectionCard title="Achats managers au dépôt">
        <div className="space-y-2">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucun investissement.</p>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{row.manager} · {row.location}</div>
                    <div className="text-xs text-muted-foreground">{row.date}</div>
                    <div className="mt-1 text-xs">{row.items || "—"}</div>
                    {row.notes && <div className="mt-1 text-xs text-muted-foreground">{row.notes}</div>}
                  </div>
                  <div className="font-semibold">{fmtUsd(Number(row.total_amount))}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}
