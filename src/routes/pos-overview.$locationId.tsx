import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRole } from "@/lib/role-context";
import { loadPosDetail, type PosDetailData } from "@/lib/pos-detail";
import { fmtNum, fmtUsd } from "@/lib/format";

export const Route = createFileRoute("/pos-overview/$locationId")({
  component: PosDetailPage,
});

function PosDetailPage() {
  const { locationId } = Route.useParams();
  const { isCEO } = useRole();
  const [data, setData] = useState<PosDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!isCEO) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    void loadPosDetail(locationId)
      .then((result) => {
        if (!mounted) return;
        if (!result) setMissing(true);
        else setData(result);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [isCEO, locationId]);

  if (!isCEO) {
    return <div className="p-8 text-center">Accès réservé à l&apos;administration.</div>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement du point de vente…
      </div>
    );
  }

  if (missing || !data) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/pos-overview">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Retour
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Point de vente introuvable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={data.locationName}
          description={
            [
              data.managers.length ? `Manager(s): ${data.managers.join(", ")}` : "Aucun manager assigné",
              data.periodLabel ? `Exercice ${data.periodLabel}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || undefined
          }
        />
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link to="/pos-overview">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Tous les POS
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Stock (qté)" value={fmtNum(data.stockQty)} icon={Package} tone="gold" />
        <KpiCard label="Valeur stock" value={fmtUsd(data.stockValue)} />
        <KpiCard label="Ventes (+ ouverture)" value={fmtUsd(data.salesRevenue)} />
        <KpiCard
          label="Bénéfice POS"
          value={fmtUsd(data.profit)}
          tone={data.profit >= 0 ? "gold" : "default"}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Approvisionnements" value={fmtUsd(data.provisionTotal)} />
        <KpiCard label="Dépenses" value={fmtUsd(data.expensesTotal)} />
        <KpiCard label="Transferts" value={fmtUsd(data.transferTotal)} />
        <KpiCard label="Pertes / offerts" value={fmtNum(data.writeoffUnits)} hint="Unités" />
      </div>

      <SectionCard title="Stock disponible">
        {data.stockLines.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucun produit en stock.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Produit</th>
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Qté</th>
                  <th className="py-2 pr-3">Min</th>
                  <th className="py-2 pr-3">Prix achat</th>
                  <th className="py-2">Prix vente</th>
                </tr>
              </thead>
              <tbody>
                {data.stockLines.map((line) => (
                  <tr key={line.productId} className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-medium">{line.name}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{line.sku}</td>
                    <td className="py-2.5 pr-3">
                      <span className={line.quantity <= 0 ? "text-destructive font-semibold" : ""}>
                        {fmtNum(line.quantity)}
                      </span>
                      {line.quantity > 0 && line.quantity <= line.minStock && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          Bas
                        </Badge>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{fmtNum(line.minStock)}</td>
                    <td className="py-2.5 pr-3">{fmtUsd(line.unitPurchasePrice)}</td>
                    <td className="py-2.5">{fmtUsd(line.sellingPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Dépenses">
          {data.expenses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucune dépense.</p>
          ) : (
            <div className="space-y-2">
              {data.expenses.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-medium">{row.category}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.date}
                      {row.description ? ` · ${row.description}` : ""}
                    </div>
                  </div>
                  <div className="font-semibold">−{fmtUsd(row.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Approvisionnements">
          {data.investments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucun approvisionnement.</p>
          ) : (
            <div className="space-y-2">
              {data.investments.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-medium">{row.manager}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.date}
                      {row.notes ? ` · ${row.notes}` : ""}
                    </div>
                  </div>
                  <div className="font-semibold">{fmtUsd(row.total)}</div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Rapports de vente">
          {data.reports.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucun rapport.</p>
          ) : (
            <div className="space-y-2">
              {data.reports.map((row) => (
                <Link
                  key={row.id}
                  to="/reports"
                  className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm transition-colors hover:bg-muted/40"
                >
                  <div>
                    <div className="font-medium">
                      {row.weekStart} → {row.weekEnd}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.manager} · {fmtNum(row.productsSold)} produits
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{fmtUsd(row.totalRevenue)}</div>
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {row.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Transferts / remises">
          {data.transfers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucun transfert.</p>
          ) : (
            <div className="space-y-2">
              {data.transfers.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-medium">{row.manager}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.date}
                      {row.notes ? ` · ${row.notes}` : ""}
                    </div>
                  </div>
                  <div className="font-semibold">−{fmtUsd(row.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
