import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import { Loader2, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/lib/role-context";
import { loadCeoAnalytics, type CeoAnalyticsData } from "@/lib/ceo-analytics";
import { fmtNum, fmtUsd } from "@/lib/format";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { isCEO } = useRole();
  const [data, setData] = useState<CeoAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isCEO) {
      setLoading(false);
      return;
    }
    let mounted = true;
    void loadCeoAnalytics()
      .then((result) => {
        if (mounted) setData(result);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [isCEO]);

  if (!isCEO) {
    return <div className="p-8 text-center">Accès réservé à l&apos;administration.</div>;
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement des analyses…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analyses"
        description={data.periodLabel ? `Exercice ${data.periodLabel}` : undefined}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="CA total" value={fmtUsd(data.totalRevenue)} tone="gold" />
        <KpiCard label="CA dépôt" value={fmtUsd(data.depotRevenue)} />
        <KpiCard label="Ventes POS" value={fmtUsd(data.salesRevenue)} />
        <KpiCard label="Charges" value={fmtUsd(data.operatingExpenses)} />
        <KpiCard label="Masse salariale" value={fmtUsd(data.payrollTotal)} icon={Users} />
        <KpiCard
          label="Bénéfice net"
          value={fmtUsd(data.profit)}
          tone={data.profit >= 0 ? "gold" : "default"}
        />
      </div>

      <SectionCard title="Évolution mensuelle">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.monthly}>
              <CartesianGrid stroke="oklch(0.92 0.01 80)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
              />
              <Tooltip formatter={(v: number) => fmtUsd(v)} />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                name="CA"
                stroke="oklch(0.76 0.13 78)"
                fill="oklch(0.76 0.13 78 / 0.18)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Charges"
                stroke="oklch(0.42 0.06 55)"
                fill="oklch(0.42 0.06 55 / 0.12)"
              />
              <Area
                type="monotone"
                dataKey="profit"
                name="Bénéfice"
                stroke="oklch(0.55 0.12 155)"
                fill="oklch(0.55 0.12 155 / 0.12)"
              />
              <Area
                type="monotone"
                dataKey="payroll"
                name="Masse salariale"
                stroke="oklch(0.5 0.08 250)"
                fill="oklch(0.5 0.08 250 / 0.08)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Classement points de vente (CA)">
          {data.topPos.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucun POS.</p>
          ) : (
            <>
              <div className="mb-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topPos}>
                    <CartesianGrid stroke="oklch(0.92 0.01 80)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
                    />
                    <Tooltip formatter={(v: number) => fmtUsd(v)} />
                    <Bar dataKey="sales" name="Ventes" fill="oklch(0.76 0.13 78)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {data.topPos.map((pos, idx) => (
                  <Link
                    key={pos.locationId}
                    to="/pos-overview/$locationId"
                    params={{ locationId: pos.locationId }}
                    className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="font-medium">
                        #{idx + 1} {pos.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {fmtNum(pos.productsSold)} produits · Appro {fmtUsd(pos.appro)} · Dépenses{" "}
                        {fmtUsd(pos.expenses)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{fmtUsd(pos.sales)}</div>
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        Net {fmtUsd(pos.profit)}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard title="Produits les plus vendus">
          {data.topProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune ligne de vente (rapports) pour l&apos;instant.
            </p>
          ) : (
            <>
              <div className="mb-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topProducts.slice(0, 8)} layout="vertical">
                    <CartesianGrid stroke="oklch(0.92 0.01 80)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip formatter={(v: number) => fmtUsd(v)} />
                    <Bar dataKey="revenue" name="CA" fill="oklch(0.55 0.12 155)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {data.topProducts.map((p, idx) => (
                  <div
                    key={p.productId}
                    className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">
                        #{idx + 1} {p.name}
                      </div>
                      <div className="text-xs text-muted-foreground">{fmtNum(p.qtySold)} unités</div>
                    </div>
                    <div className="font-semibold">{fmtUsd(p.revenue)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Synthèse annuelle">
        {data.annual.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucune donnée annuelle.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Année</th>
                  <th className="py-2 pr-3">CA</th>
                  <th className="py-2 pr-3">Charges</th>
                  <th className="py-2 pr-3">Masse salariale</th>
                  <th className="py-2">Bénéfice</th>
                </tr>
              </thead>
              <tbody>
                {data.annual.map((y) => (
                  <tr key={y.year} className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-medium">{y.year}</td>
                    <td className="py-2.5 pr-3">{fmtUsd(y.revenue)}</td>
                    <td className="py-2.5 pr-3">{fmtUsd(y.expenses)}</td>
                    <td className="py-2.5 pr-3">{fmtUsd(y.payroll)}</td>
                    <td className="py-2.5 font-semibold">{fmtUsd(y.profit)}</td>
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
