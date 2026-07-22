import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  RadialBar, RadialBarChart, PolarAngleAxis,
} from "recharts";
import { monthlyFinancials, products, departments, insights } from "@/lib/mock-data";
import { fmtUsd } from "@/lib/format";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics · The Sisters Business OS" },
      { name: "description", content: "Analyses avancées, prévisions et intelligence économique." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const forecast = [
    ...monthlyFinancials,
    { month: "Jan+", revenue: 88400, expenses: 43800, profit: 44600, budget: 74000 },
    { month: "Fév+", revenue: 91200, expenses: 44900, profit: 46300, budget: 76000 },
    { month: "Mar+", revenue: 96800, expenses: 46200, profit: 50600, budget: 78000 },
  ];

  const profitability = products.map((p) => ({
    name: p.name.split(" ").slice(0, 2).join(" "),
    marge: Math.round(((p.price - p.cost) / p.price) * 100),
  })).slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Intelligence"
        title="Analytics intelligent"
        description="Analyses prédictives, prévisions et signaux stratégiques propulsés par l'IA."
        actions={<Badge variant="outline" className="gap-1 border-accent/40 bg-accent/10"><Sparkles className="h-3 w-3" />IA active</Badge>}
      />

      {/* Executive insights */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {insights.map((i, idx) => {
          const icons = [TrendingUp, AlertTriangle, Target, Sparkles];
          const Icon = icons[idx % icons.length];
          return (
            <div key={i.title} className="card-elevated relative overflow-hidden p-5">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/5 blur-2xl" />
              <div className="mb-3 grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <Badge variant="outline" className="mb-2 text-[10px] uppercase tracking-wider">{i.tag}</Badge>
              <div className="font-display text-base font-semibold leading-tight">{i.title}</div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{i.body}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" title="Prévisions 15 mois" description="Modèle prédictif · confiance 92%">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast}>
                <defs>
                  <linearGradient id="fc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.76 0.13 78)" stopOpacity={0.5}/>
                    <stop offset="100%" stopColor="oklch(0.76 0.13 78)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.92 0.01 80)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip formatter={(v: number) => fmtUsd(v)} contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.9 0.01 80)", fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.76 0.13 78)" strokeWidth={2.5} fill="url(#fc)" />
                <Area type="monotone" dataKey="profit" stroke="oklch(0.65 0.14 155)" strokeWidth={2} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Santé financière" description="Score composite">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="60%" outerRadius="100%" data={[{ name: "Score", value: 87, fill: "oklch(0.76 0.13 78)" }]} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "oklch(0.94 0.01 80)" }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="-mt-24 text-center">
            <div className="font-display text-4xl font-semibold text-accent">87</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Excellent</div>
          </div>
          <div className="mt-8 space-y-2 text-xs">
            <Row k="Liquidité" v="92" />
            <Row k="Rentabilité" v="88" />
            <Row k="Croissance" v="94" />
            <Row k="Endettement" v="76" />
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Rentabilité par produit" description="Marge brute · top 6 SKUs">
          <div className="space-y-3">
            {profitability.map((p) => (
              <div key={p.name}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span>{p.name}</span>
                  <span className="font-semibold tabular-nums">{p.marge}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full gold-gradient" style={{ width: `${p.marge}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Croissance par département" description="Momentum · dernier trimestre">
          <div className="space-y-4">
            {departments.map((d) => (
              <div key={d.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{d.name}</div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full ${d.growth >= 0 ? "bg-success" : "bg-destructive"}`} style={{ width: `${Math.min(100, Math.abs(d.growth) * 2.5)}%` }} />
                  </div>
                </div>
                <div className={`font-display text-sm font-semibold tabular-nums ${d.growth >= 0 ? "text-success" : "text-destructive"}`}>
                  {d.growth >= 0 ? "+" : ""}{d.growth.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed pb-1 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium tabular-nums">{v}</span>
    </div>
  );
}
