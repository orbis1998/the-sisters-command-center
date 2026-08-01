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
import { loadOpenAccountingPeriod } from "@/lib/accounting-periods";
import { loadOpeningForLocation, submitPosPeriodOpening } from "@/lib/pos-openings";
import { newId } from "@/lib/id";
import { fmtUsd } from "@/lib/format";

export const Route = createFileRoute("/period-opening")({
  component: PeriodOpeningPage,
});

type Product = { id: string; name: string; sku: string };
type Line = { key: string; productId: string; quantity: number };

function PeriodOpeningPage() {
  const { role, manager } = useRole();
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [existing, setExisting] = useState<{ opening_ca: number; created_at: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<Line[]>([{ key: "line-1", productId: "", quantity: 0 }]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role !== "manager" || !manager?.location_id) {
      setLoading(false);
      return;
    }
    void (async () => {
      const period = await loadOpenAccountingPeriod();
      if (!period) {
        setLoading(false);
        return;
      }
      setPeriodId(period.id);
      const [opening, { data: productRows }] = await Promise.all([
        loadOpeningForLocation(manager.location_id!, period.id),
        supabase.from("erp_products").select("id, name, sku").order("name"),
      ]);
      if (opening) {
        setExisting({ opening_ca: opening.opening_ca, created_at: opening.created_at });
      }
      setProducts((productRows || []) as Product[]);
      setLoading(false);
    })();
  }, [role, manager?.location_id]);

  if (role !== "manager") {
    return <div className="p-8 text-center">Réservé aux managers des points de vente.</div>;
  }
  if (!manager?.location_id) {
    return <div className="p-8 text-center">Point de vente non assigné.</div>;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!periodId || !manager.id) return;
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const openingCa = Number(fd.get("opening_ca") || 0);
    const notes = String(fd.get("notes") || "").trim();
    const items = lines
      .filter((l) => l.productId && l.quantity > 0)
      .map((l) => ({ erp_product_id: l.productId, quantity: Number(l.quantity) }));

    if (openingCa < 0) {
      toast.error("Fonds d'ouverture invalide.");
      return;
    }
    if (items.length === 0) {
      toast.error("Ajoutez au moins un produit en stock.");
      return;
    }

    setSaving(true);
    void (async () => {
      try {
        await submitPosPeriodOpening({
          periodId,
          locationId: manager.location_id!,
          managerId: manager.id,
          openingCa,
          notes,
          items,
        });
        toast.success("Ouverture d'exercice enregistrée");
        setExisting({ opening_ca: openingCa, created_at: new Date().toISOString() });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : typeof error === "object" && error && "message" in error
              ? String((error as { message: unknown }).message)
              : "Impossible d'enregistrer";
        toast.error(message);
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Ouverture d'exercice" />

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : !periodId ? (
        <SectionCard title="Indisponible">
          <p className="text-sm text-muted-foreground">Aucun exercice comptable ouvert.</p>
        </SectionCard>
      ) : existing ? (
        <SectionCard title="Déjà enregistrée">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fonds de démarrage</span>
              <span className="font-semibold">{fmtUsd(existing.opening_ca)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{String(existing.created_at).slice(0, 10)}</span>
            </div>
            <p className="pt-2 text-muted-foreground">
              Une seule ouverture par exercice. Ce fonds alimente la caisse la première semaine ;
              les semaines suivantes partent des ventes du rapport.
            </p>
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="Saisie unique">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="opening_ca">Fonds de démarrage</Label>
              <Input id="opening_ca" name="opening_ca" type="number" min="0" step="0.01" required />
              <p className="text-xs text-muted-foreground">
                Argent disponible pour démarrer (première semaine). Pas un total de ventes figé.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Stock d'ouverture</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setLines((prev) => [...prev, { key: newId(), productId: "", quantity: 0 }])
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Produit
                </Button>
              </div>
              {lines.map((line) => (
                <div key={line.key} className="grid gap-2 sm:grid-cols-12">
                  <div className="sm:col-span-7">
                    <select
                      value={line.productId}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l) => (l.key === line.key ? { ...l, productId: e.target.value } : l)),
                        )
                      }
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      required
                    >
                      <option value="">Produit</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4">
                    <Input
                      type="number"
                      min="0"
                      value={line.quantity || ""}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key ? { ...l, quantity: Number(e.target.value || 0) } : l,
                          ),
                        )
                      }
                      placeholder="Quantité"
                      required
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={lines.length === 1}
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" />
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement..." : "Valider l'ouverture"}
            </Button>
          </form>
        </SectionCard>
      )}
    </div>
  );
}
