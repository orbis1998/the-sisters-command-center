import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowLeftRight,
  ClipboardList,
  Loader2,
  MapPin,
  Package,
  PackageX,
  Receipt,
  Store,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtUsd, fmtNum } from "@/lib/format";
import { useRole } from "@/lib/role-context";
import { loadExecutiveDashboard } from "@/lib/executive-dashboard";
import { loadManagerDashboard } from "@/lib/manager-dashboard";
import { loadDepotDashboard } from "@/lib/depot-dashboard";
import { monthlyExpenseCategories } from "@/lib/erp-constants";
import { supabase } from "@/lib/supabase-client";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

type RecentDepotReceipt = {
  id: string;
  date: string;
  amount: number;
  manager: string;
};

function Dashboard() {
  const { isCEO, isDepot, role } = useRole();
  if (role === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement...
      </div>
    );
  }
  if (isCEO) return <CEODashboard />;
  if (isDepot) return <DepotDashboard />;
  return <ManagerDashboard />;
}

function DepotDashboard() {
  const { depotAccount } = useRole();
  const [data, setData] = useState<Awaited<ReturnType<typeof loadDepotDashboard>> | null>(null);

  useEffect(() => {
    void loadDepotDashboard().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement...
      </div>
    );
  }

  const writeoffLabel = (type: string) =>
    type === "gift" ? "Offert" : type === "damage" ? "Abîmé" : type === "loss" ? "Perte" : type;

  return (
    <div className="space-y-6">
      <PageHeader title={depotAccount?.name || "Dépôt"} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Stock restant" value={fmtNum(data.stockQty)} icon={Package} tone="gold" />
        <KpiCard label="Articles sortis (POS)" value={fmtNum(data.unitsSoldToPos)} icon={TrendingUp} />
        <KpiCard label="Encaissements" value={fmtUsd(data.cashReceived)} icon={Wallet} />
        <KpiCard label="Charges dépôt" value={fmtUsd(data.expensesTotal)} icon={Receipt} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard label="Stock bas" value={fmtNum(data.lowStock)} icon={TrendingDown} />
        <KpiCard label="Ruptures" value={fmtNum(data.outOfStock)} icon={PackageX} />
        <KpiCard label="Pertes" value={fmtNum(data.writeoffUnits)} icon={AlertTriangle} hint="Unités 0 $" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Button asChild variant="outline" className="h-auto justify-start p-4">
          <Link to="/depot-restocks">
            <div className="text-left">
              <div className="font-medium">Entrée stock</div>
              <div className="text-xs text-muted-foreground">Réception fournisseur</div>
            </div>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start p-4">
          <Link to="/depot-expenses">
            <div className="text-left">
              <div className="font-medium">Dépenses</div>
              <div className="text-xs text-muted-foreground">Charges du dépôt</div>
            </div>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start p-4">
          <Link to="/stock-writeoff">
            <div className="text-left">
              <div className="font-medium">Pertes / abîmé</div>
              <div className="text-xs text-muted-foreground">Sortie à 0 $</div>
            </div>
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Dernières sorties vers POS">
          <div className="space-y-2">
            {data.recentOutflows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucune sortie.</p>
            ) : (
              data.recentOutflows.map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-medium">{row.manager}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.date}
                      {row.qty ? ` · ${fmtNum(row.qty)} articles` : ""}
                    </div>
                  </div>
                  <div className="font-semibold text-accent-foreground">{fmtUsd(row.amount)}</div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
        <SectionCard title="Pertes / abîmé">
          <div className="space-y-2">
            {data.recentWriteoffs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucune sortie 0 $.</p>
            ) : (
              data.recentWriteoffs.map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-medium">{row.product}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.createdAt} · {writeoffLabel(row.type)}
                    </div>
                  </div>
                  <div className="font-semibold">−{fmtNum(row.qty)}</div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function CEODashboard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadExecutiveDashboard>> | null>(null);
  const [depotLowStock, setDepotLowStock] = useState(0);
  const [depotOutOfStock, setDepotOutOfStock] = useState(0);
  const [recentDepotReceipts, setRecentDepotReceipts] = useState<RecentDepotReceipt[]>([]);

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      const result = await loadExecutiveDashboard();
      const [{ data: products }, { data: receipts }] = await Promise.all([
        supabase.from("erp_products").select("global_qty, min_stock"),
        supabase
          .from("depot_receipts")
          .select("id, date, amount, manager_id")
          .order("date", { ascending: false })
          .limit(5),
      ]);
      const { data: managers } = await supabase.from("erp_managers").select("id, name");

      if (!mounted) return;

      const managerById = new Map((managers || []).map((m) => [m.id, m.name]));
      setData(result);
      setDepotLowStock(
        (products || []).filter(
          (p) => Number(p.global_qty) > 0 && Number(p.global_qty) <= Number(p.min_stock || 0),
        ).length,
      );
      setDepotOutOfStock((products || []).filter((p) => Number(p.global_qty) <= 0).length);
      setRecentDepotReceipts(
        (receipts || []).map((r) => ({
          id: r.id,
          date: String(r.date ?? ""),
          amount: Number(r.amount || 0),
          manager: managerById.get(r.manager_id) || "Manager",
        })),
      );
    };

    void refresh();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, 30_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement...
      </div>
    );
  }

  const totalExpenses = data.operatingExpenses;

  return (
    <div className="space-y-6">
      <PageHeader title="Tableau de bord" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Stock dépôt (qté)" value={fmtNum(data.globalStockQty)} icon={Package} tone="gold" />
        <KpiCard label="CA dépôt (appro)" value={fmtUsd(data.depotRevenue)} icon={Store} hint="Paiements managers" />
        <KpiCard label="CA ventes POS" value={fmtUsd(data.salesRevenue)} icon={TrendingUp} hint="Détail + gros" />
        <KpiCard
          label="Résultat net"
          value={fmtUsd(data.profit)}
          icon={Wallet}
          tone={data.profit >= 0 ? "gold" : "default"}
          hint="CA total − charges"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="CA total" value={fmtUsd(data.revenue)} icon={TrendingUp} hint="Dépôt + ventes" />
        <KpiCard label="Charges" value={fmtUsd(totalExpenses)} icon={Receipt} />
        <KpiCard
          label="Remises POS"
          value={fmtUsd(data.posTransfers)}
          icon={ArrowLeftRight}
          hint="Caisse remise (hors double CA)"
        />
        <KpiCard label="Stock POS (qté)" value={fmtNum(data.posStockQty)} icon={Package} />
        <KpiCard label="Points de vente" value={fmtNum(data.locationsCount)} icon={MapPin} />
        <KpiCard label="Stock bas" value={fmtNum(depotLowStock)} icon={TrendingDown} hint="Dépôt" />
        <KpiCard label="Ruptures" value={fmtNum(depotOutOfStock)} icon={PackageX} hint="Dépôt" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard className="xl:col-span-2" title="Flux financier">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyPoints}>
                <CartesianGrid stroke="oklch(0.9 0.01 80)" vertical={false} />
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
                  name="Revenus"
                  stroke="oklch(0.76 0.13 78)"
                  fill="oklch(0.76 0.13 78 / 0.18)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Dépenses"
                  stroke="oklch(0.42 0.06 55)"
                  fill="oklch(0.42 0.06 55 / 0.12)"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Bénéfice"
                  stroke="oklch(0.65 0.14 155)"
                  fill="oklch(0.65 0.14 155 / 0.12)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="À surveiller">
          <div className="space-y-3">
            <AlertRow
              label="Ruptures dépôt"
              value={depotOutOfStock}
              tone={depotOutOfStock > 0 ? "danger" : "ok"}
              href="/inventory"
            />
            <AlertRow
              label="Stock bas dépôt"
              value={depotLowStock}
              tone={depotLowStock > 0 ? "warning" : "ok"}
              href="/inventory"
            />
            <AlertRow
              label="Rapports en attente"
              value={data.pendingReports}
              tone={data.pendingReports > 0 ? "warning" : "ok"}
              href="/reports"
            />
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5" />
                Synthèse
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CA dépôt (appro)</span>
                  <span className="font-medium">{fmtUsd(data.depotRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ventes POS</span>
                  <span className="font-medium">{fmtUsd(data.salesRevenue)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Résultat net</span>
                  <span className="font-semibold">{fmtUsd(data.profit)}</span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Rapports récents">
          <div className="space-y-3">
            {data.recentReports.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucun rapport.</p>
            ) : (
              data.recentReports.map((report) => (
                <div key={report.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <div className="font-medium">{report.manager}</div>
                    <div className="text-xs text-muted-foreground">
                      {report.location} · {report.weekStart} → {report.weekEnd}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {fmtNum(report.productsSold)} vendus · {fmtUsd(report.totalRevenue)}
                    </div>
                  </div>
                  <Badge variant="outline">{report.status}</Badge>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Dépenses récentes">
          <div className="space-y-3">
            {data.recentExpenses.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucune dépense.</p>
            ) : (
              data.recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <div className="font-medium capitalize">{expense.category}</div>
                    <div className="text-xs text-muted-foreground">
                      {expense.location} · {expense.date}
                    </div>
                  </div>
                  <div className="font-semibold">{fmtUsd(expense.amount)}</div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="CA dépôt — paiements managers">
          <div className="space-y-3">
            {recentDepotReceipts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucune recette dépôt.</p>
            ) : (
              recentDepotReceipts.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <div className="font-medium">{row.manager}</div>
                    <div className="text-xs text-muted-foreground">{row.date}</div>
                  </div>
                  <div className="font-semibold">{fmtUsd(row.amount)}</div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function AlertRow({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number;
  tone: "ok" | "warning" | "danger";
  href: string;
}) {
  const toneClass =
    tone === "danger"
      ? "border-destructive/30 bg-destructive/5"
      : tone === "warning"
        ? "border-warning/30 bg-warning/5"
        : "border-border";

  return (
    <div className={`flex items-center justify-between rounded-lg border p-4 ${toneClass}`}>
      <div>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="mt-2 font-display text-3xl font-semibold">{fmtNum(value)}</div>
      </div>
      <Button variant="ghost" size="sm" asChild>
        <Link to={href}>Voir</Link>
      </Button>
    </div>
  );
}

function ManagerDashboard() {
  const { manager } = useRole();
  const [data, setData] = useState<Awaited<ReturnType<typeof loadManagerDashboard>> | null>(null);

  useEffect(() => {
    if (!manager?.id) return;
    let mounted = true;
    void (async () => {
      const result = await loadManagerDashboard(manager.id, manager.location_id);
      if (mounted) setData(result);
    })();
    return () => {
      mounted = false;
    };
  }, [manager?.id, manager?.location_id]);

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement...
      </div>
    );
  }

  const expenseLabel = (category: string) =>
    monthlyExpenseCategories.find((c) => c.value === category)?.label || category;

  return (
    <div className="space-y-6">
      <PageHeader
        title={manager?.name || "Tableau de bord"}
        description={data.hasLocation ? data.locationName : "Aucun point de vente assigné"}
      />

      {!data.hasPeriodOpening && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm">
          <div className="font-medium">Ouverture d'exercice requise</div>
          <p className="mt-1 text-muted-foreground">
            Saisissez le fonds de démarrage et le stock une seule fois pour cet exercice.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link to="/period-opening">Ouvrir l'exercice</Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Caisse disponible"
          value={fmtUsd(data.cashAvailable)}
          icon={Wallet}
          tone={data.cashAvailable > 0 ? "gold" : "default"}
          hint="Fonds restants cette semaine"
        />
        <KpiCard label="Ventes (rapport)" value={fmtUsd(data.salesRevenue)} icon={TrendingUp} tone="gold" />
        <KpiCard label="Approvisionnements" value={fmtUsd(data.investmentTotal)} icon={Store} />
        <KpiCard label="Transferts" value={fmtUsd(data.transferTotal)} icon={ArrowLeftRight} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <KpiCard label="Dépenses" value={fmtUsd(data.expensesTotal)} icon={Receipt} />
        <KpiCard label="Produits vendus" value={fmtNum(data.productsSold)} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Stock POS" value={fmtNum(data.posStockQty)} icon={Package} />
        <KpiCard label="Stock bas" value={fmtNum(data.lowStock)} icon={TrendingDown} />
        <KpiCard label="Ruptures" value={fmtNum(data.outOfStock)} icon={PackageX} />
        <KpiCard label="Rapports" value={fmtNum(data.reportsCount)} icon={ClipboardList} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Button asChild variant="outline" className="h-auto justify-start p-3">
          <Link to="/weekly-report">1. Rapport ventes</Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start p-3">
          <Link to="/manager-expenses">2. Dépenses / transfert</Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start p-3">
          <Link to="/manager-investment">3. Approvisionnement</Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start p-3">
          <Link to="/stock-writeoff">Pertes / offert</Link>
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard className="xl:col-span-2" title="Activité mensuelle">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyPoints}>
                <CartesianGrid stroke="oklch(0.9 0.01 80)" vertical={false} />
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
                  dataKey="investments"
                  name="Approvisionnements"
                  stroke="oklch(0.76 0.13 78)"
                  fill="oklch(0.76 0.13 78 / 0.18)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Dépenses"
                  stroke="oklch(0.42 0.06 55)"
                  fill="oklch(0.42 0.06 55 / 0.12)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="À surveiller">
          <div className="space-y-3">
            {!data.hasLocation && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <MapPin className="h-4 w-4" />
                  Point de vente requis
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Contactez l&apos;administration pour vous assigner un point de vente.
                </p>
              </div>
            )}
            <AlertRow
              label="Ruptures"
              value={data.outOfStock}
              tone={data.outOfStock > 0 ? "danger" : "ok"}
              href="/manager-investment"
            />
            <AlertRow
              label="Stock bas"
              value={data.lowStock}
              tone={data.lowStock > 0 ? "warning" : "ok"}
              href="/weekly-report"
            />
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5" />
                Caisse semaine
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stock POS</span>
                  <span className="font-medium">{fmtNum(data.posStockQty)} unités</span>
                </div>
                {data.openingCountsThisWeek && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fonds ouverture</span>
                    <span className="font-medium">{fmtUsd(data.openingCa)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ventes</span>
                  <span className="font-medium">+{fmtUsd(data.salesRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dépenses</span>
                  <span className="font-medium">−{fmtUsd(data.expensesTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approvisionnements</span>
                  <span className="font-medium">−{fmtUsd(data.investmentTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transferts</span>
                  <span className="font-medium">−{fmtUsd(data.transferTotal)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Caisse disponible</span>
                  <span className="font-semibold">{fmtUsd(data.cashAvailable)}</span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Approvisionnements récents">
          <div className="space-y-3">
            {data.recentInvestments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucun approvisionnement.</p>
            ) : (
              data.recentInvestments.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <div className="font-medium">{fmtUsd(row.total)}</div>
                    <div className="text-xs text-muted-foreground">{row.date}</div>
                    {row.notes && <div className="mt-1 text-xs">{row.notes}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Dépenses récentes">
          <div className="space-y-3">
            {data.recentExpenses.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucune dépense.</p>
            ) : (
              data.recentExpenses.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <div className="font-medium">{expenseLabel(row.category)}</div>
                    <div className="text-xs text-muted-foreground">{row.date}</div>
                  </div>
                  <div className="font-semibold">{fmtUsd(row.amount)}</div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Rapports récents">
          <div className="space-y-3">
            {data.recentReports.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucun rapport.</p>
            ) : (
              data.recentReports.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <div className="font-medium">
                      {row.weekStart} → {row.weekEnd}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {fmtNum(row.productsSold)} produits · {fmtUsd(row.totalRevenue)}
                    </div>
                  </div>
                  <Badge variant="outline">{row.status}</Badge>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
