import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { useRole } from "@/lib/role-context";
import { loadStockMovements } from "@/lib/accounting";
import { fmtNum } from "@/lib/format";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/stock-flows")({
  component: StockFlowsPage,
});

function StockFlowsPage() {
  const { isCEO } = useRole();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof loadStockMovements>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isCEO) return;
    void loadStockMovements(150).then((data) => {
      setRows(data);
      setLoading(false);
    });
  }, [isCEO]);

  if (!isCEO) return <div className="p-8 text-center">Accès réservé à l'administration.</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Flux stock" description="Entrées, sorties et mouvements" />

      <SectionCard title="Opérations">
        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Aucun mouvement.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Produit</th>
                  <th className="py-2 pr-3">Lieu</th>
                  <th className="py-2 pr-3">Qté</th>
                  <th className="py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2.5 pr-3">{row.date}</td>
                    <td className="py-2.5 pr-3">{row.movementType}</td>
                    <td className="py-2.5 pr-3 font-medium">{row.productName}</td>
                    <td className="py-2.5 pr-3">{row.locationName}</td>
                    <td className="py-2.5 pr-3 font-mono">
                      {row.quantityChange > 0 ? "+" : ""}
                      {fmtNum(row.quantityChange)}
                    </td>
                    <td className="py-2.5 text-muted-foreground">{row.notes || "—"}</td>
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
