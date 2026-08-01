import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, FileBarChart, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { useRole } from "@/lib/role-context";
import {
  loadManagerReportDetail,
  loadRecentReportSummaries,
  type ManagerReportDetail,
} from "@/lib/report-detail";
import { fmtNum, fmtUsd } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { isCEO } = useRole();
  const [summaries, setSummaries] = useState<Awaited<ReturnType<typeof loadRecentReportSummaries>>>([]);
  const [detail, setDetail] = useState<ManagerReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!isCEO) return;
    let mounted = true;
    void (async () => {
      try {
        const rows = await loadRecentReportSummaries(40);
        if (mounted) setSummaries(rows);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erreur de chargement");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isCEO]);

  const openDetail = (id: string) => {
    setLoadingDetail(true);
    void (async () => {
      try {
        const data = await loadManagerReportDetail(id);
        if (!data) {
          toast.error("Rapport introuvable");
          return;
        }
        setDetail(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible d'ouvrir le rapport");
      } finally {
        setLoadingDetail(false);
      }
    })();
  };

  if (!isCEO) {
    return <div className="p-8 text-center">Accès réservé à l'administration.</div>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement des rapports...
      </div>
    );
  }

  if (detail) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Détail du rapport"
          description={`${detail.managerName} · ${detail.locationName} · ${detail.weekStart} → ${detail.weekEnd}`}
          actions={
            <Button variant="outline" size="sm" onClick={() => setDetail(null)}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Retour à la liste
            </Button>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{detail.status}</Badge>
          <span className="text-sm text-muted-foreground">{fmtNum(detail.productsSold)} unités détail vendues</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total des ventes" value={fmtUsd(detail.salesTotal)} tone="gold" />
          <KpiCard label="Total des dépenses" value={fmtUsd(detail.allExpensesTotal)} />
          <KpiCard label="Bénéfice brut (ventes)" value={fmtUsd(detail.grossProfit)} />
          <KpiCard
            label="Résultat final"
            value={fmtUsd(detail.finalResult)}
            tone={detail.finalResult >= 0 ? "gold" : "default"}
          />
        </div>

        <SectionCard title="1. Stock & ventes" description="Chaque ligne produit de la semaine">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="py-2 pr-3">Produit</th>
                  <th className="py-2 pr-3">Qté détail</th>
                  <th className="py-2 pr-3">Prix unitaire</th>
                  <th className="py-2 pr-3">Montant détail</th>
                  <th className="py-2 pr-3">Montant gros</th>
                  <th className="py-2 pr-3">Total ligne</th>
                  <th className="py-2 pr-3">Stock restant</th>
                  <th className="py-2 pr-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {detail.salesLines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Aucune ligne de vente.
                    </td>
                  </tr>
                ) : (
                  detail.salesLines.map((line, idx) => (
                    <tr key={`${line.productName}-${idx}`} className="border-b last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{line.productName}</td>
                      <td className="py-2.5 pr-3">{fmtNum(line.retailQty)}</td>
                      <td className="py-2.5 pr-3">{fmtUsd(line.unitPrice)}</td>
                      <td className="py-2.5 pr-3">{fmtUsd(line.retailRevenue)}</td>
                      <td className="py-2.5 pr-3">{fmtUsd(line.wholesaleAmount)}</td>
                      <td className="py-2.5 pr-3 font-semibold">{fmtUsd(line.lineTotal)}</td>
                      <td className="py-2.5 pr-3">{fmtNum(line.remainingStock)}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{line.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30 font-semibold">
                  <td className="py-3 pr-3" colSpan={3}>
                    Totaux ventes
                  </td>
                  <td className="py-3 pr-3">{fmtUsd(detail.retailTotal)}</td>
                  <td className="py-3 pr-3">{fmtUsd(detail.wholesaleTotal)}</td>
                  <td className="py-3 pr-3">{fmtUsd(detail.salesTotal)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            L&apos;heure n&apos;est pas disponible sur les rapports hebdomadaires (agrégats par semaine). La date
            affichée correspond à la fin de période du rapport.
          </p>
        </SectionCard>

        <SectionCard title="2. Dépenses" description="Détail par catégorie, chronologique">
          {detail.expenseGroups.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune dépense sur cette période (POS, CEO ou dépôt).
            </p>
          ) : (
            <div className="space-y-5">
              {detail.expenseGroups.map((group) => (
                <div key={group.key} className="rounded-lg border">
                  <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
                    <h3 className="font-medium">{group.label}</h3>
                    <span className="font-semibold">{fmtUsd(group.total)}</span>
                  </div>
                  <div className="divide-y">
                    {group.lines.map((line) => (
                      <div key={line.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium">{line.description}</div>
                          <div className="text-xs text-muted-foreground">{line.date}</div>
                        </div>
                        <div className="shrink-0 font-semibold">{fmtUsd(line.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="3. Résumé financier">
          <div className="mx-auto max-w-lg space-y-3 text-sm">
            <SummaryRow label="Total des ventes" value={fmtUsd(detail.salesTotal)} />
            <SummaryRow label="dont détail" value={fmtUsd(detail.retailTotal)} muted />
            <SummaryRow label="dont gros" value={fmtUsd(detail.wholesaleTotal)} muted />
            <div className="border-t pt-3" />
            <SummaryRow label="Dépenses opérationnelles POS" value={fmtUsd(detail.operatingExpensesTotal)} />
            <SummaryRow label="Dépenses personnelles Axelle" value={fmtUsd(detail.ceoAxelleTotal)} />
            <SummaryRow label="Dépenses personnelles Allexe" value={fmtUsd(detail.ceoAllexeTotal)} />
            <SummaryRow label="Dépenses du dépôt" value={fmtUsd(detail.depotExpensesTotal)} />
            <SummaryRow label="Total des dépenses" value={fmtUsd(detail.allExpensesTotal)} strong />
            <div className="border-t pt-3" />
            <SummaryRow label="Bénéfice brut (ventes)" value={fmtUsd(detail.grossProfit)} />
            <SummaryRow label="Déduction des dépenses" value={`− ${fmtUsd(detail.allExpensesTotal)}`} />
            <SummaryRow
              label="Résultat final"
              value={fmtUsd(detail.finalResult)}
              strong
              highlight={detail.finalResult >= 0}
            />
          </div>
          {detail.observations && (
            <div className="mt-6 rounded-lg border bg-muted/20 p-4 text-sm">
              <div className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">Observations</div>
              {detail.observations}
            </div>
          )}
        </SectionCard>
      </div>
    );
  }

  const pending = summaries.filter((r) => r.status !== "approved").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapports"
        description="Cliquez sur un rapport pour voir le détail ventes, dépenses et résultat."
      />

      <SectionCard title={`Rapports récents · ${fmtNum(pending)} en attente`}>
        {loadingDetail && (
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Ouverture du détail...
          </div>
        )}
        <div className="space-y-3">
          {summaries.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed p-12 text-center">
              <FileBarChart className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Aucun rapport enregistré.</p>
            </div>
          ) : (
            summaries.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => openDetail(report.id)}
                className="flex w-full items-start justify-between gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/40"
              >
                <div>
                  <div className="font-medium">{report.manager}</div>
                  <div className="text-xs text-muted-foreground">
                    {report.location} · {report.weekStart} → {report.weekEnd}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {fmtNum(report.productsSold)} produits · ventes {fmtUsd(report.totalRevenue)}
                  </div>
                </div>
                <Badge variant="outline">{report.status}</Badge>
              </button>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  muted,
  strong,
  highlight,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 ${muted ? "pl-3 text-muted-foreground" : ""}`}>
      <span className={strong ? "font-medium" : ""}>{label}</span>
      <span className={`${strong ? "font-display text-lg font-semibold" : "font-medium"} ${highlight ? "text-primary" : ""}`}>
        {value}
      </span>
    </div>
  );
}
