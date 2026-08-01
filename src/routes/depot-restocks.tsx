import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useRole } from "@/lib/role-context";
import { supabase } from "@/lib/supabase-client";
import { fmtNum, fmtUsd } from "@/lib/format";

export const Route = createFileRoute("/depot-restocks")({
  component: DepotRestocksPage,
});

type Product = {
  id: string;
  name: string;
  sku: string;
  unit_purchase_price: number;
  global_qty: number;
};

type RestockRow = {
  id: string;
  date: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  notes: string | null;
  erp_products?: { name: string; sku: string } | null;
};

function DepotRestocksPage() {
  const { role, depotAccount } = useRole();
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<RestockRow[]>([]);
  const [productId, setProductId] = useState("");

  const load = async () => {
    const [{ data: productRows }, { data: restockRows }] = await Promise.all([
      supabase.from("erp_products").select("id, name, sku, unit_purchase_price, global_qty").order("name"),
      supabase
        .from("restocks")
        .select("id, date, quantity, unit_cost, total_cost, notes, erp_product_id")
        .order("date", { ascending: false })
        .limit(30),
    ]);

    setProducts((productRows || []) as Product[]);
    const productsById = new Map((productRows || []).map((p) => [p.id, p]));
    setHistory(
      ((restockRows || []) as Array<RestockRow & { erp_product_id?: string }>).map((row) => ({
        ...row,
        erp_products: row.erp_product_id
          ? {
              name: productsById.get(row.erp_product_id)?.name || "Produit",
              sku: productsById.get(row.erp_product_id)?.sku || "",
            }
          : null,
      })),
    );
  };

  useEffect(() => {
    if (role === "depot") void load();
  }, [role]);

  if (role !== "depot") {
    return <div className="p-8 text-center">Réservé au compte dépôt.</div>;
  }

  const selected = products.find((p) => p.id === productId);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const quantity = Number(fd.get("quantity") || 0);
    const unitCost = Number(fd.get("unit_cost") || selected?.unit_purchase_price || 0);
    const date = String(fd.get("date") || "").trim() || new Date().toISOString().slice(0, 10);
    const notes = String(fd.get("notes") || "").trim();

    if (!productId || !quantity) {
      toast.error("Produit et quantité requis.");
      return;
    }

    setSaving(true);
    void (async () => {
      const { error } = await supabase.rpc("apply_depot_restock", {
        p_product_id: productId,
        p_quantity: quantity,
        p_unit_cost: unitCost,
        p_date: date,
        p_notes: notes || null,
        p_created_by: depotAccount?.report_manager_id ?? null,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Stock global mis à jour");
        form.reset();
        setProductId("");
        await load();
      }
      setSaving(false);
    })();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvisionnement dépôt"
        description={`${depotAccount?.name || "Dépôt"} · entrée de stock global`}
      />

      <SectionCard title="Entrée stock global">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2 sm:col-span-2">
            <Label>Produit</Label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              required
            >
              <option value="">Choisir un produit</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.sku} · stock {p.global_qty}
                </option>
              ))}
            </select>
          </div>
          {selected && (
            <div className="sm:col-span-2 grid gap-1 rounded-md border p-3 text-sm sm:grid-cols-4">
              <div>
                <span className="text-muted-foreground">SKU</span>
                <div className="font-mono">{selected.sku}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Stock actuel</span>
                <div>{fmtNum(selected.global_qty)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Prix achat</span>
                <div>{fmtUsd(Number(selected.unit_purchase_price))}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Produit</span>
                <div>{selected.name}</div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantité</Label>
            <Input id="quantity" name="quantity" type="number" min="1" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit_cost">Coût unitaire</Label>
            <Input
              id="unit_cost"
              name="unit_cost"
              type="number"
              step="0.01"
              min="0"
              defaultValue={selected?.unit_purchase_price || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {saving ? "Enregistrement..." : "Ajouter au stock global"}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Historique">
        <div className="space-y-2">
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucun mouvement.</p>
          ) : (
            history.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <div className="font-medium">{row.erp_products?.name || "Produit"}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.date} · {row.erp_products?.sku}
                  </div>
                </div>
                <div className="text-right">
                  <div>+{fmtNum(row.quantity)}</div>
                  <div className="text-xs text-muted-foreground">{fmtUsd(Number(row.total_cost))}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}
