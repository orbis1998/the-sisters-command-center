import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  CircleDollarSign,
  Coins,
  Package,
  ShoppingBag,
  TrendingUp,
  Sparkles,
  Download,
  Filter,
} from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  kpis,
  monthlyFinancials,
  departments,
  products,
  expenseBreakdown,
  activityLog,
  treasury,
  insights,
} from "@/lib/mock-data";
import { fmtUsd, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Executive Dashboard · The Sisters Business OS" },
      { name: "description", content: "Vue exécutive : KPIs, trésorerie, marges, analytics et insights IA pour The Sisters Africa." },
    ],
  }),
  component: Dashboard,
});

const chartColors = ["oklch(0.76 0.13 78)", "oklch(0.42 0.06 55)", "oklch(0.65 0.14 155)", "oklch(0.58 0.19 27)", "oklch(0.55 0.09 260)"];

function Dashboard() {
  const totalTreasury = treasury.cash + treasury.bank + treasury.mobileMoney;
  const topProducts = [...products]
    .map((p) => ({ ...p, revenue: (p.price - p.cost) * (p.stock < 200 ? 220 : 80) + p.price * 50 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vue Exécutive"
        title="Tableau de bord exécutif"
        description="Pilotage financier, opérationnel et stratégique de The Sisters Africa · Exercice 2026"
        actions={
          <>
            <Button variant="outline" size="sm"><Filter className="mr-1.5 h-3.5 w-3.5" />Filtres</Button>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Download className="mr-1.5 h-3.5 w-3.5" />Exporter
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Revenus MTD" value={fmtUsd(kpis.revenueMTD)} delta={kpis.revenueGrowth} icon={CircleDollarSign} hint="vs. mois précédent" tone="gold" />
        <KpiCard label="Profit net" value={fmtUsd(kpis.netProfitMTD)} delta={9.2} icon={TrendingUp} hint={`marge ${kpis.marginPct}%`} />
        <KpiCard label="Trésorerie" value={fmtUsd(kpis.cashOnHand)} delta={4.6} icon={Coins} hint="tous comptes" />
        <KpiCard label="Valeur inventaire" value={fmtUsd(kpis.inventoryValue)} delta={-2.1} icon={Package} hint={`${fmtNum(kpis.ordersMTD)} commandes`} />
      </div>

      {/* Revenue vs Expenses vs Budget */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Performance financière"
          description="Revenus, dépenses et budget · 12 derniers mois"
          actions={
            <div className="flex gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-[oklch(0.76_0.13_78)]"/>Revenus</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-[oklch(0.42_0.06_55)]"/>Dépenses</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-[oklch(0.65_0.14_155)]"/>Budget</span>
            </div>
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyFinancials} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.76 0.13 78)" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="oklch(0.76 0.13 78)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.42 0.06 55)" stopOpacity={0.25}/>
                    <stop offset="100%" stopColor="oklch(0.42 0.06 55)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.9 0.01 80)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "oklch(0.5 0.03 60)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.5 0.03 60)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.9 0.01 80)", fontSize: 12 }} formatter={(v: number) => fmtUsd(v)} />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.76 0.13 78)" strokeWidth={2} fill="url(#rev)" />
                <Area type="monotone" dataKey="expenses" stroke="oklch(0.42 0.06 55)" strokeWidth={2} fill="url(#exp)" />
                <Line type="monotone" dataKey="budget" stroke="oklch(0.65 0.14 155)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Trésorerie" description="Répartition des liquidités">
          <div className="mb-4 font-display text-3xl font-semibold">{fmtUsd(totalTreasury)}</div>
          <div className="space-y-3">
            {[
              { label: "Banque", value: treasury.bank, color: "bg-primary" },
              { label: "Espèces", value: treasury.cash, color: "bg-accent" },
              { label: "Mobile Money", value: treasury.mobileMoney, color: "bg-success" },
            ].map((t) => (
              <div key={t.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t.label}</span>
                  <span className="tabular-nums font-medium">{fmtUsd(t.value)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full ${t.color}`} style={{ width: `${(t.value / totalTreasury) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 text-xs">
            <div>
              <div className="text-muted-foreground">À recevoir</div>
              <div className="mt-0.5 font-display text-lg font-semibold text-success">{fmtUsd(treasury.receivables)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">À payer</div>
              <div className="mt-0.5 font-display text-lg font-semibold text-destructive">{fmtUsd(treasury.payables)}</div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Top departments & products */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Top départements" description="Revenus par pôle métier">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departments} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid stroke="oklch(0.92 0.01 80)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "oklch(0.5 0.03 60)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "oklch(0.28 0.04 55)" }} width={130} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => fmtUsd(v)} contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.9 0.01 80)", fontSize: 12 }} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {departments.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Top produits" description="Contribution au chiffre d'affaires">
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.sku} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-md bg-muted font-display text-xs font-semibold text-foreground/70">#{i+1}</div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.category} · {p.sku}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-sm font-semibold tabular-nums">{fmtUsd(p.revenue)}</div>
                  <div className="text-[11px] text-success">+{(8 + i * 3.4).toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Expense breakdown + profitability */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Analyse des dépenses" description="Répartition annuelle">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseBreakdown} dataKey="amount" nameKey="category" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {expenseBreakdown.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtUsd(v)} contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.9 0.01 80)", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1.5">
            {expenseBreakdown.slice(0, 4).map((e, i) => (
              <div key={e.category} className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: chartColors[i] }} />
                  {e.category}
                </span>
                <span className="tabular-nums font-medium">{e.share}%</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Prévisions budgétaires" description="Réalisé vs. budget · YTD" className="lg:col-span-2">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyFinancials}>
                <CartesianGrid stroke="oklch(0.92 0.01 80)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "oklch(0.5 0.03 60)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.5 0.03 60)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip formatter={(v: number) => fmtUsd(v)} contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.9 0.01 80)", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" name="Réalisé" dataKey="revenue" stroke="oklch(0.76 0.13 78)" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" name="Budget" dataKey="budget" stroke="oklch(0.42 0.06 55)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                <Line type="monotone" name="Profit" dataKey="profit" stroke="oklch(0.65 0.14 155)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4 text-xs">
            <div>
              <div className="text-muted-foreground">Réalisation budget</div>
              <div className="mt-1 flex items-center gap-2">
                <Progress value={112} className="h-1.5 flex-1" />
                <span className="font-display text-sm font-semibold text-success">112%</span>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Marge nette YTD</div>
              <div className="mt-1 font-display text-lg font-semibold">45.8%</div>
            </div>
            <div>
              <div className="text-muted-foreground">Projection annuelle</div>
              <div className="mt-1 font-display text-lg font-semibold text-accent">$781K</div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Insights + activity */}
      <div className="grid gap-6 lg:grid-cols-5">
        <SectionCard
          className="lg:col-span-3"
          title="Résumé financier intelligent"
          description="Insights générés par l'analyse IA de vos données"
          actions={<Badge variant="outline" className="gap-1 border-accent/40 bg-accent/10"><Sparkles className="h-3 w-3" />IA</Badge>}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {insights.map((i) => (
              <div key={i.title} className="rounded-lg border bg-muted/20 p-4 transition-colors hover:border-accent/40 hover:bg-accent/[0.04]">
                <div className="mb-1.5 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{i.tag}</Badge>
                </div>
                <div className="font-display text-sm font-semibold">{i.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{i.body}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard className="lg:col-span-2" title="Activité récente" description="Dernières actions de l'équipe">
          <div className="space-y-4">
            {activityLog.slice(0, 6).map((a, i) => (
              <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-muted font-display text-[11px] font-semibold">
                  {a.user.split(" ").map((s) => s[0]).join("").slice(0,2)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs">
                    <span className="font-medium">{a.user}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>{" "}
                    <span className="font-medium">{a.target}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{a.time}</span>
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                    <span className="uppercase tracking-wider">{a.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-2 w-full text-xs">
            Voir tout le journal <ArrowUpRight className="ml-1 h-3 w-3" />
          </Button>
        </SectionCard>
      </div>

      {/* Bottom stats strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatMini icon={ShoppingBag} label="Commandes MTD" value={fmtNum(kpis.ordersMTD)} sub="+18 aujourd'hui" />
        <StatMini icon={CircleDollarSign} label="Panier moyen" value={fmtUsd(kpis.avgOrderValue)} sub="+$12 vs. moyenne" />
        <StatMini icon={Package} label="SKU actifs" value={fmtNum(products.length)} sub="2 en rupture proche" />
        <StatMini icon={TrendingUp} label="Croissance YoY" value="+31%" sub="Trajectoire 2026" />
      </div>
    </div>
  );
}

function StatMini({ icon: Icon, label, value, sub }: { icon: typeof CircleDollarSign; label: string; value: string; sub: string }) {
  return (
    <div className="card-elevated flex items-center gap-3 p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="font-display text-lg font-semibold leading-tight">{value}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}
