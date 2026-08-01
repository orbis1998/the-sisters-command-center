import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { useRole } from "@/lib/role-context";
import { loadExecutiveDashboard } from "@/lib/executive-dashboard";
import { Badge } from "@/components/ui/badge";
import { fmtUsd, fmtPct } from "@/lib/format";
import {
  AreaChart as RechartsAreaChart,
  Area as RechartsArea,
  CartesianGrid as RechartsCartesianGrid,
  ResponsiveContainer as RechartsResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
} from "recharts";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
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
          Chargement des analyses...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analyses"
        description={
          data.activePeriod
            ? `Exercice : ${data.activePeriod.label} (depuis ${data.activePeriod.startDate})`
            : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SectionCard title="CA dépôt (appro)">
          <div className="font-display text-3xl font-semibold">{fmtUsd(data.depotRevenue)}</div>
        </SectionCard>
        <SectionCard title="Ventes POS">
          <div className="font-display text-3xl font-semibold">{fmtUsd(data.salesRevenue)}</div>
        </SectionCard>
        <SectionCard title="Charges">
          <div className="font-display text-3xl font-semibold">{fmtUsd(data.operatingExpenses)}</div>
        </SectionCard>
        <SectionCard title="Résultat net">
          <div className="font-display text-3xl font-semibold">{fmtUsd(data.profit)}</div>
        </SectionCard>
      </div>

      <SectionCard title="Mensuel">
        <div className="h-80">
          <RechartsResponsiveContainer width="100%" height="100%">
            <RechartsAreaChart data={data.monthlyPoints}>
              <RechartsCartesianGrid stroke="oklch(0.92 0.01 80)" vertical={false} />
              <RechartsXAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "oklch(0.5 0.03 60)" }}
              />
              <RechartsYAxis
                tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "oklch(0.5 0.03 60)" }}
              />
              <RechartsTooltip
                formatter={(v: number) => fmtUsd(v)}
                contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.9 0.01 80)", fontSize: 12 }}
              />
              <RechartsArea type="monotone" dataKey="revenue" stroke="oklch(0.76 0.13 78)" fill="oklch(0.76 0.13 78 / 0.18)" />
              <RechartsArea type="monotone" dataKey="expenses" stroke="oklch(0.42 0.06 55)" fill="oklch(0.42 0.06 55 / 0.12)" />
              <RechartsArea type="monotone" dataKey="profit" stroke="oklch(0.65 0.14 155)" fill="oklch(0.65 0.14 155 / 0.12)" />
            </RechartsAreaChart>
          </RechartsResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="Annuel">
        <div className="space-y-3">
          {data.annualPoints.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed p-12 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">Aucune donnée annuelle disponible.</p>
            </div>
          ) : (
            data.annualPoints.map((year) => (
              <div
                key={year.year}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-3 rounded-lg border p-3"
              >
                <div className="font-semibold">{year.year}</div>
                <div className="text-xs text-muted-foreground">Exercice consolidé</div>
                <div className="text-xs">{fmtUsd(year.revenue)}</div>
                <div className="text-xs">{fmtUsd(year.expenses)}</div>
                <Badge variant="outline">{fmtPct((year.profit / Math.max(year.revenue, 1)) * 100)}</Badge>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}
