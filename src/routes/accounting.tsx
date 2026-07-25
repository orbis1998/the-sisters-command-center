import { createFileRoute } from "@tanstack/react-router";
import { Plus, Download, Filter } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { EditableTable, type Column } from "@/components/editable-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { revenues, expenses } from "@/lib/mock-data";
import {
  transactions,
  monthSummary,
  quarterSummary,
  annualSummary,
  taxesSummary,
  bookkeepingSetup,
  type Transaction,
} from "@/lib/template-data";
import { fmtUsd, fmtUsdPrecise } from "@/lib/format";
import { useRole } from "@/lib/role-context";

export const Route = createFileRoute("/accounting")({
  head: () => ({
    meta: [
      { title: "Comptabilité · The Sisters Business OS" },
      { name: "description", content: "Saisie des revenus, dépenses, achats et suivi comptable quotidien." },
    ],
  }),
  component: AccountingPage,
});

function AccountingPage() {
  const { isCEO } = useRole();

  const revenueCols: Column<typeof revenues[number]>[] = [
    { key: "id", label: "N°", width: "130px" },
    { key: "date", label: "Date", width: "110px", editable: true },
    { key: "client", label: "Client", editable: true },
    { key: "product", label: "Produit", editable: true },
    { key: "qty", label: "Qté", align: "right", width: "70px", type: "number", editable: true },
    { key: "unit", label: "PU", align: "right", width: "90px", type: "number", editable: true, format: (v) => fmtUsdPrecise(v as number) },
    { key: "total", label: "Total", align: "right", width: "110px", type: "number", editable: true, format: (v) => fmtUsdPrecise(v as number) },
    { key: "method", label: "Paiement", width: "120px", editable: true },
    { key: "status", label: "Statut", width: "110px", format: (v) => v as string },
  ];

  const expenseCols: Column<typeof expenses[number]>[] = [
    { key: "id", label: "N°", width: "130px" },
    { key: "date", label: "Date", width: "110px", editable: true },
    { key: "vendor", label: "Fournisseur", editable: true },
    { key: "category", label: "Catégorie", editable: true },
    { key: "desc", label: "Description", editable: true },
    { key: "amount", label: "Montant", align: "right", width: "120px", type: "number", editable: true, format: (v) => fmtUsdPrecise(v as number) },
    { key: "method", label: "Paiement", width: "120px", editable: true },
    { key: "status", label: "Statut", width: "110px" },
  ];

  const txCols: Column<Transaction>[] = [
    { key: "date", label: "Date", width: "110px", editable: true },
    { key: "invoice", label: "Facture n°", width: "150px", editable: true },
    { key: "type", label: "Type", width: "100px", editable: true },
    { key: "category", label: "Catégorie", width: "170px", editable: true },
    { key: "net", label: "Net", align: "right", width: "110px", type: "number", editable: true, format: (v) => fmtUsdPrecise(v as number) },
    { key: "salesTax", label: "TVA", align: "right", width: "100px", type: "number", editable: true, format: (v) => fmtUsdPrecise(v as number) },
    { key: "otherFees", label: "Autres frais", align: "right", width: "110px", type: "number", editable: true, format: (v) => fmtUsdPrecise(v as number) },
    { key: "total", label: "Total", align: "right", width: "115px", type: "number", format: (v) => fmtUsdPrecise(v as number) },
    { key: "description", label: "Description", editable: true },
    { key: "notes", label: "Notes", editable: true },
    { key: "quarter", label: "Trim.", width: "70px" },
  ];


  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Opérations"
        title="Comptabilité"
        description="Saisie quotidienne des revenus, dépenses, achats et rapprochements bancaires."
        actions={
          <>
            <Button variant="outline" size="sm"><Filter className="mr-1.5 h-3.5 w-3.5" />Filtrer</Button>
            <Button variant="outline" size="sm"><Download className="mr-1.5 h-3.5 w-3.5" />Exporter</Button>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-1.5 h-3.5 w-3.5" />Nouvelle écriture
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Revenus du jour" value="$3,364" hint="6 transactions" tone="success" />
        <MiniStat label="Dépenses du jour" value="$2,180" hint="4 transactions" tone="destructive" />
        <MiniStat label="Solde net" value="+$1,184" hint="Marge 35.2%" tone="accent" />
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="revenues">Revenus</TabsTrigger>
          <TabsTrigger value="expenses">Dépenses</TabsTrigger>
          <TabsTrigger value="purchases">Achats</TabsTrigger>
          <TabsTrigger value="periods">Périodes</TabsTrigger>
          <TabsTrigger value="taxes">Taxes</TabsTrigger>
          <TabsTrigger value="reconciliation">Rapprochement</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <SectionCard
            title="Journal des transactions"
            description="Structure du modèle Ultimate Bookkeeping · Net + TVA + frais = Total"
          >
            <EditableTable columns={txCols} data={transactions} canEdit />
          </SectionCard>
        </TabsContent>

        <TabsContent value="periods">
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Vue mensuelle" description="Revenus, dépenses, profit vs objectif">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="border-b px-3 py-2 text-left">Mois</th>
                      <th className="border-b px-3 py-2 text-right">Revenus</th>
                      <th className="border-b px-3 py-2 text-right">Dépenses</th>
                      <th className="border-b px-3 py-2 text-right">Profit</th>
                      <th className="border-b px-3 py-2 text-right">Objectif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthSummary.map((m) => (
                      <tr key={m.month} className="border-b last:border-b-0">
                        <td className="px-3 py-2 font-medium">{m.month}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtUsd(m.income)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtUsd(m.expenses)}</td>
                        <td className={`px-3 py-2 text-right tabular-nums font-medium ${m.profit >= m.goal ? "text-success" : "text-destructive"}`}>{fmtUsd(m.profit)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtUsd(m.goal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <div className="space-y-4">
              <SectionCard title="Vue trimestrielle">
                <div className="space-y-2">
                  {quarterSummary.map((q) => (
                    <div key={q.quarter} className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
                      <span className="text-sm font-medium">{q.quarter}</span>
                      <div className="flex items-center gap-5 text-sm tabular-nums">
                        <span className="text-muted-foreground">{fmtUsd(q.income)}</span>
                        <span className="font-semibold text-success">{fmtUsd(q.profit)}</span>
                        <Badge variant="secondary">{q.margin.toFixed(1)}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
              <SectionCard title="Vue annuelle · 5 ans">
                <div className="space-y-2">
                  {annualSummary.map((a) => (
                    <div key={a.year} className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
                      <span className="text-sm font-medium">{a.year}</span>
                      <div className="flex items-center gap-5 text-sm tabular-nums">
                        <span className="text-muted-foreground">{fmtUsd(a.income)}</span>
                        <span className="font-semibold text-success">{fmtUsd(a.profit)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="taxes">
          <SectionCard title="TVA & taxes" description={`Taux appliqué : ${bookkeepingSetup.salesTaxPct}% · devise ${bookkeepingSetup.currency}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="border-b px-3 py-2 text-left">Période</th>
                    <th className="border-b px-3 py-2 text-right">TVA collectée</th>
                    <th className="border-b px-3 py-2 text-right">TVA déductible</th>
                    <th className="border-b px-3 py-2 text-right">Net à payer</th>
                    <th className="border-b px-3 py-2 text-left">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {taxesSummary.map((t) => (
                    <tr key={t.period} className="border-b last:border-b-0">
                      <td className="px-3 py-2 font-medium">{t.period}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtUsd(t.taxCollected)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtUsd(t.taxPaid)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{fmtUsd(t.net)}</td>
                      <td className="px-3 py-2"><Badge variant="outline">{t.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>


        <TabsContent value="revenues">
          <SectionCard title="Journal des revenus" description="Cliquez deux fois pour éditer une cellule">
            <EditableTable columns={revenueCols} data={revenues} canEdit />
          </SectionCard>
        </TabsContent>

        <TabsContent value="expenses">
          <SectionCard title="Journal des dépenses" description="Comptabilisez chaque sortie de caisse">
            <EditableTable columns={expenseCols} data={expenses} canEdit />
          </SectionCard>
        </TabsContent>

        <TabsContent value="purchases">
          <SectionCard title="Achats fournisseurs" description={isCEO ? "Prix d'achat modifiables (CEO)" : "Lecture seule · demandez au CEO pour modifier les prix"}>
            <EditableTable
              canEdit={isCEO}
              columns={[
                { key: "id", label: "Bon", width: "140px" },
                { key: "vendor", label: "Fournisseur", editable: true },
                { key: "sku", label: "SKU", width: "140px" },
                { key: "qty", label: "Qté", align: "right", width: "80px", type: "number", editable: true },
                { key: "cost", label: "Prix achat", align: "right", width: "120px", type: "number", editable: isCEO, format: (v) => fmtUsdPrecise(v as number) },
                { key: "total", label: "Total", align: "right", width: "130px", format: (v) => fmtUsdPrecise(v as number) },
                { key: "date", label: "Date", width: "110px" },
              ]}
              data={[
                { id: "BON-2026-0044", vendor: "Coop. Agricole Kongo", sku: "SOJA-BIO", qty: 500, cost: 6.8, total: 3400, date: "2026-07-19" },
                { id: "BON-2026-0045", vendor: "Emballages Modernes", sku: "SAC-KRAFT-500", qty: 5000, cost: 0.236, total: 1180, date: "2026-07-21" },
                { id: "BON-2026-0046", vendor: "Baobab Coop.", sku: "BAOBAB-BRUT", qty: 200, cost: 3.9, total: 780, date: "2026-07-18" },
                { id: "BON-2026-0047", vendor: "Moringa Farms", sku: "MORINGA-FEUILLE", qty: 120, cost: 5.1, total: 612, date: "2026-07-17" },
              ]}
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="reconciliation">
          <SectionCard title="Rapprochement bancaire" description="Rapprochez vos relevés avec la comptabilité">
            <div className="grid gap-3 sm:grid-cols-3">
              <ReconcileBox label="Non rapproché" count={7} amount="$4,820" />
              <ReconcileBox label="Rapproché" count={142} amount="$62,340" />
              <ReconcileBox label="En litige" count={2} amount="$920" />
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniStat({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: "success" | "destructive" | "accent" }) {
  const color = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-accent";
  return (
    <div className="card-elevated p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-2xl font-semibold ${color}`}>{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function ReconcileBox({ label, count, amount }: { label: string; count: number; amount: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <div className="mt-2 font-display text-xl font-semibold">{amount}</div>
    </div>
  );
}
