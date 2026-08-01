import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useRole } from "@/lib/role-context";
import { supabase } from "@/lib/supabase-client";
import { fmtUsd } from "@/lib/format";

export const Route = createFileRoute("/manager-investment")({
  component: ManagerInvestmentPage,
});

type Product = {
  id: string;
  name: string;
  sku: string;
  unit_purchase_price: number;
  global_qty: number;
};

type Line = {
  key: string;
  productId: string;
  quantity: number;
  unitPrice: number;
};

function ManagerInvestmentPage() {
  const { role, manager } = useRole();
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<Line[]>([
    { key: crypto.randomUUID(), productId: "", quantity: 1, unitPrice: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("erp_products")
        .select("id, name, sku, unit_purchase_price, global_qty")
        .order("name");
      setProducts((data || []) as Product[]);
    })();
  }, []);

  if (role !== "manager") {
    return <div className="p-8 text-center">Réservé aux managers des points de vente.</div>;
  }

  const total = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0);

  const updateLine = (key: string, patch: Partial<Line>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!manager?.id) {
      toast.error("Manager non connecté.");
      return;
    }
    if (!manager.location_id) {
      toast.error("Aucun point de vente assigné. Contactez l'admin.");
      return;
    }

    const validLines = lines.filter((l) => l.productId && l.quantity > 0);
    if (validLines.length === 0) {
      toast.error("Ajoute au moins un produit.");
      return;
    }

    setSaving(true);
    void (async () => {
      for (const line of validLines) {
        const product = products.find((p) => p.id === line.productId);
        if (!product) {
          toast.error("Produit introuvable.");
          setSaving(false);
          return;
        }
        if (Number(product.global_qty) < Number(line.quantity)) {
          toast.error(`Stock insuffisant pour ${product.name} (dispo: ${product.global_qty}).`);
          setSaving(false);
          return;
        }
      }

      const form = e.currentTarget as HTMLFormElement;
      const fd = new FormData(form);
      const date = String(fd.get("date") || new Date().toISOString().slice(0, 10));
      const notes = String(fd.get("notes") || "").trim();

      const { data: investment, error: invError } = await supabase
        .from("manager_investments")
        .insert({
          manager_id: manager.id,
          location_id: manager.location_id,
          date,
          total_amount: total,
          notes: notes || null,
        })
        .select("id")
        .single();

      if (invError || !investment) {
        toast.error(invError?.message || "Impossible d'enregistrer l'investissement.");
        setSaving(false);
        return;
      }

      const items = validLines.map((line) => ({
        investment_id: investment.id,
        erp_product_id: line.productId,
        quantity: Number(line.quantity),
        unit_price: Number(line.unitPrice),
        line_total: Number(line.quantity) * Number(line.unitPrice),
      }));

      const { error: itemsError } = await supabase.from("manager_investment_items").insert(items);
      if (itemsError) {
        toast.error(itemsError.message);
        setSaving(false);
        return;
      }

      const { error: stockError } = await supabase.rpc("apply_manager_investment_stock", {
        p_investment_id: investment.id,
      });
      if (stockError) {
        toast.error(stockError.message || "Impossible de transférer le stock du dépôt.");
        setSaving(false);
        return;
      }

      const { error: receiptError } = await supabase.from("depot_receipts").insert({
        investment_id: investment.id,
        manager_id: manager.id,
        location_id: manager.location_id,
        date,
        amount: total,
        notes: notes || "Vente stock dépôt",
      });
      if (receiptError) {
        toast.error(receiptError.message);
        setSaving(false);
        return;
      }

      const { error: expenseError } = await supabase.from("global_expenses").insert({
        date,
        category: "stock_purchase",
        amount: total,
        location_id: manager.location_id,
        description: notes || "Achat stock dépôt",
        recorded_by: manager.id,
      });
      if (expenseError) {
        toast.error(expenseError.message);
        setSaving(false);
        return;
      }

      toast.success("Approvisionnement enregistré. Stock global déduit.");
      setLines([{ key: crypto.randomUUID(), productId: "", quantity: 1, unitPrice: 0 }]);
      form.reset();
      const { data } = await supabase
        .from("erp_products")
        .select("id, name, sku, unit_purchase_price, global_qty")
        .order("name");
      setProducts((data || []) as Product[]);
      setSaving(false);
    })();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title="Approvisionnement" />

      <SectionCard title="Achat au dépôt">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <div className="space-y-2">
              <Label>Total</Label>
              <div className="flex h-9 items-center rounded-md border px-3 text-sm font-semibold">{fmtUsd(total)}</div>
            </div>
          </div>

          <div className="space-y-3">
            {lines.map((line) => {
              const product = products.find((p) => p.id === line.productId);
              return (
                <div key={line.key} className="rounded-md border p-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-12">
                    <div className="sm:col-span-5 space-y-1">
                      <Label>Produit</Label>
                      <select
                        value={line.productId}
                        onChange={(e) => {
                          const p = products.find((x) => x.id === e.target.value);
                          updateLine(line.key, {
                            productId: e.target.value,
                            unitPrice: Number(p?.unit_purchase_price || 0),
                          });
                        }}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      >
                        <option value="">Choisir</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} · dispo {p.global_qty}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label>Qté</Label>
                      <Input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) })}
                      />
                    </div>
                    <div className="sm:col-span-3 space-y-1">
                      <Label>Prix payé</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(line.key, { unitPrice: Number(e.target.value) })}
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-end justify-between gap-2">
                      <div className="text-sm font-medium">{fmtUsd(line.quantity * line.unitPrice)}</div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                        disabled={lines.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {product && (
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                      <div>SKU: <span className="font-mono text-foreground">{product.sku}</span></div>
                      <div>Stock dépôt: {product.global_qty}</div>
                      <div>Prix dépôt: {fmtUsd(Number(product.unit_purchase_price))}</div>
                      <div>Ligne: {fmtUsd(line.quantity * line.unitPrice)}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setLines((prev) => [...prev, { key: crypto.randomUUID(), productId: "", quantity: 1, unitPrice: 0 }])
            }
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />Ajouter une ligne
          </Button>

          <div className="space-y-2">
            <Label htmlFor="notes">Sur quoi porte l'investissement</Label>
            <Textarea id="notes" name="notes" placeholder="Ex: réassort Mass Gainer 2kg + emballages" />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement..." : "Valider l'approvisionnement"}
          </Button>
        </form>
      </SectionCard>
    </div>
  );
}
