import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { useRole } from "@/lib/role-context";
import { loadPosAccounting } from "@/lib/accounting";
import { fmtUsd, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/pos-overview/")({
  component: PosOverviewPage,
});

function PosOverviewPage() {
  const { isCEO } = useRole();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof loadPosAccounting>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isCEO) return;
    void loadPosAccounting().then((data) => {
      setRows(data);
      setLoading(false);
    });
  }, [isCEO]);

  if (!isCEO) return <div className="p-8 text-center">Accès réservé à l&apos;administration.</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Points de vente" />

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Aucun point de vente.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((pos) => (
            <Link
              key={pos.locationId}
              to="/pos-overview/$locationId"
              params={{ locationId: pos.locationId }}
              className="block rounded-xl transition-colors hover:bg-muted/20"
            >
              <SectionCard
                title={pos.locationName}
                actions={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
              >
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Stock (qté)</div>
                    <div className="mt-1 font-display text-2xl font-semibold">{fmtNum(pos.stockQty)}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Approvisionnements
                    </div>
                    <div className="mt-1 font-display text-2xl font-semibold">
                      {fmtUsd(pos.provisionTotal)}
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Revenus ventes
                    </div>
                    <div className="mt-1 font-display text-2xl font-semibold">
                      {fmtUsd(pos.salesRevenue)}
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Dépenses</div>
                    <div className="mt-1 font-display text-2xl font-semibold">
                      {fmtUsd(pos.expensesTotal)}
                    </div>
                  </div>
                  <div className="col-span-2 rounded-md border bg-muted/30 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Bénéfice POS
                    </div>
                    <div className="mt-1 font-display text-2xl font-semibold">{fmtUsd(pos.profit)}</div>
                  </div>
                </div>
              </SectionCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
