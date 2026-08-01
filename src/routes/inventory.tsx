import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Boxes, PackageCheck, PackageX, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRole } from "@/lib/role-context";
import { supabase } from "@/lib/supabase-client";
import { fmtUsd, fmtNum } from "@/lib/format";
import { managerInventoryItems, stockStatus } from "@/lib/erp-constants";

export const Route = createFileRoute("/inventory")({
  component: InventoryPage,
});

type ErpProduct = {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string | null;
  unit_purchase_price: number;
  selling_price: number;
  global_qty: number;
  min_stock: number;
  last_checked: string | null;
  notes: string | null;
};

function InventoryPage() {
  const { isCEO, isDepot } = useRole();
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<ErpProduct[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const canAccess = isCEO || isDepot;

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("erp_products")
      .select("id, sku, name, category, unit, unit_purchase_price, selling_price, global_qty, min_stock, last_checked, notes")
      .order("name");

    if (error) {
      toast.error(error.message);
      return;
    }
    setProducts((data || []) as ErpProduct[]);
  };

  useEffect(() => {
    if (canAccess) void loadProducts();
  }, [canAccess]);

  const low = products.filter((p) => Number(p.global_qty) > 0 && Number(p.global_qty) <= Number(p.min_stock || 0)).length;
  const out = products.filter((p) => Number(p.global_qty) <= 0).length;

  const submitProduct = (e: FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    const sku = String(fd.get("sku") || "").trim();
    const unit = String(fd.get("unit") || "unit").trim();
    const purchase = Number(fd.get("purchase_price") || 0);
    const selling = Number(fd.get("selling_price") || 0);
    const qty = Number(fd.get("global_qty") || 0);
    const minStock = Number(fd.get("min_stock") || 0);
    const notes = String(fd.get("notes") || "").trim();

    if (!name || !sku) {
      toast.error("Nom et SKU requis.");
      return;
    }

    setSaving(true);
    void (async () => {
      const { error } = await supabase.from("erp_products").upsert(
        {
          sku,
          name,
          unit,
          unit_purchase_price: purchase,
          selling_price: selling,
          global_qty: qty,
          min_stock: minStock,
          last_checked: new Date().toISOString().slice(0, 10),
          notes: notes || null,
        },
        { onConflict: "sku" },
      );

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Produit enregistré");
        form.reset();
        setSelectedName("");
        await loadProducts();
      }
      setSaving(false);
    })();
  };

  const onPickName = (name: string) => {
    setSelectedName(name);
    const preset = managerInventoryItems.find((i) => i.label === name);
    const existing = products.find((p) => p.name === name);
    const skuInput = document.getElementById("sku") as HTMLInputElement | null;
    const unitInput = document.getElementById("unit") as HTMLInputElement | null;
    const purchaseInput = document.getElementById("purchase_price") as HTMLInputElement | null;
    const sellingInput = document.getElementById("selling_price") as HTMLInputElement | null;
    const qtyInput = document.getElementById("global_qty") as HTMLInputElement | null;
    const minInput = document.getElementById("min_stock") as HTMLInputElement | null;

    if (skuInput) skuInput.value = existing?.sku || (preset ? `TSA-${preset.value.toUpperCase()}` : "");
    if (unitInput) unitInput.value = existing?.unit || preset?.unit || "unit";
    if (purchaseInput) purchaseInput.value = existing ? String(existing.unit_purchase_price) : "";
    if (sellingInput) sellingInput.value = existing ? String(existing.selling_price) : "";
    if (qtyInput) qtyInput.value = existing ? String(existing.global_qty) : "0";
    if (minInput) minInput.value = existing ? String(existing.min_stock) : "10";
  };

  if (!canAccess) {
    return <div className="p-8 text-center">Accès réservé à l'administration et au dépôt.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock global"
        description={isDepot ? "Consultation du stock dépôt. L’entrée se fait via Approvisionnement." : undefined}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Stock total (qté)" value={fmtNum(products.reduce((s, p) => s + Number(p.global_qty || 0), 0))} icon={Boxes} tone="gold" />
        <KpiCard label="Produits" value={fmtNum(products.length)} icon={PackageCheck} />
        <KpiCard label="À réapprovisionner" value={fmtNum(low)} icon={TrendingDown} />
        <KpiCard label="Ruptures" value={fmtNum(out)} icon={PackageX} />
      </div>

      {isCEO && <SectionCard title="Ajouter / mettre à jour un produit">
        <form className="grid gap-3 md:grid-cols-8" onSubmit={submitProduct}>
          <div className="md:col-span-2 space-y-1">
            <Label htmlFor="name">Produit</Label>
            <select
              id="name"
              name="name"
              value={selectedName}
              onChange={(e) => onPickName(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              required
            >
              <option value="">Choisir</option>
              {managerInventoryItems.map((item) => (
                <option key={item.value} value={item.label}>{item.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" name="sku" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="unit">Unité</Label>
            <Input id="unit" name="unit" defaultValue="unit" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="purchase_price">Prix achat</Label>
            <Input id="purchase_price" name="purchase_price" type="number" step="0.01" min="0" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="selling_price">Prix vente</Label>
            <Input id="selling_price" name="selling_price" type="number" step="0.01" min="0" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="global_qty">Stock</Label>
            <Input id="global_qty" name="global_qty" type="number" min="0" defaultValue={0} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="min_stock">Min.</Label>
            <Input id="min_stock" name="min_stock" type="number" min="0" defaultValue={10} />
          </div>
          <div className="md:col-span-6 space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" />
          </div>
          <div className="md:col-span-2 flex items-end">
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </SectionCard>}

      <SectionCard title="Inventaire">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Produit</th>
                <th className="py-2 pr-3">SKU</th>
                <th className="py-2 pr-3">Unité</th>
                <th className="py-2 pr-3">Prix achat</th>
                <th className="py-2 pr-3">Prix vente</th>
                <th className="py-2 pr-3">Stock</th>
                <th className="py-2 pr-3">Min.</th>
                <th className="py-2 pr-3">Statut</th>
                <th className="py-2 pr-3">Valeur</th>
                <th className="py-2">Dernier contrôle</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-muted-foreground">Aucun produit.</td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-medium">{p.name}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{p.sku}</td>
                    <td className="py-2.5 pr-3">{p.unit || "unit"}</td>
                    <td className="py-2.5 pr-3">{fmtUsd(Number(p.unit_purchase_price))}</td>
                    <td className="py-2.5 pr-3">{fmtUsd(Number(p.selling_price))}</td>
                    <td className="py-2.5 pr-3">{fmtNum(Number(p.global_qty))}</td>
                    <td className="py-2.5 pr-3">{fmtNum(Number(p.min_stock))}</td>
                    <td className="py-2.5 pr-3">{stockStatus(Number(p.global_qty), Number(p.min_stock))}</td>
                    <td className="py-2.5 pr-3">{fmtUsd(Number(p.global_qty) * Number(p.unit_purchase_price))}</td>
                    <td className="py-2.5">{p.last_checked || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
