import { createFileRoute } from "@tanstack/react-router";
import { Plus, Truck, PackageCheck, Clock, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { KpiCard } from "@/components/kpi-card";
import { EditableTable, type Column } from "@/components/editable-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  orders,
  orderStatusSummary,
  orderPrioritySummary,
  deliveryMethods,
  type Order,
} from "@/lib/template-data";
import { fmtUsdPrecise, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Commandes · The Sisters Business OS" },
      { name: "description", content: "Suivi des commandes clients : statut, priorité, livraison, tracking et montants." },
      { property: "og:title", content: "Commandes · The Sisters Business OS" },
      { property: "og:description", content: "Order tracker complet : statuts, priorités, livraisons et récapitulatif des montants." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrdersPage,
});

const statusTone: Record<string, string> = {
  "Livrée": "bg-success/15 text-success",
  "Expédiée": "bg-accent/15 text-accent",
  "En préparation": "bg-primary/10 text-primary",
  "En attente": "bg-muted text-muted-foreground",
  "Annulée": "bg-destructive/15 text-destructive",
};

const priorityTone: Record<string, string> = {
  Urgente: "bg-destructive/15 text-destructive",
  Haute: "bg-accent/15 text-accent",
  Normale: "bg-muted text-muted-foreground",
  Basse: "bg-muted/60 text-muted-foreground",
};

function OrdersPage() {
  const totalAmount = orders.reduce((s, o) => s + o.total, 0);
  const openOrders = orders.filter((o) => o.status === "En attente" || o.status === "En préparation").length;
  const delivered = orders.filter((o) => o.status === "Livrée").length;
  const urgent = orders.filter((o) => o.priority === "Urgente").length;

  const cols: Column<Order>[] = [
    { key: "n", label: "#", width: "50px", align: "right" },
    { key: "date", label: "Date", width: "105px", editable: true },
    { key: "sku", label: "SKU", width: "115px" },
    { key: "customer", label: "Client", editable: true },
    { key: "product", label: "Produit", editable: true },
    { key: "qty", label: "Qté", align: "right", width: "70px", type: "number", editable: true },
    { key: "status", label: "Statut", width: "130px", editable: true },
    { key: "priority", label: "Priorité", width: "100px", editable: true },
    { key: "amount", label: "Montant", align: "right", width: "105px", type: "number", format: (v) => fmtUsdPrecise(v as number) },
    { key: "discount", label: "Remise", align: "right", width: "95px", type: "number", editable: true, format: (v) => fmtUsdPrecise(v as number) },
    { key: "total", label: "Total", align: "right", width: "110px", type: "number", format: (v) => fmtUsdPrecise(v as number) },
    { key: "delivery", label: "Livraison", width: "150px", editable: true },
    { key: "tracking", label: "Tracking", width: "140px", editable: true },
    { key: "dueDate", label: "Échéance", width: "110px", editable: true },
    { key: "shipDate", label: "Expédition", width: "110px", editable: true },
    { key: "arrivalDate", label: "Arrivée", width: "110px", editable: true },
    { key: "notes", label: "Notes", editable: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Opérations"
        title="Suivi des commandes"
        description="Order Tracker : cycle complet de la commande client, de la saisie à la livraison."
        actions={
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-1.5 h-3.5 w-3.5" />Nouvelle commande
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Montant total commandes" value={fmtUsdPrecise(totalAmount)} icon={Truck} tone="gold" delta={14.2} />
        <KpiCard label="Commandes ouvertes" value={fmtNum(openOrders)} icon={Clock} hint="à préparer ou expédier" />
        <KpiCard label="Livrées" value={fmtNum(delivered)} icon={PackageCheck} hint="sur 30 jours" />
        <KpiCard label="Priorité urgente" value={fmtNum(urgent)} icon={AlertTriangle} hint="traitement immédiat" />
      </div>

      <Tabs defaultValue="tracker" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="tracker">Order Tracker</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="setup">Paramétrage</TabsTrigger>
        </TabsList>

        <TabsContent value="tracker">
          <SectionCard title="Registre des commandes" description="Double-cliquez sur une cellule pour l'éditer · totaux recalculés depuis montant − remise">
            <EditableTable columns={cols} data={orders} canEdit />
          </SectionCard>
        </TabsContent>

        <TabsContent value="summary">
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Par statut" description="Répartition des commandes et montants">
              <div className="space-y-3">
                {orderStatusSummary.map((s) => (
                  <div key={s.status} className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
                    <Badge className={`${statusTone[s.status]} hover:${statusTone[s.status]}`} variant="secondary">
                      {s.status}
                    </Badge>
                    <div className="flex items-center gap-6">
                      <span className="text-sm text-muted-foreground">{s.count} cmd.</span>
                      <span className="font-display text-base font-semibold tabular-nums">{fmtUsdPrecise(s.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Par priorité" description="Charge de traitement de l'équipe">
              <div className="space-y-3">
                {orderPrioritySummary.map((p) => (
                  <div key={p.priority} className="rounded-lg border bg-muted/20 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <Badge className={priorityTone[p.priority]} variant="secondary">{p.priority}</Badge>
                      <span className="font-display text-base font-semibold tabular-nums">{p.count}</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(p.count / orders.length) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="setup">
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Modes de livraison">
              <ul className="space-y-2 text-sm">
                {deliveryMethods.map((d) => (
                  <li key={d} className="rounded-md border bg-muted/20 px-3 py-2">{d}</li>
                ))}
              </ul>
            </SectionCard>
            <SectionCard title="Statuts">
              <ul className="space-y-2 text-sm">
                {Object.keys(statusTone).map((s) => (
                  <li key={s} className="rounded-md border bg-muted/20 px-3 py-2">{s}</li>
                ))}
              </ul>
            </SectionCard>
            <SectionCard title="Priorités">
              <ul className="space-y-2 text-sm">
                {Object.keys(priorityTone).map((p) => (
                  <li key={p} className="rounded-md border bg-muted/20 px-3 py-2">{p}</li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
