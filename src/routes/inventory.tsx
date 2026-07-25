import { createFileRoute } from "@tanstack/react-router";
import { Plus, PackageCheck, PackageX, TrendingDown, Boxes } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { EditableTable, type Column } from "@/components/editable-table";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { products, stockMovements } from "@/lib/mock-data";
import {
  materials,
  priceCalculator,
  priceList,
  type Material,
  type PriceCalcRow,
  type PriceListRow,
  type InventoryStatus,
} from "@/lib/template-data";
import { fmtUsdPrecise, fmtNum } from "@/lib/format";
import { useRole } from "@/lib/role-context";

const statusColor: Record<InventoryStatus, string> = {
  "IN STOCK": "text-success",
  "REORDER SOON": "text-accent",
  "TIME TO REORDER": "text-primary",
  "OUT OF STOCK": "text-destructive",
};

const materialCols: Column<Material>[] = [
  { key: "ref", label: "Réf. interne", width: "130px" },
  { key: "material", label: "Matière", editable: true },
  { key: "price", label: "Prix lot", align: "right", width: "100px", type: "number", editable: true, format: (v) => fmtUsdPrecise(v as number) },
  { key: "units", label: "Nb unités", align: "right", width: "100px", type: "number", editable: true, format: (v) => fmtNum(v as number) },
  { key: "unit", label: "Unité", width: "80px", editable: true },
  { key: "unitPrice", label: "Prix unitaire", align: "right", width: "115px", format: (v) => `$${(v as number).toFixed(4)}` },
  { key: "inventory", label: "Stock", align: "right", width: "100px", type: "number", editable: true, format: (v) => fmtNum(v as number) },
  { key: "lastChange", label: "Dernier mvt", width: "115px" },
  { key: "minInventory", label: "Stock min.", align: "right", width: "105px", type: "number", editable: true, format: (v) => fmtNum(v as number) },
  { key: "status", label: "Statut", width: "150px" },
  { key: "value", label: "Valeur", align: "right", width: "110px", format: (v) => fmtUsdPrecise(v as number) },
  { key: "notes", label: "Notes", editable: true },
];

const calcCols: Column<PriceCalcRow>[] = [
  { key: "product", label: "Produit" },
  { key: "materialCost", label: "Coût matière", align: "right", width: "115px", type: "number", editable: true, format: (v) => fmtUsdPrecise(v as number) },
  { key: "laborCost", label: "Main d'œuvre", align: "right", width: "115px", type: "number", editable: true, format: (v) => fmtUsdPrecise(v as number) },
  { key: "overhead", label: "Frais gén.", align: "right", width: "105px", type: "number", editable: true, format: (v) => fmtUsdPrecise(v as number) },
  { key: "packaging", label: "Emballage", align: "right", width: "105px", type: "number", editable: true, format: (v) => fmtUsdPrecise(v as number) },
  { key: "totalCost", label: "Coût total", align: "right", width: "110px", format: (v) => fmtUsdPrecise(v as number) },
  { key: "marginPct", label: "Marge %", align: "right", width: "90px", type: "number", editable: true, format: (v) => `${v as number}%` },
  { key: "wholesale", label: "Prix gros", align: "right", width: "105px", format: (v) => fmtUsdPrecise(v as number) },
  { key: "retail", label: "Prix détail", align: "right", width: "105px", format: (v) => fmtUsdPrecise(v as number) },
  { key: "retailWithTax", label: "TTC", align: "right", width: "100px", format: (v) => fmtUsdPrecise(v as number) },
];

const priceListCols: Column<PriceListRow>[] = [
  { key: "sku", label: "SKU", width: "130px" },
  { key: "product", label: "Produit" },
  { key: "category", label: "Catégorie", width: "130px" },
  { key: "unitCost", label: "Coût", align: "right", width: "95px", type: "number", editable: true, format: (v) => fmtUsdPrecise(v as number) },
  { key: "wholesale", label: "Prix gros", align: "right", width: "105px", type: "number", editable: true, format: (v) => fmtUsdPrecise(v as number) },
  { key: "retail", label: "Prix détail", align: "right", width: "105px", type: "number", editable: true, format: (v) => fmtUsdPrecise(v as number) },
  { key: "marginPct", label: "Marge %", align: "right", width: "90px", format: (v) => `${(v as number).toFixed(1)}%` },
  { key: "channel", label: "Canal", width: "170px" },
];

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventaire · The Sisters Business OS" },
      { name: "description", content: "Gestion des stocks, mouvements, valorisation et ajustements d'inventaire." },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const { isCEO } = useRole();
  const totalValue = products.reduce((s, p) => s + p.stock * p.cost, 0);
  const totalUnits = products.reduce((s, p) => s + p.stock, 0);
  const low = products.filter((p) => p.stock < p.reorder).length;

  const productCols: Column<typeof products[number]>[] = [
    { key: "sku", label: "SKU", width: "130px" },
    { key: "name", label: "Produit", editable: true },
    { key: "category", label: "Catégorie", width: "140px", editable: true },
    { key: "dept", label: "Département", width: "160px" },
    { key: "stock", label: "Stock", align: "right", width: "90px", type: "number", editable: isCEO, format: (v) => fmtNum(v as number) },
    { key: "reorder", label: "Seuil", align: "right", width: "80px", type: "number", editable: isCEO, format: (v) => fmtNum(v as number) },
    { key: "cost", label: "Coût", align: "right", width: "100px", type: "number", editable: isCEO, format: (v) => fmtUsdPrecise(v as number) },
    { key: "price", label: "Prix", align: "right", width: "100px", type: "number", editable: isCEO, format: (v) => fmtUsdPrecise(v as number) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Opérations"
        title="Gestion d'inventaire"
        description="Valorisation, mouvements et ajustements de stock en temps réel."
        actions={
          <>
            <Button variant="outline" size="sm">Import CSV</Button>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-1.5 h-3.5 w-3.5" />Mouvement stock
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Valeur stock" value={fmtUsdPrecise(totalValue)} icon={Boxes} delta={-2.1} tone="gold" />
        <KpiCard label="Unités en stock" value={fmtNum(totalUnits)} icon={PackageCheck} delta={6.8} />
        <KpiCard label="Sous seuil" value={String(low)} icon={TrendingDown} hint="produits à réapprovisionner" />
        <KpiCard label="Ruptures 30j" value="0" icon={PackageX} hint="excellence opérationnelle" />
      </div>

      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="catalog">Catalogue produits</TabsTrigger>
          <TabsTrigger value="materials">Matières & inventaire</TabsTrigger>
          <TabsTrigger value="calculator">Calculateur de prix</TabsTrigger>
          <TabsTrigger value="pricelist">Liste de prix</TabsTrigger>
          <TabsTrigger value="movements">Mouvements</TabsTrigger>
          <TabsTrigger value="adjustments">Ajustements</TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {(["IN STOCK", "REORDER SOON", "TIME TO REORDER", "OUT OF STOCK"] as const).map((s) => (
              <div key={s} className="card-elevated p-4">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{s}</div>
                <div className={`mt-1 font-display text-2xl font-semibold ${statusColor[s]}`}>
                  {materials.filter((m) => m.status === s).length}
                </div>
              </div>
            ))}
          </div>
          <SectionCard
            title="Inventaire matières premières"
            description={`Structure du modèle Pricing Calculator + Inventory Tracker · valeur totale ${fmtUsdPrecise(materials.reduce((s, m) => s + m.value, 0))}`}
          >
            <EditableTable columns={materialCols} data={materials} canEdit={isCEO} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="calculator">
          <SectionCard title="Calculateur de prix" description="Coût matière + main d'œuvre + frais généraux + emballage → prix gros / détail (TVA 16%)">
            <EditableTable columns={calcCols} data={priceCalculator} canEdit={isCEO} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="pricelist">
          <SectionCard title="Liste de prix" description="Grille tarifaire officielle par canal de distribution">
            <EditableTable columns={priceListCols} data={priceList} canEdit={isCEO} />
          </SectionCard>
        </TabsContent>


        <TabsContent value="catalog">
          <SectionCard
            title="Catalogue & valorisation"
            description={isCEO ? "Éditez coûts, prix et seuils · double-clic sur une cellule" : "Lecture seule · l'édition des prix est réservée au CEO"}
          >
            <EditableTable columns={productCols} data={products} canEdit={isCEO} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="movements">
          <SectionCard title="Journal des mouvements" description="Entrées, sorties et ajustements">
            <div className="card-elevated overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="border-b px-3 py-2 text-left">Réf.</th>
                    <th className="border-b px-3 py-2 text-left">Date</th>
                    <th className="border-b px-3 py-2 text-left">SKU</th>
                    <th className="border-b px-3 py-2 text-left">Type</th>
                    <th className="border-b px-3 py-2 text-right">Quantité</th>
                    <th className="border-b px-3 py-2 text-left">Motif</th>
                    <th className="border-b px-3 py-2 text-left">Utilisateur</th>
                  </tr>
                </thead>
                <tbody>
                  {stockMovements.map((m) => (
                    <tr key={m.id} className="border-b last:border-b-0 hover:bg-accent/[0.04]">
                      <td className="px-3 py-2 font-mono text-xs">{m.id}</td>
                      <td className="px-3 py-2 text-muted-foreground">{m.date}</td>
                      <td className="px-3 py-2 font-mono text-xs">{m.sku}</td>
                      <td className="px-3 py-2">
                        <Badge variant={m.type === "Entrée" ? "default" : m.type === "Sortie" ? "secondary" : "outline"} className={m.type === "Entrée" ? "bg-success/15 text-success hover:bg-success/20" : ""}>
                          {m.type}
                        </Badge>
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums font-medium ${m.qty > 0 ? "text-success" : "text-destructive"}`}>
                        {m.qty > 0 ? "+" : ""}{m.qty}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{m.reason}</td>
                      <td className="px-3 py-2">{m.user}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="adjustments">
          <SectionCard title="Ajustements d'inventaire" description={isCEO ? "Ajustements réservés au CEO" : "Contactez le CEO pour un ajustement"}>
            <div className="rounded-lg border-2 border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {isCEO ? "Créez un ajustement d'inventaire (casse, inventaire physique, correction)." : "Vous n'avez pas les permissions pour créer un ajustement."}
              </p>
              {isCEO && <Button className="mt-4" size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />Nouvel ajustement</Button>}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
