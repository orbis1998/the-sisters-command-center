import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, FileBarChart } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/lib/role-context";
import { loadExecutiveDashboard } from "@/lib/executive-dashboard";
import { fmtNum } from "@/lib/format";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { isCEO } = useRole();
  const [data, setData] = useState<Awaited<ReturnType<typeof loadExecutiveDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const result = await loadExecutiveDashboard();
      if (mounted) {
        setData(result);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!isCEO) {
    return <div className="p-8 text-center">Accès réservé à l'administration.</div>;
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des rapports...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Rapports" />

      <SectionCard title={`Rapports récents · ${fmtNum(data.pendingReports)} en attente`}>
        <div className="space-y-3">
          {data.recentReports.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed p-12 text-center">
              <FileBarChart className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">Aucun rapport enregistré.</p>
            </div>
          ) : (
            data.recentReports.map((report) => (
              <div key={report.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
                <div>
                  <div className="font-medium">{report.manager}</div>
                  <div className="text-xs text-muted-foreground">
                    {report.location} · {report.weekStart} → {report.weekEnd}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{fmtNum(report.productsSold)} produits vendus</div>
                </div>
                <Badge variant="outline">{report.status}</Badge>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}
