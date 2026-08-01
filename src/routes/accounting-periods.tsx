import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/lib/role-context";
import { fmtNum, fmtUsd } from "@/lib/format";
import {
  closeAccountingPeriod,
  loadAccountingPeriods,
  loadPeriodSnapshots,
  type AccountingPeriod,
  type PeriodSnapshot,
} from "@/lib/accounting-periods";
import { loadOpeningsForOpenPeriod } from "@/lib/pos-openings";
import { supabase } from "@/lib/supabase-client";

export const Route = createFileRoute("/accounting-periods")({
  component: AccountingPeriodsPage,
});

function AccountingPeriodsPage() {
  const { isCEO } = useRole();
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [snapshots, setSnapshots] = useState<PeriodSnapshot[]>([]);
  const [openingRows, setOpeningRows] = useState<
    { location: string; manager: string; opening_ca: number; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const reload = async () => {
    setLoading(true);
    const rows = await loadAccountingPeriods();
    const closedIds = rows.filter((p) => p.status === "closed").map((p) => p.id);
    const snaps = await loadPeriodSnapshots(closedIds);
    const { openings } = await loadOpeningsForOpenPeriod();
    const [{ data: locations }, { data: managers }] = await Promise.all([
      supabase.from("locations").select("id, name"),
      supabase.from("erp_managers").select("id, name"),
    ]);
    const locById = new Map((locations || []).map((l) => [l.id, l.name]));
    const mgrById = new Map((managers || []).map((m) => [m.id, m.name]));
    setOpeningRows(
      openings.map((o) => ({
        location: locById.get(o.location_id) || "POS",
        manager: mgrById.get(o.manager_id) || "Manager",
        opening_ca: o.opening_ca,
        created_at: o.created_at,
      })),
    );
    setPeriods(rows);
    setSnapshots(snaps);
    setLoading(false);
  };

  useEffect(() => {
    if (isCEO) void reload();
  }, [isCEO]);

  if (!isCEO) {
    return <div className="p-8 text-center">Accès réservé à l'administration.</div>;
  }

  const openPeriod = periods.find((p) => p.status === "open");

  const handleClose = (e: FormEvent) => {
    e.preventDefault();
    if (!openPeriod) {
      toast.error("Aucun exercice ouvert.");
      return;
    }
    if (endDate < String(openPeriod.start_date).slice(0, 10)) {
      toast.error("La date de clôture doit être après le début de l'exercice.");
      return;
    }
    if (!window.confirm(`Clôturer « ${openPeriod.label} » au ${endDate} ? Les statistiques repartiront à zéro pour le nouvel exercice.`)) {
      return;
    }

    setClosing(true);
    void (async () => {
      try {
        await closeAccountingPeriod(openPeriod.id, endDate, notes.trim() || undefined);
        toast.success("Exercice clôturé. Un nouvel exercice est ouvert.");
        setNotes("");
        await reload();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible de clôturer l'exercice.");
      } finally {
        setClosing(false);
      }
    })();
  };

  const snapshotByPeriod = new Map(snapshots.map((s) => [s.period_id, s]));

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exercice comptable"
        description="Clôturez un exercice pour figer les chiffres et repartir à zéro sur les statistiques financières. Le stock physique n'est pas remis à zéro."
      />

      {openPeriod ? (
        <SectionCard title="Exercice en cours">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="border-primary/40 text-primary">
              Ouvert
            </Badge>
            <span className="font-display text-lg font-semibold">{openPeriod.label}</span>
            <span className="text-sm text-muted-foreground">
              Depuis le {String(openPeriod.start_date).slice(0, 10)}
            </span>
          </div>

          <form className="grid max-w-xl gap-4" onSubmit={handleClose}>
            <div className="space-y-2">
              <Label htmlFor="end_date">Date de clôture</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                min={String(openPeriod.start_date).slice(0, 10)}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: clôture annuelle 2026"
              />
            </div>
            <Button type="submit" disabled={closing} className="w-fit">
              <Lock className="mr-2 h-4 w-4" />
              {closing ? "Clôture en cours..." : "Clôturer l'exercice"}
            </Button>
          </form>
        </SectionCard>
      ) : (
        <SectionCard title="Exercice en cours">
          <p className="text-sm text-muted-foreground">Aucun exercice ouvert.</p>
        </SectionCard>
      )}

      <SectionCard title="Ouvertures POS (exercice actuel)">
        {openingRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucune ouverture saisie pour le moment.
          </p>
        ) : (
          <div className="space-y-2">
            {openingRows.map((row, idx) => (
              <div key={`${row.location}-${idx}`} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <div className="font-medium">{row.location}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.manager} · {String(row.created_at).slice(0, 10)}
                  </div>
                </div>
                <div className="font-semibold">{fmtUsd(row.opening_ca)}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Historique des exercices">
        {periods.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucun exercice enregistré.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="py-2 pr-4">Exercice</th>
                  <th className="py-2 pr-4">Période</th>
                  <th className="py-2 pr-4">Statut</th>
                  <th className="py-2 pr-4">Revenus</th>
                  <th className="py-2 pr-4">Charges</th>
                  <th className="py-2 pr-4">Bénéfice</th>
                  <th className="py-2 pr-4">Stock (qté)</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => {
                  const snap = snapshotByPeriod.get(period.id);
                  return (
                    <tr key={period.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{period.label}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {String(period.start_date).slice(0, 10)}
                        {period.end_date ? ` → ${String(period.end_date).slice(0, 10)}` : " → en cours"}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={period.status === "open" ? "outline" : "secondary"}>
                          {period.status === "open" ? "Ouvert" : "Clôturé"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">{snap ? fmtUsd(snap.total_revenue) : "—"}</td>
                      <td className="py-3 pr-4">{snap ? fmtUsd(snap.operating_expenses) : "—"}</td>
                      <td className="py-3 pr-4">{snap ? fmtUsd(snap.profit) : "—"}</td>
                      <td className="py-3 pr-4">
                        {snap ? `${fmtNum(snap.global_stock_qty)} dépôt / ${fmtNum(snap.pos_stock_qty)} POS` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Comment ça fonctionne">
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>À la clôture, un snapshot enregistre revenus, charges, bénéfice et stock (quantités).</li>
          <li>Le tableau de bord admin repart à zéro pour les KPIs financiers du nouvel exercice.</li>
          <li>Les données historiques restent consultables dans ce tableau et dans les archives.</li>
          <li>Le stock dépôt et POS continue de refléter les quantités réelles.</li>
        </ul>
      </SectionCard>
    </div>
  );
}
