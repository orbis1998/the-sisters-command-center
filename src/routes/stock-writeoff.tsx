import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRole } from "@/lib/role-context";
import { supabase } from "@/lib/supabase-client";
import { fmtNum } from "@/lib/format";

export const Route = createFileRoute("/stock-writeoff")({
  component: StockWriteoffPage,
});

type Product = {
  id: string;
  name: string;
  sku: string;
  available: number;
};

const reasons = [
  { value: "damage", label: "Abîmé" },
  { value: "loss", label: "Perte / disparu" },
  { value: "gift", label: "Offert (0 $)" },
] as const;

function StockWriteoffPage() {
  const { role, manager, depotAccount } = useRole();
  const isDepot = role === "depot";
  const isManager = role === "manager";
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [reason, setReason] = useState<(typeof reasons)[number]["value"]>("damage");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (isDepot) {
      const { data } = await supabase
        .from("erp_products")
        .select("id, name, sku, global_qty")
        .order("name");
      setProducts(
        (data || []).map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          available: Number(p.global_qty || 0),
        })),
      );
      return;
    }

    if (!manager?.location_id) {
      setProducts([]);
      return;
    }

    const [{ data: stockRows }, { data: productRows }] = await Promise.all([
      supabase
        .from("inventory_stock")
        .select("erp_product_id, quantity")
        .eq("location_id", manager.location_id),
      supabase.from("erp_products").select("id, name, sku").order("name"),
    ]);

    const qtyById = new Map((stockRows || []).map((s) => [s.erp_product_id, Number(s.quantity || 0)]));
    setProducts(
      (productRows || [])
        .map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          available: qtyById.get(p.id) || 0,
        }))
        .filter((p) => p.available > 0),
    );
  };

  useEffect(() => {
    if (isDepot || isManager) void load();
  }, [role, manager?.location_id]);

  if (!isDepot && !isManager) {
    return <div className="p-8 text-center">Réservé au dépôt et aux managers POS.</div>;
  }

  if (isManager && !manager?.location_id) {
    return <div className="p-8 text-center">Point de vente non assigné.</div>;
  }

  const selected = products.find((p) => p.id === productId);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const quantity = Number(fd.get("quantity") || 0);
    const notes = String(fd.get("notes") || "").trim();

    if (!productId || quantity <= 0) {
      toast.error("Produit et quantité requis.");
      return;
    }
    if (selected && quantity > selected.available) {
      toast.error(`Stock insuffisant (dispo: ${selected.available}).`);
      return;
    }

    setSaving(true);
    void (async () => {
      const { error } = await supabase.rpc("apply_stock_writeoff", {
        p_product_id: productId,
        p_quantity: quantity,
        p_reason: reason,
        p_scope: isDepot ? "depot" : "pos",
        p_location_id: isDepot ? null : manager?.location_id ?? null,
        p_notes: notes || null,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Sortie enregistrée à 0 $ — stock réduit.");
        form.reset();
        setProductId("");
        await load();
      }
      setSaving(false);
    })();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Pertes · abîmé · offert"
        description="Aucun montant : 0 $. Réduit uniquement le stock (dépôt ou point de vente)."
      />

      <SectionCard title="Signaler une sortie à 0 $">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Motif</Label>
            <div className="grid grid-cols-3 gap-2">
              {reasons.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                    reason === r.value
                      ? "border-accent bg-accent/15 font-medium"
                      : "hover:bg-muted/50"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Produit</Label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              required
            >
              <option value="">Choisir</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · stock {fmtNum(p.available)}
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <div className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-sm">
              Disponible : <span className="font-semibold">{fmtNum(selected.available)}</span> · Montant :{" "}
              <span className="font-semibold">0 $</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantité</Label>
            <Input id="quantity" name="quantity" type="number" min="1" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Commentaire (optionnel)</Label>
            <Textarea id="notes" name="notes" placeholder="Ex. produit offert à une cliente VIP" />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer la sortie 0 $"}
          </Button>
        </form>
      </SectionCard>
    </div>
  );
}
